/**
 * Parse skip keyword - simplified
 */
export function parseSkipKeyword(commitMessage: string): {
    shouldSkip: boolean;
    cleanupRemovedFunctions: boolean;
    message: string;
} {
    if (commitMessage.includes('@iterate skip')) {
        return {
            shouldSkip: true,
            cleanupRemovedFunctions: true, // Always cleanup removed functions
            message: 'Skipping test generation but will cleanup removed functions due to @iterate skip'
        };
    }

    return {
        shouldSkip: false,
        cleanupRemovedFunctions: true,
        message: 'No skip keyword detected - proceeding with normal test operations'
    };
}
