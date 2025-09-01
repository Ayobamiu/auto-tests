import z from "zod";

// Change type enum
export type ChangeType = 'new' | 'update' | 'regenerate';

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