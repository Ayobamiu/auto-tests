import { z } from 'zod';

export type ChangeType = 'new' | 'update' | 'regenerate';

// Enhanced change detection types
export type CodeChangeType =
    | 'comment-only'           // Only comments changed
    | 'whitespace-only'        // Only whitespace/formatting changed
    | 'import-only'            // Only import statements changed
    | 'function-addition'      // New functions added
    | 'function-removal'       // Functions removed
    | 'function-modification'  // Existing functions modified
    | 'mixed'                  // Multiple types of changes
    | 'no-changes'             // No actual changes detected
    | 'unknown';               // Could not determine change type

export interface ChangeAnalysis {
    changeType: CodeChangeType;
    hasCodeChanges: boolean;
    hasFunctionRemovals: boolean;
    hasFunctionAdditions: boolean;
    hasFunctionModifications: boolean;
    removedFunctions: string[];
    addedFunctions: string[];
    modifiedFunctions: string[];
}

// Request body interface
export interface GenerateTestsRequest {
    code: string;
    framework: string;
    filePath: string;
    testFilePath: string;
    changeType?: ChangeType;
    previousCode?: string;
    existingTests?: string;
}

// Zod schema for structured output
export const TestGenerationSchema = z.object({
    tests: z.string().describe("Clean, runnable test code without markdown or explanations"),
    comments: z.string().describe("Brief summary of what the tests cover and any important notes"),
    framework: z.string().describe("The testing framework used (e.g., jest, mocha, pytest)"),
    coverage: z.object({
        normalCases: z.number().describe("Number of normal/expected case tests"),
        edgeCases: z.number().describe("Number of edge case tests"),
        errorCases: z.number().describe("Number of error case tests"),
        totalTests: z.number().describe("Total number of test cases")
    }),
    assumptions: z.array(z.string()).describe("List of assumptions made about the code being tested"),
    recommendations: z.array(z.string()).describe("Suggestions for improving the original code or tests"),
    estimatedComplexity: z.enum(["low", "medium", "high"]).describe("Estimated complexity of the code being tested"),
    testQuality: z.enum(["basic", "good", "excellent"]).describe("Quality assessment of the generated tests"),
    timeToWrite: z.string().describe("Estimated time to write these tests manually"),
    dependencies: z.array(z.string()).describe("List of testing dependencies or packages needed")
});

// Response interface
export interface GenerateTestsResponse {
    tests: string;
    comments: string;
    metadata: Omit<z.infer<typeof TestGenerationSchema>, 'tests'>;
}