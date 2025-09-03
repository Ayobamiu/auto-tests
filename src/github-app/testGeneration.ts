import OpenAI from 'openai';
import { ChangeType } from '../types/types';
import { buildTestPrompt, systemPrompt } from '../utils/prompts';
import { zodResponseFormat } from 'openai/helpers/zod';
import { TestGenerationSchema } from '../types/types';

/**
 * Initialize OpenAI client for direct test generation
 */
function getOpenAIClient(): OpenAI {
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

/**
 * Generate tests directly using OpenAI
 */
export async function generateTestsDirectly(
    code: string,
    framework: string,
    filePath: string,
    testFilePath: string,
    changeType: ChangeType,
    previousCode?: string,
    existingTests?: string
): Promise<{ tests: string; metadata: any }> {
    const openai = getOpenAIClient();

    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }

    // Create prompt for OpenAI with enhanced context
    const prompt = buildTestPrompt(code, framework, filePath, testFilePath, changeType, previousCode, existingTests);

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
        throw new Error('Failed to generate tests from OpenAI');
    }

    const parsedOutput = message.parsed;
    const { tests, ...metadata } = parsedOutput;

    return {
        tests: tests,
        metadata: metadata
    };
}
