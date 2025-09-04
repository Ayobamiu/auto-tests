import OpenAI from 'openai';
import { systemPrompt, buildCompleteTestFilePrompt } from '../utils/prompts';
import { zodResponseFormat } from 'openai/helpers/zod';
import { TestGenerationSchema } from '../types/types';

/**
 * Initialize OpenAI client for direct test generation
 */
export function getOpenAIClient(): OpenAI {
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}


/**
 * Generate complete test file using single-pass AI approach
 * This function handles everything: change detection, cleanup, and test generation
 */
export async function generateCompleteTestFile(
    currentCode: string,
    previousCode: string | null,
    existingTests: string | null,
    filePath: string,
    testFilePath: string,
    diff: string,
    framework: string = 'jest'
): Promise<{ tests: string; metadata: any }> {
    const openai = getOpenAIClient();

    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }

    // Create prompt for complete test file generation
    const prompt = buildCompleteTestFilePrompt(
        currentCode,
        previousCode,
        existingTests,
        filePath,
        testFilePath,
        diff,
        framework
    );

    // Call OpenAI API with structured output
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
        max_tokens: 4000,
        temperature: 0.3,
    });

    const message = completion.choices[0]?.message;

    if (!message?.parsed) {
        throw new Error('Failed to generate complete test file from OpenAI');
    }

    const parsedOutput = message.parsed;
    const { tests, ...metadata } = parsedOutput;

    return {
        tests: tests,
        metadata: metadata
    };
}
