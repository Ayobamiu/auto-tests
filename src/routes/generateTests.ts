import express, { Request, Response, Router } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { buildTestPrompt, systemPrompt } from '../utils/prompts';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

dotenv.config();

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Request body interface
interface GenerateTestsRequest {
    code: string;
    framework: string;
    filePath: string;
    testFilePath: string;
}

// Zod schema for structured output
const TestGenerationSchema = z.object({
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
interface GenerateTestsResponse {
    tests: string;
    comments: string;
    metadata: Omit<z.infer<typeof TestGenerationSchema>, 'tests'>;
}

// POST /api/generate-tests
router.post('/generate-tests', async (req: Request, res: Response) => {
    try {
        const { code, framework, filePath, testFilePath }: GenerateTestsRequest = req.body;

        // Validate request body
        if (!code || typeof code !== 'string') {
            return res.status(400).json({
                error: 'Missing or invalid code parameter. Code must be a non-empty string.'
            });
        }

        if (!framework || typeof framework !== 'string') {
            return res.status(400).json({
                error: 'Missing or invalid framework parameter. Framework must be a non-empty string.'
            });
        }

        if (!filePath || typeof filePath !== 'string') {
            return res.status(400).json({
                error: 'Missing or invalid filePath parameter. FilePath must be a non-empty string.'
            });
        }

        if (!testFilePath || typeof testFilePath !== 'string') {
            return res.status(400).json({
                error: 'Missing or invalid testFilePath parameter. TestFilePath must be a non-empty string.'
            });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                error: 'OpenAI API key not configured'
            });
        }

        // Create prompt for OpenAI with file path context
        const prompt = buildTestPrompt(code, framework, filePath, testFilePath);

        // Call OpenAI API with structured output using the parse method
        const completion = await openai.chat.completions.parse({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: zodResponseFormat(TestGenerationSchema, 'test_generation'),
            max_tokens: 3000,
            temperature: 0.3,
        });

        const message = completion.choices[0]?.message;

        if (!message?.parsed) {
            return res.status(500).json({
                error: 'Failed to generate tests from OpenAI'
            });
        }

        const parsedOutput = message.parsed;
        const { tests, ...metadata } = parsedOutput;

        const response: GenerateTestsResponse = {
            tests: tests,
            comments: metadata.comments,
            metadata: metadata
        };

        res.json(response);

    } catch (error) {
        console.error('Error generating tests:', error);

        if (error instanceof Error) {
            // Handle OpenAI API errors
            if (error.message.includes('API key')) {
                return res.status(401).json({
                    error: 'Invalid OpenAI API key'
                });
            }

            if (error.message.includes('quota') || error.message.includes('rate limit')) {
                return res.status(429).json({
                    error: 'OpenAI API rate limit exceeded. Please try again later.'
                });
            }
        }

        res.status(500).json({
            error: 'Failed to generate tests. Please try again.'
        });
    }
});

export { router as generateTestsRouter };
