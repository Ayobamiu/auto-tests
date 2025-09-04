import express, { Request, Response, Router } from 'express';
import dotenv from 'dotenv';
import { requireApiKey } from '../middleware/requireApiKey';
import { generateCompleteTestFile } from '../github-app/testGeneration';
import { GenerateTestsRequest, GenerateTestsResponse } from '../types/types';

dotenv.config();

const router = Router();

// POST /api/generate-tests
router.post('/generate-tests', requireApiKey, async (req: Request, res: Response) => {
    try {
        const { code, framework, filePath, testFilePath, previousCode, existingTests, diff }: GenerateTestsRequest = req.body;

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

        // Use single-pass AI approach to generate complete test file
        const result = await generateCompleteTestFile(
            code,
            previousCode || null,
            existingTests || null,
            filePath,
            testFilePath,
            diff || '',
            framework
        );

        const response: GenerateTestsResponse = {
            tests: result.tests,
            comments: result.metadata.comments,
            metadata: result.metadata
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
