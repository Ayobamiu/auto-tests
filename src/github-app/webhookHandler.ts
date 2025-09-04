import { Request, Response } from 'express';
import { createOctokit, getChangedFilesWithDiffs, preFetchFileContents } from './githubOperations';
import { processFile } from './fileProcessor';
import { parseSkipKeyword } from './skipKeywordParser';
import { verifyWebhookSignature } from './webhookVerification';

// Bot signature to identify our app's commits
const BOT_SIGNATURE = process.env.BOT_SIGNATURE || 'auto-tests-bot';

/**
 * Check if a branch should be processed based on configuration
 */
function isBranchAllowed(branchName: string): boolean {
    const processBranches = process.env.PROCESS_BRANCHES || '*';

    // If set to '*', process all branches
    if (processBranches === '*') {
        return true;
    }

    // Parse comma-separated branch patterns
    const patterns = processBranches.split(',').map(p => p.trim());

    return patterns.some(pattern => {
        // Handle wildcard patterns (e.g., "feature/*")
        if (pattern.includes('*')) {
            const prefix = pattern.replace('*', '');
            return branchName.startsWith(prefix);
        }

        // Handle exact matches
        return branchName === pattern;
    });
}

/**
 * Main webhook handler - orchestrates the entire test generation process
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
    try {
        // Verify webhook signature
        const signature = req.headers['x-hub-signature-256'] as string;
        const payload = JSON.stringify(req.body);

        if (!verifyWebhookSignature(payload, signature)) {
            console.error('❌ Invalid webhook signature');
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }

        const event = req.headers['x-github-event'] as string;
        console.log({ event }, '--event--');

        if (event !== 'push') {
            console.log(`ℹ️ Ignoring non-push event: ${event}`);
            res.status(200).json({ message: 'Event ignored' });
            return;
        }

        const { ref, commits, before, after, repository } = req.body;

        // Check if branch should be processed
        const branchName = ref.replace('refs/heads/', '');
        const isAllowed = isBranchAllowed(branchName);

        if (!isAllowed) {
            console.log(`ℹ️ Ignoring push to branch: ${branchName}`);
            res.status(200).json({ message: 'Branch ignored' });
            return;
        }

        console.log(`🚀 Processing push: ${commits.length} commit(s) from ${before} to ${after}`);

        // Create Octokit instance
        const octokit = createOctokit();

        // Get the latest commit message for skip keyword checking
        const latestCommit = commits[commits.length - 1];
        const commitMessage = latestCommit?.message || '';
        console.log(`📝 Latest commit message: ${commitMessage}`);

        // Check for bot signature first (always skip)
        if (commitMessage.includes(BOT_SIGNATURE)) {
            console.log(`⏭️ Skipping push due to our bot commit detected`);
            res.status(200).json({ message: 'Skipping due to bot commit detected' });
            return;
        }

        // Parse skip keyword
        const skipInfo = parseSkipKeyword(commitMessage);
        console.log(`🔍 Skip analysis: ${skipInfo.message}`);

        const owner = repository.owner.login;
        const repo = repository.name;

        // Get changed files by comparing before and after SHAs
        const { changedFiles, fileDiffs } = await getChangedFilesWithDiffs(
            octokit,
            owner,
            repo,
            before,  // Previous state
            after    // Current state
        );

        console.log(`📁 Found ${changedFiles.length} files to process:`, changedFiles);

        if (changedFiles.length === 0) {
            console.log('ℹ️ No files to process');
            res.status(200).json({ message: 'No files to process' });
            return;
        }

        // Pre-fetch all file contents to avoid redundant API calls
        const fileContents = await preFetchFileContents(
            octokit,
            owner,
            repo,
            changedFiles,
            after,  // Current state
            before  // Previous state
        );

        // Process each file
        const results = await Promise.all(
            changedFiles.map((file: any) => processFile(
                octokit,
                owner,
                repo,
                file,
                branchName, // Use branch name for file operations
                before,     // Previous state for comparison
                skipInfo,
                fileContents,
                fileDiffs
            ))
        );

        const successCount = results.filter(Boolean).length;
        console.log(`🎉 Processed ${successCount}/${changedFiles.length} files successfully`);

        res.status(200).json({
            message: 'Webhook processed successfully',
            processed: successCount,
            total: changedFiles.length,
        });

    } catch (error) {
        console.error('❌ Webhook handler error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}