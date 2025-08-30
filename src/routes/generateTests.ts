import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { buildTestPrompt, systemPrompt } from '../utils/prompts';
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
}

// Response interface
interface GenerateTestsResponse {
    tests: string;
}

// POST /api/generate-tests
router.post('/generate-tests', async (req: Request, res: Response) => {
    try {
        const { code, framework }: GenerateTestsRequest = req.body;

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

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                error: 'OpenAI API key not configured'
            });
        }

        // Create prompt for OpenAI
        const prompt = buildTestPrompt(code, framework);

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // or "gpt-4" if you prefer
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
            max_tokens: 2000,
            temperature: 0.3,
        });

        const generatedTests = completion.choices[0]?.message?.content;

        if (!generatedTests) {
            return res.status(500).json({
                error: 'Failed to generate tests from OpenAI'
            });
        }

        const response: GenerateTestsResponse = {
            tests: generatedTests
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
