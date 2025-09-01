import express, { Request, Response, Router } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { buildTestPrompt, systemPrompt } from '../utils/prompts';
import { zodResponseFormat } from 'openai/helpers/zod';
import { requireApiKey } from '../middleware/requireApiKey';
import { GenerateTestsRequest, GenerateTestsResponse, TestGenerationSchema, ChangeType } from '../types/types';

dotenv.config();

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


// POST /api/generate-tests
router.post('/generate-tests', requireApiKey, async (req: Request, res: Response) => {
    try {
        const { code, framework, filePath, testFilePath, changeType, previousCode, existingTests }: GenerateTestsRequest = req.body;

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


        // Create prompt for OpenAI with enhanced context
        const prompt = buildTestPrompt(code, framework, filePath, testFilePath, changeType as ChangeType || 'new', previousCode, existingTests);

        // Call OpenAI API with structured output using the parse method
        const completion = await openai.chat.completions.parse({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: systemPrompt(framework)
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
