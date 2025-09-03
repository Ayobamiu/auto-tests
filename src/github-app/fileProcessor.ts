import { Octokit } from '@octokit/rest';
import { ChangeType } from '../types/types';
import { analyzeCodeChangesFromDiff } from './changeDetection';
import { generateTestsDirectly } from './testGeneration';
import { cleanupRemovedFunctionTests } from './testCleanup';
import { createOrUpdateTestFile } from './githubOperations';

const BOT_SIGNATURE = process.env.BOT_SIGNATURE || 'auto-tests-bot';

/**
 * Process a single file with smart change detection
 */
export async function processFile(
    octokit: Octokit,
    owner: string,
    repo: string,
    filePath: string,
    branch: string,
    baseBranch: string,
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

        // Get diff information for this file
        const fileDiff = fileDiffs.get(filePath);
        const patch = fileDiff?.patch || '';

        // Analyze code changes using GitHub diff for more accuracy
        const changeAnalysis = analyzeCodeChangesFromDiff(patch, content, previousCode);
        console.log(`🔍 Change analysis for ${filePath}:`, {
            changeType: changeAnalysis.changeType,
            hasCodeChanges: changeAnalysis.hasCodeChanges,
            removedFunctions: changeAnalysis.removedFunctions,
            addedFunctions: changeAnalysis.addedFunctions
        });

        // Always cleanup removed functions if they exist and cleanup is enabled
        if (changeAnalysis.hasFunctionRemovals && skipInfo.cleanupRemovedFunctions) {
            console.log(`🗑️ Cleaning up tests for removed functions: ${changeAnalysis.removedFunctions.join(', ')}`);
            const cleanupSuccess = await cleanupRemovedFunctionTests(
                octokit,
                owner,
                repo,
                filePath,
                changeAnalysis.removedFunctions,
                branch
            );
            if (!cleanupSuccess) {
                console.error(`❌ Failed to cleanup tests for removed functions in ${filePath}`);
            }
        }

        // Skip test generation if requested
        if (skipInfo.shouldSkip) {
            console.log(`⏭️ Skipping test generation for ${filePath} due to skip keyword`);
            return true;
        }

        // Skip if only comments/whitespace changed
        if (changeAnalysis.changeType === 'comment-only' || changeAnalysis.changeType === 'whitespace-only') {
            console.log(`⏭️ Skipping test generation for ${filePath} - only ${changeAnalysis.changeType} changes detected`);
            return true;
        }

        const changeType: ChangeType = existingTests ? 'update' : 'new';
        console.log(`📝 ${changeType === 'update' ? 'Updating' : 'Creating'} tests for ${filePath}`);

        // Generate tests directly using OpenAI
        const result = await generateTestsDirectly(
            content,
            'jest',
            filePath,
            testFilePath,
            changeType,
            previousCode || undefined,
            existingTests || undefined
        );

        // Create or update test file
        const commitMessage = `${changeType === 'update' ? 'Update' : 'Add'} tests for ${filePath} [${BOT_SIGNATURE}]`;
        const success = await createOrUpdateTestFile(
            octokit,
            owner,
            repo,
            filePath,
            result.tests,
            branch,
            commitMessage
        );

        if (success) {
            console.log(`✅ Generated tests for ${filePath}`);
            console.log(`📊 Test metadata:`, result.metadata);
        }

        return success;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error);
        return false;
    }
}
