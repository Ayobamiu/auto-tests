import { CodeChangeType, ChangeAnalysis } from '../types/types';

/**
 * Analyze code changes using GitHub diff patch for more accuracy
 */
export function analyzeCodeChangesFromDiff(
    patch: string,
    currentContent: string,
    previousContent: string | null
): ChangeAnalysis {
    try {
        if (!patch) {
            // Fallback to content-based analysis
            return analyzeCodeChangesFromContent(currentContent, previousContent);
        }

        // Parse the patch to understand what changed
        const lines = patch.split('\n');
        let hasCodeChanges = false;
        let hasCommentChanges = false;
        let hasWhitespaceChanges = false;
        const removedFunctions = new Set<string>();
        const addedFunctions = new Set<string>();

        // Simple function detection regex
        const functionRegex = /(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function)|(\w+)\s*:\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))/;

        for (const line of lines) {
            if (line.startsWith('+') || line.startsWith('-')) {
                const content = line.substring(1);

                // Check if it's a comment line
                if (content.trim().startsWith('//') || content.trim().startsWith('/*') || content.trim().startsWith('*')) {
                    hasCommentChanges = true;
                    continue;
                }

                // Check if it's just whitespace changes
                if (content.trim() === '' || /^\s+$/.test(content)) {
                    hasWhitespaceChanges = true;
                    continue;
                }

                // Check for function definitions
                const match = content.match(functionRegex);
                if (match) {
                    const funcName = match[1] || match[2] || match[3];
                    if (funcName) {
                        if (line.startsWith('+')) {
                            addedFunctions.add(funcName);
                        } else if (line.startsWith('-')) {
                            removedFunctions.add(funcName);
                        }
                    }
                }

                hasCodeChanges = true;
            }
        }

        // Determine change type
        let changeType: CodeChangeType = 'unknown';

        if (!hasCodeChanges && (hasCommentChanges || hasWhitespaceChanges)) {
            changeType = hasCommentChanges ? 'comment-only' : 'whitespace-only';
        } else if (removedFunctions.size > 0 && addedFunctions.size === 0) {
            changeType = 'function-removal';
        } else if (addedFunctions.size > 0 && removedFunctions.size === 0) {
            changeType = 'function-addition';
        } else if (removedFunctions.size > 0 || addedFunctions.size > 0) {
            changeType = 'mixed';
        } else if (hasCodeChanges) {
            changeType = 'function-modification';
        }

        return {
            changeType,
            hasCodeChanges,
            hasFunctionRemovals: removedFunctions.size > 0,
            hasFunctionAdditions: addedFunctions.size > 0,
            hasFunctionModifications: changeType === 'function-modification',
            removedFunctions: Array.from(removedFunctions),
            addedFunctions: Array.from(addedFunctions),
            modifiedFunctions: []
        };

    } catch (error) {
        console.error(`❌ Error analyzing diff:`, error);
        // Fallback to content-based analysis
        return analyzeCodeChangesFromContent(currentContent, previousContent);
    }
}

/**
 * Analyze code changes from pre-fetched content (fallback method)
 */
export function analyzeCodeChangesFromContent(
    currentContent: string,
    previousContent: string | null
): ChangeAnalysis {
    try {
        if (!previousContent) {
            return {
                changeType: 'unknown',
                hasCodeChanges: true,
                hasFunctionRemovals: false,
                hasFunctionAdditions: false,
                hasFunctionModifications: false,
                removedFunctions: [],
                addedFunctions: [],
                modifiedFunctions: []
            };
        }

        // Remove comments and normalize whitespace for comparison
        const normalizeCode = (code: string): string => {
            return code
                .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
                .replace(/\/\/.*$/gm, '') // Remove line comments
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
        };

        const currentNormalized = normalizeCode(currentContent);
        const previousNormalized = normalizeCode(previousContent);

        // Check if only whitespace/comments changed
        if (currentNormalized === previousNormalized) {
            return {
                changeType: 'comment-only',
                hasCodeChanges: false,
                hasFunctionRemovals: false,
                hasFunctionAdditions: false,
                hasFunctionModifications: false,
                removedFunctions: [],
                addedFunctions: [],
                modifiedFunctions: []
            };
        }

        // Simple function detection using regex
        const functionRegex = /(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function)|(\w+)\s*:\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))/g;

        const currentFunctions = new Set<string>();
        const previousFunctions = new Set<string>();

        let match;
        while ((match = functionRegex.exec(currentContent)) !== null) {
            const funcName = match[1] || match[2] || match[3];
            if (funcName) currentFunctions.add(funcName);
        }

        functionRegex.lastIndex = 0; // Reset regex
        while ((match = functionRegex.exec(previousContent)) !== null) {
            const funcName = match[1] || match[2] || match[3];
            if (funcName) previousFunctions.add(funcName);
        }

        const removedFunctions = Array.from(previousFunctions).filter(f => !currentFunctions.has(f));
        const addedFunctions = Array.from(currentFunctions).filter(f => !previousFunctions.has(f));

        // Determine change type
        let changeType: CodeChangeType = 'unknown';
        if (removedFunctions.length > 0 && addedFunctions.length === 0) {
            changeType = 'function-removal';
        } else if (addedFunctions.length > 0 && removedFunctions.length === 0) {
            changeType = 'function-addition';
        } else if (removedFunctions.length > 0 || addedFunctions.length > 0) {
            changeType = 'mixed';
        } else {
            changeType = 'function-modification';
        }

        return {
            changeType,
            hasCodeChanges: true,
            hasFunctionRemovals: removedFunctions.length > 0,
            hasFunctionAdditions: addedFunctions.length > 0,
            hasFunctionModifications: changeType === 'function-modification',
            removedFunctions,
            addedFunctions,
            modifiedFunctions: []
        };

    } catch (error) {
        console.error(`❌ Error analyzing code changes:`, error);
        return {
            changeType: 'unknown',
            hasCodeChanges: true,
            hasFunctionRemovals: false,
            hasFunctionAdditions: false,
            hasFunctionModifications: false,
            removedFunctions: [],
            addedFunctions: [],
            modifiedFunctions: []
        };
    }
}
