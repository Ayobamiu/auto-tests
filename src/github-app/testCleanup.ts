import { Octokit } from '@octokit/rest';
import { getTestFilePath, getFileContent, createOrUpdateTestFile } from './githubOperations';

const BOT_SIGNATURE = process.env.BOT_SIGNATURE || 'auto-tests-bot';

/**
 * Cleanup tests for removed functions
 */
export async function cleanupRemovedFunctionTests(
    octokit: Octokit,
    owner: string,
    repo: string,
    filePath: string,
    removedFunctions: string[],
    branch: string
): Promise<boolean> {
    try {
        const testFilePath = getTestFilePath(filePath);

        // Get current test file content
        const testContent = await getFileContent(octokit, owner, repo, testFilePath, branch);
        if (!testContent) {
            console.log(`📝 No test file found at ${testFilePath} - nothing to cleanup`);
            return true;
        }

        let updatedTestContent = testContent;
        let hasChanges = false;

        // Remove test blocks for removed functions
        for (const funcName of removedFunctions) {
            // Remove describe blocks for the removed function
            const describeRegex = new RegExp(`describe\\s*\\(\\s*['"\`]${funcName}[^'"]*['"\`][\\s\\S]*?\\}\\)\\s*;?\\s*`, 'g');
            const beforeRemove = updatedTestContent;
            updatedTestContent = updatedTestContent.replace(describeRegex, '');

            if (updatedTestContent !== beforeRemove) {
                hasChanges = true;
                console.log(`🗑️ Removed test block for function: ${funcName}`);
            }
        }

        if (hasChanges) {
            // Clean up extra whitespace and empty lines
            updatedTestContent = updatedTestContent
                .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove multiple empty lines
                .trim();

            // Update the test file
            const commitMessage = `Cleanup tests for removed functions: ${removedFunctions.join(', ')} [${BOT_SIGNATURE}]`;
            const success = await createOrUpdateTestFile(
                octokit,
                owner,
                repo,
                filePath,
                updatedTestContent,
                branch,
                commitMessage
            );

            if (success) {
                console.log(`✅ Successfully cleaned up tests for removed functions: ${removedFunctions.join(', ')}`);
            }
            return success;
        } else {
            console.log(`📝 No test cleanup needed - no tests found for removed functions: ${removedFunctions.join(', ')}`);
            return true;
        }

    } catch (error) {
        console.error(`❌ Error cleaning up tests for removed functions:`, error);
        return false;
    }
}
