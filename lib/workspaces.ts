import fs from 'fs/promises';
import path from 'path';

const WORKSPACE_ROOT = process.env.CORTEX_WORKSPACE_ROOT || path.join(process.cwd(), 'workspaces');

export async function ensureWorkspace(userId: string, projectId: string): Promise<string> {
    const wsPath = path.join(WORKSPACE_ROOT, userId, projectId);
    try {
        await fs.mkdir(wsPath, { recursive: true });
        // Create an empty project structure if new
        const readmePath = path.join(wsPath, 'README.md');
        try {
            await fs.access(readmePath);
        } catch {
            await fs.writeFile(readmePath, `# Project ${projectId}\n\nCreated by Cortex AI.`);
        }
    } catch (error) {
        console.error("Failed to create workspace:", error);
        throw error;
    }
    return wsPath;
}

export async function listWorkspaces(userId: string): Promise<string[]> {
    const userRoot = path.join(WORKSPACE_ROOT, userId);
    try {
        const projects = await fs.readdir(userRoot);
        return projects;
    } catch {
        return [];
    }
}
