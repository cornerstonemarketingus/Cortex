import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Define paths matching existing setup
const ENGINE_SCRIPT = path.join(process.cwd(), 'engine', 'run_agent.py');
const DEFAULT_DOCKER_IMAGE = process.env.CORTEX_DOCKER_IMAGE || 'cortex-agent:latest';

export type AgentRunOptions = {
    agent: string;
    task: string;
    mode: string;
    dryRun: boolean;
    cwd: string;
    env?: NodeJS.ProcessEnv;
};

function parseJsonOutput(stdout: string): unknown {
    const trimmed = stdout.trim();
    if (!trimmed) {
        throw new Error('Agent produced no output');
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        // Some scripts may emit logs; parse the last valid JSON line.
        const lines = trimmed.split(/\r?\n/).reverse();
        for (const line of lines) {
            try {
                return JSON.parse(line);
            } catch {
                continue;
            }
        }
        throw new Error(`Failed to parse JSON output: ${trimmed}`);
    }
}

function normalizeDockerVolumePath(hostPath: string): string {
    const resolved = path.resolve(hostPath);
    if (process.platform !== 'win32') return resolved;
    return resolved.replace(/\\/g, '/');
}

/**
 * Run an agent in the configured sandbox environment.
 * Supports 'process' (local spawn) and 'docker' (containerized) modes.
 */
export async function runAgentInSandbox(options: AgentRunOptions): Promise<unknown> {
    const mode = (process.env.CORTEX_SANDBOX_MODE || 'process').toLowerCase();

    if (mode === 'docker') {
        return runInDocker(options);
    }

    return runInLocalProcess(options);
}

async function runInLocalProcess({ agent, task, mode, dryRun, cwd, env }: AgentRunOptions): Promise<unknown> {
    return new Promise((resolve, reject) => {
        if (cwd && !fs.existsSync(cwd)) {
            reject(new Error(`Workspace path does not exist: ${cwd}`));
            return;
        }

        const args = [
            ENGINE_SCRIPT,
            '--agent', agent,
            '--task', task,
            '--mode', mode,
            dryRun ? '--dry-run' : '--no-dry-run',
        ];

        if (cwd) {
            args.push('--cwd', cwd);
        }

        console.log(`[Sandbox:Local] Spawning python agent in ${cwd || 'default cwd'}`);

        const child = spawn('python', args, {
            env: { ...process.env, ...env, PYTHONIOENCODING: 'utf-8' },
            cwd: cwd || undefined, // Set the working directory for the process itself
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });

        child.on('close', (code) => {
            if (code !== 0) {
                // Try to parse partial JSON result even on error
                try {
                    const errorResult = parseJsonOutput(stdout);
                    resolve(errorResult);
                } catch {
                    reject(new Error(`Process exited with code ${code}: ${stderr || stdout}`));
                }
            } else {
                try {
                    const result = parseJsonOutput(stdout);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Docker Sandbox Implementation
 * Requires `docker` to be allowed in the path and the `cortex-agent` image to be built.
 */
async function runInDocker({ agent, task, mode, dryRun, cwd, env }: AgentRunOptions): Promise<unknown> {
    const sourcePath = cwd && fs.existsSync(cwd) ? path.resolve(cwd) : process.cwd();
    const dockerVolumePath = normalizeDockerVolumePath(sourcePath);
    const envArgs: string[] = [];

    if (process.env.OPENAI_API_KEY) {
        envArgs.push('-e', `OPENAI_API_KEY=${process.env.OPENAI_API_KEY}`);
    }
    if (process.env.ANTHROPIC_API_KEY) {
        envArgs.push('-e', `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY}`);
    }

    const args = [
        'run',
        '--rm',
        '--network', 'none', // Network isolation
        '-v', `${dockerVolumePath}:/workspace`,
        '-w', '/workspace',
        ...envArgs,
        DEFAULT_DOCKER_IMAGE,
        '--agent', agent,
        '--task', task,
        '--mode', mode,
        dryRun ? '--dry-run' : '--no-dry-run',
        '--cwd', '/workspace',
    ];

    console.log(`[Sandbox:Docker] ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
        const child = spawn('docker', args, {
            env: { ...process.env, ...env },
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });

        child.on('close', (code) => {
            if (code !== 0) {
                const details = (stderr || stdout).trim();
                if (/Unable to find image/i.test(details)) {
                    reject(new Error(
                        `Docker image ${DEFAULT_DOCKER_IMAGE} not found. Build it with: docker build -t ${DEFAULT_DOCKER_IMAGE} -f agent.Dockerfile .`
                    ));
                    return;
                }
                if (/docker(.+)?not recognized/i.test(details)) {
                    reject(new Error('Docker CLI not found in PATH. Install Docker Desktop and ensure docker is available in your shell.'));
                    return;
                }
                reject(new Error(`Docker exited with code ${code}: ${details}`));
            } else {
                try {
                    const result = parseJsonOutput(stdout);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}
