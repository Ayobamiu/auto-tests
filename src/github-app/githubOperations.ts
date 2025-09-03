import { Octokit } from '@octokit/rest';

/**
 * Initialize Octokit with Personal Access Token
 */
export function createOctokit(): Octokit {
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
        console.error('❌ GITHUB_TOKEN not set. Please add a Personal Access Token to Railway environment variables.');
        throw new Error('GITHUB_TOKEN environment variable is required');
    }

    try {
        const octokit = new Octokit({
            auth: githubToken,
        });
        console.log('✅ Octokit created successfully');
        return octokit;
    } catch (error) {
        console.error('❌ Error creating Octokit:', error instanceof Error ? error.message : String(error));
        throw error;
    }
}

/**
 * Get file content from GitHub
 */
export async function getFileContent(
    octokit: Octokit,
    owner: string,
    repo: string,
    path: string,
    ref: string
): Promise<string | null> {
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

/**
 * Create or update test file
 */
export async function createOrUpdateTestFile(
    octokit: Octokit,
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

/**
 * Generate test file path
 */
export function getTestFilePath(sourceFilePath: string): string {
    const dirName = sourceFilePath.substring(0, sourceFilePath.lastIndexOf('/'));
    const baseName = sourceFilePath.substring(sourceFilePath.lastIndexOf('/') + 1);
    const nameWithoutExt = baseName.substring(0, baseName.lastIndexOf('.'));
    const extension = baseName.substring(baseName.lastIndexOf('.'));

    return `${dirName}/__tests__/${nameWithoutExt}.test${extension}`;
}

/**
 * Check if file should be processed
 */
export function shouldProcessFile(filePath: string): boolean {
    const supportedExtensions = ['.ts', '.js', '.tsx', '.jsx'];
    const isTestFile = filePath.includes('__tests__') ||
        filePath.endsWith('.test.ts') ||
        filePath.endsWith('.test.js') ||
        filePath.endsWith('.spec.ts') ||
        filePath.endsWith('.spec.js');

    return supportedExtensions.some(ext => filePath.endsWith(ext)) && !isTestFile;
}

/**
 * Get changed files with diff information from a pull request
 */
export async function getChangedFilesWithDiffs(
    octokit: Octokit,
    owner: string,
    repo: string,
    pullNumber: number
): Promise<{
    changedFiles: string[];
    fileDiffs: Map<string, any>;
}> {
    const filesResponse = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
    });

    const changedFiles = filesResponse.data
        .filter((file: any) => file.status !== 'removed')
        .map((file: any) => file.filename)
        .filter(shouldProcessFile);

    // Store file diff information for more accurate change detection
    const fileDiffs = new Map<string, any>();
    filesResponse.data
        .filter((file: any) => shouldProcessFile(file.filename))
        .forEach((file: any) => {
            fileDiffs.set(file.filename, {
                status: file.status,
                additions: file.additions,
                deletions: file.deletions,
                changes: file.changes,
                patch: file.patch
            });
        });

    return { changedFiles, fileDiffs };
}

/**
 * Pre-fetch all file contents to avoid redundant API calls
 */
export async function preFetchFileContents(
    octokit: Octokit,
    owner: string,
    repo: string,
    changedFiles: string[],
    branch: string,
    baseBranch: string
): Promise<Map<string, {
    current: string | null;
    base: string | null;
    test: string | null;
    testFilePath: string;
}>> {
    console.log(`📥 Pre-fetching file contents for ${changedFiles.length} files...`);
    const fileContents = new Map<string, {
        current: string | null;
        base: string | null;
        test: string | null;
        testFilePath: string;
    }>();

    for (const filePath of changedFiles) {
        const testFilePath = getTestFilePath(filePath);

        const [currentContent, baseContent, testContent] = await Promise.all([
            getFileContent(octokit, owner, repo, filePath, branch),
            getFileContent(octokit, owner, repo, filePath, baseBranch),
            getFileContent(octokit, owner, repo, testFilePath, branch)
        ]);

        fileContents.set(filePath, {
            current: currentContent,
            base: baseContent,
            test: testContent,
            testFilePath
        });
    }

    console.log(`✅ Pre-fetched contents for ${fileContents.size} files`);
    return fileContents;
}
