import { Octokit } from '@octokit/rest';
import { generateCompleteTestFile } from './testGeneration';
import { createOrUpdateTestFile } from './githubOperations';

const BOT_SIGNATURE = process.env.BOT_SIGNATURE || 'auto-tests-bot';

/**
 * Process a single file using single-pass AI approach
 * This function uses one AI call to handle everything: change detection, cleanup, and test generation
 */
export async function processFile(
    octokit: Octokit,
    owner: string,
    repo: string,
    filePath: string,
    branchName: string,
    before: string,
    skipInfo: { shouldSkip: boolean; cleanupRemovedFunctions: boolean },
    fileContents: Map<string, { current: string | null; base: string | null; test: string | null; testFilePath: string }>,
    fileDiffs: Map<string, any>
): Promise<boolean> {
    try {
        console.log(`🔍 Processing file: ${filePath}`);

        // Get pre-fetched file contents
        const contents = fileContents.get(filePath);
        if (!contents || !contents.current) {
            console.log(`⚠️ Could not get content for ${filePath}, skipping`);
            return false;
        }

        const { current: content, base: previousCode, test: existingTests, testFilePath } = contents;
        console.log({
            content: JSON.stringify(content, null, 2),
            previousCode: JSON.stringify(previousCode, null, 2),
            existingTests: JSON.stringify(existingTests, null, 2),
        });

        // Get diff information for this file
        const fileDiff = fileDiffs.get(filePath);
        const patch = fileDiff?.patch || '';

        // Debug: Log the patch content to understand what's being detected
        if (patch) {
            console.log(`🔍 Patch content for ${filePath}:`, patch.substring(0, 500) + (patch.length > 500 ? '...' : ''));
        }

        // Skip test generation if requested
        if (skipInfo.shouldSkip) {
            console.log(`⏭️ Skipping test generation for ${filePath} due to skip keyword`);
            return true;
        }

        console.log(`📝 Generating complete test file for ${filePath} using single-pass AI approach`);

        // Use single-pass AI approach to generate complete test file
        const result = await generateCompleteTestFile(
            content,
            previousCode,
            existingTests,
            filePath,
            testFilePath,
            patch,
            'jest'
        );

        // Create or update test file
        const commitMessage = `Update tests for ${filePath} [${BOT_SIGNATURE}]`;
        const success = await createOrUpdateTestFile(
            octokit,
            owner,
            repo,
            filePath,
            result.tests,
            branchName,
            commitMessage
        );

        if (success) {
            console.log(`✅ Generated complete test file for ${filePath}`);
            console.log(`📊 Test metadata:`, result.metadata);
        }

        return success;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error);
        return false;
    }
}
