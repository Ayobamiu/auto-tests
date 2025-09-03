import { Request, Response } from 'express';
import { createOctokit, getChangedFilesWithDiffs, preFetchFileContents } from './githubOperations';
import { processFile } from './fileProcessor';
import { parseSkipKeyword } from './skipKeywordParser';
import { verifyWebhookSignature } from './webhookVerification';

// Bot signature to identify our app's commits
const BOT_SIGNATURE = process.env.BOT_SIGNATURE || 'auto-tests-bot';

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

        if (event !== 'pull_request') {
            console.log(`ℹ️ Ignoring non-pull_request event: ${event}`);
            res.status(200).json({ message: 'Event ignored' });
            return;
        }

        const { action, pull_request, repository } = req.body;

        if (!['opened', 'synchronize', 'reopened'].includes(action)) {
            console.log(`ℹ️ Ignoring PR action: ${action}`);
            res.status(200).json({ message: 'Action ignored' });
            return;
        }

        console.log(`🚀 Processing PR #${pull_request.number}: ${pull_request.title}`);

        // Create Octokit instance
        const octokit = createOctokit();

        // Check if there are multiple commits
        const totalCommits = pull_request.commits;
        console.log(`📊 PR has ${totalCommits} commit(s)`);

        let textToCheck = '';

        if (totalCommits === 1) {
            // Single commit - check PR title/body only
            console.log(`🔍 Single commit PR - checking PR title/body only`);
            const prTitle = pull_request.title || '';
            const prBody = pull_request.body || '';
            textToCheck = `${prTitle} ${prBody}`;
        } else {
            // Multiple commits - fetch latest commit message only
            console.log(`🔍 Multiple commits PR - checking latest commit message only`);

            try {
                const commitSha = pull_request.head.sha;
                const commitResponse = await octokit.repos.getCommit({
                    owner: repository.owner.login,
                    repo: repository.name,
                    ref: commitSha
                });
                const commitMessage = commitResponse.data.commit.message;
                textToCheck = commitMessage;
                console.log(`📝 Latest commit message: ${commitMessage}`);
            } catch (error) {
                console.error(`❌ Error fetching commit message:`, error);
                // Fallback to checking PR title/body only
                console.log(`⚠️ Using fallback - checking PR title/body only`);
                const prTitle = pull_request.title || '';
                const prBody = pull_request.body || '';
                textToCheck = `${prTitle} ${prBody}`;
            }
        }

        // Check for bot signature first (always skip)
        if (textToCheck.includes(BOT_SIGNATURE)) {
            console.log(`⏭️ Skipping PR due to our bot commit detected`);
            res.status(200).json({ message: 'Skipping due to bot commit detected' });
            return;
        }

        // Parse skip keyword
        const skipInfo = parseSkipKeyword(textToCheck);
        console.log(`🔍 Skip analysis: ${skipInfo.message}`);

        const owner = repository.owner.login;
        const repo = repository.name;
        const branch = pull_request.head.ref;
        const baseBranch = pull_request.base.ref;

        // Get changed files with diff information 
        const { changedFiles, fileDiffs } = await getChangedFilesWithDiffs(
            octokit,
            owner,
            repo,
            pull_request.number
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
            branch,
            baseBranch
        );

        // Process each file
        const results = await Promise.all(
            changedFiles.map((file: any) => processFile(
                octokit,
                owner,
                repo,
                file,
                branch,
                baseBranch,
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