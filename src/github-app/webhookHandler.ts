import { Request, Response } from 'express';
import { createHmac } from 'crypto';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import OpenAI from 'openai';
import { ChangeType } from '../types/types';
import { buildTestPrompt, systemPrompt } from '../utils/prompts';
import { zodResponseFormat } from 'openai/helpers/zod';
import { TestGenerationSchema } from '../types/types';

// GitHub App configuration
const GITHUB_APP_ID = process.env.GITHUB_APP_ID ? parseInt(process.env.GITHUB_APP_ID, 10) : undefined;
const GITHUB_PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY;
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Initialize OpenAI client for direct test generation
function getOpenAIClient() {
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

// Initialize Octokit with GitHub App authentication
function createOctokit(installationId: number) {
    // Debug environment variables
    console.log('🔍 Environment variables check:');
    console.log(`  GITHUB_APP_ID: ${GITHUB_APP_ID} (type: ${typeof GITHUB_APP_ID})`);
    console.log(`  GITHUB_PRIVATE_KEY: ${GITHUB_PRIVATE_KEY ? 'SET' : 'NOT SET'} (length: ${GITHUB_PRIVATE_KEY?.length || 0})`);
    console.log(`  GITHUB_WEBHOOK_SECRET: ${GITHUB_WEBHOOK_SECRET ? 'SET' : 'NOT SET'}`);
    console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);

    if (!GITHUB_APP_ID) {
        throw new Error('GITHUB_APP_ID environment variable is not set or invalid');
    }

    if (!GITHUB_PRIVATE_KEY) {
        throw new Error('GITHUB_PRIVATE_KEY environment variable is not set');
    }

    const auth = createAppAuth({
        appId: GITHUB_APP_ID,
        privateKey: GITHUB_PRIVATE_KEY,
        installationId: installationId,
    });

    return new Octokit({ authStrategy: auth });
}

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!GITHUB_WEBHOOK_SECRET) {
        console.warn('No webhook secret configured, skipping signature verification');
        return true;
    }

    if (!signature) {
        console.error('No signature provided in webhook request');
        return false;
    }

    const expectedSignature = `sha256=${createHmac('sha256', GITHUB_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex')}`;

    console.log(`🔍 Verifying webhook signature:`);
    console.log(`   Expected: ${expectedSignature}`);
    console.log(`   Received: ${signature}`);
    console.log(`   Match: ${signature === expectedSignature}`);

    return signature === expectedSignature;
}

// Get file content from GitHub
async function getFileContent(octokit: any, owner: string, repo: string, path: string, ref: string): Promise<string | null> {
    try {
        const response = await octokit.repos.getContent({
            owner,
            repo,
            path,
            ref,
        });

        if (Array.isArray(response.data)) {
            return null; // Directory
        }

        if (response.data.type === 'file' && 'content' in response.data) {
            return Buffer.from(response.data.content, 'base64').toString('utf-8');
        }

        return null;
    } catch (error) {
        console.error(`Error getting file content for ${path}:`, error);
        return null;
    }
}

// Create or update test file
async function createOrUpdateTestFile(
    octokit: any,
    owner: string,
    repo: string,
    filePath: string,
    testContent: string,
    branch: string,
    commitMessage: string
): Promise<boolean> {
    try {
        const testFilePath = getTestFilePath(filePath);

        // Check if test file already exists
        let existingFile = null;
        try {
            const response = await octokit.repos.getContent({
                owner,
                repo,
                path: testFilePath,
                ref: branch,
            });
            if (!Array.isArray(response.data) && 'sha' in response.data) {
                existingFile = response.data;
            }
        } catch (error) {
            // File doesn't exist, which is fine
        }

        // Create or update the file
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: testFilePath,
            message: commitMessage,
            content: Buffer.from(testContent).toString('base64'),
            sha: existingFile?.sha,
            branch: branch,
        });

        console.log(`✅ Successfully ${existingFile ? 'updated' : 'created'} test file: ${testFilePath}`);
        return true;
    } catch (error) {
        console.error(`❌ Error creating/updating test file:`, error);
        return false;
    }
}

// Generate test file path
function getTestFilePath(sourceFilePath: string): string {
    const dirName = sourceFilePath.substring(0, sourceFilePath.lastIndexOf('/'));
    const baseName = sourceFilePath.substring(sourceFilePath.lastIndexOf('/') + 1);
    const nameWithoutExt = baseName.substring(0, baseName.lastIndexOf('.'));
    const extension = baseName.substring(baseName.lastIndexOf('.'));

    return `${dirName}/__tests__/${nameWithoutExt}.test${extension}`;
}

// Check if file should be processed
function shouldProcessFile(filePath: string): boolean {
    const supportedExtensions = ['.ts', '.js', '.tsx', '.jsx'];
    const isTestFile = filePath.includes('__tests__') ||
        filePath.endsWith('.test.ts') ||
        filePath.endsWith('.test.js') ||
        filePath.endsWith('.spec.ts') ||
        filePath.endsWith('.spec.js');

    return supportedExtensions.some(ext => filePath.endsWith(ext)) && !isTestFile;
}

// Generate tests directly using OpenAI
async function generateTestsDirectly(
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

// Process a single file
async function processFile(
    octokit: any,
    owner: string,
    repo: string,
    filePath: string,
    branch: string,
    baseBranch: string,
    installationId: number
): Promise<boolean> {
    try {
        console.log(`🔍 Processing file: ${filePath}`);

        // Get file content
        const content = await getFileContent(octokit, owner, repo, filePath, branch);
        if (!content) {
            console.log(`⚠️ Could not get content for ${filePath}, skipping`);
            return false;
        }

        // Check if test file already exists
        const testFilePath = getTestFilePath(filePath);
        const existingTests = await getFileContent(octokit, owner, repo, testFilePath, branch);
        const changeType: ChangeType = existingTests ? 'update' : 'new';

        console.log(`📝 ${changeType === 'update' ? 'Updating' : 'Creating'} tests for ${filePath}`);

        // Get previous version of the file for comparison (if available)
        let previousCode: string | undefined;
        try {
            // Get the base branch content for comparison
            const baseContent = await getFileContent(octokit, owner, repo, filePath, baseBranch);
            previousCode = baseContent || undefined;
        } catch (error) {
            console.log(`⚠️ Could not get previous version for ${filePath}, proceeding without it`);
        }
        // Generate tests directly using OpenAI
        const result = await generateTestsDirectly(
            content,
            'jest',
            filePath,
            testFilePath,
            changeType,
            previousCode,
            existingTests || undefined
        );

        // Create or update test file
        const commitMessage = `${changeType === 'update' ? 'Update' : 'Add'} tests for ${filePath}`;
        const success = await createOrUpdateTestFile(
            octokit,
            owner,
            repo,
            filePath,
            result.tests,
            branch,
            commitMessage
        );

        if (success) {
            console.log(`✅ Generated tests for ${filePath}`);
            console.log(`📊 Test metadata:`, result.metadata);
        }

        return success;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error);
        return false;
    }
}

// Main webhook handler
export async function handleWebhook(req: Request, res: Response): Promise<void> {
    try {
        // Verify webhook signature
        const signature = req.headers['x-hub-signature-256'] as string;
        const payload = JSON.stringify(req.body);

        if (!verifyWebhookSignature(payload, signature)) {
            console.error('❌ Invalid webhook signature');
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }

        const event = req.headers['x-github-event'] as string;

        if (event !== 'pull_request') {
            console.log(`ℹ️ Ignoring non-pull_request event: ${event}`);
            res.status(200).json({ message: 'Event ignored' });
            return;
        }

        const { action, pull_request, repository, installation } = req.body;

        // Only process on PR open, synchronize, or reopen
        if (!['opened', 'synchronize', 'reopened'].includes(action)) {
            console.log(`ℹ️ Ignoring PR action: ${action}`);
            res.status(200).json({ message: 'Action ignored' });
            return;
        }

        console.log(`🚀 Processing PR #${pull_request.number}: ${pull_request.title}`);

        // Get installation ID for authentication
        const installationId = installation?.id;
        if (!installationId) {
            console.error('❌ No installation ID found');
            res.status(400).json({ error: 'No installation ID' });
            return;
        }

        // Create Octokit instance
        const octokit = createOctokit(installationId);

        const owner = repository.owner.login;
        const repo = repository.name;
        const branch = pull_request.head.ref;
        const baseBranch = pull_request.base.ref;

        // Get changed files
        const filesResponse = await octokit.pulls.listFiles({
            owner,
            repo,
            pull_number: pull_request.number,
        });

        const changedFiles = filesResponse.data
            .filter(file => file.status !== 'removed')
            .map(file => file.filename)
            .filter(shouldProcessFile);

        console.log(`📁 Found ${changedFiles.length} files to process:`, changedFiles);

        if (changedFiles.length === 0) {
            console.log('ℹ️ No files to process');
            res.status(200).json({ message: 'No files to process' });
            return;
        }

        // Process each file
        const results = await Promise.all(
            changedFiles.map(file => processFile(octokit, owner, repo, file, branch, baseBranch, installationId))
        );

        const successCount = results.filter(Boolean).length;
        console.log(`🎉 Processed ${successCount}/${changedFiles.length} files successfully`);

        res.status(200).json({
            message: 'Webhook processed successfully',
            processed: successCount,
            total: changedFiles.length,
        });

    } catch (error) {
        console.error('❌ Webhook handler error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
