// OpenCode Connection Model Implementation
// Demonstrates the adapter structure and connection patterns

import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";

// === Model Registry ===
export const OPCODE_MODELS = [
  { id: "openai/gpt-5.2-codex", label: "OpenAI GPT-5.2 Codex" },
  { id: "openai/gpt-6-astra", label: "OpenAI GPT-6 Astra" },
  { id: "anthropic/claude-opus-5-5", label: "Claude Opus 5.5" },
  { id: "anthropic/claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
  { id: "google/gemini-4-argon", label: "Google Gemini 4 Argon" },
] as const;

export type OpenCodeModelId = typeof OPCODE_MODELS[number]["id"];

// === Adapter Type Definition ===
export const OPENCODE_ADAPTER_TYPE = "opencode_local" as const;
export const OPENCODE_LABEL = "OpenCode" as const;

// === Connection Configuration Schema ===
export interface OpenCodeConnectionConfig {
  // Required fields
  model: OpenCodeModelId;
  
  // Optional fields
  variant?: string;                    // "minimal|low|medium|high|xhigh|max"
  cwd?: string;                         // Working directory
  instructionsFilePath?: string;       // Instructions file path
  dangerouslySkipPermissions?: boolean; // Skip permission prompts
  command?: string;                    // Command (defaults to "opencode")
  extraArgs?: string[];                // Additional CLI args
  env?: Record<string, string>;        // Environment variables
  
  // Runtime fields
  timeoutSec?: number;                 // Execution timeout
  graceSec?: number;                    // Grace period for SIGTERM
}

// === Session Connection Model ===
export interface OpenCodeSession {
  sessionId: string;                    // OpenCode session ID
  cwd?: string;                         // Working directory
  workspaceId?: string;                  // Workspace identifier
  repoUrl?: string;                     // Git repository URL
  repoRef?: string;                     // Git reference (branch/tag)
}

export interface OpenCodeConnection {
  config: OpenCodeConnectionConfig;
  session?: OpenCodeSession;
  isConnected: boolean;
  lastError?: string;
}

// === Connection Manager ===
export class OpenCodeConnectionManager {
  private connections: Map<string, OpenCodeConnection> = new Map();
  private readonly DEFAULT_MODEL = "openai/gpt-5.2-codex";

  // Build connection configuration from agent context
  buildConfig(ctx: AdapterExecutionContext): OpenCodeConnectionConfig {
    const config = ctx.config as OpenCodeConnectionConfig;
    
    return {
      model: config.model || this.DEFAULT_MODEL,
      variant: config.variant,
      cwd: config.cwd,
      instructionsFilePath: config.instructionsFilePath,
      dangerouslySkipPermissions: config.dangerouslySkipPermissions ?? true,
      command: config.command || "opencode",
      extraArgs: config.extraArgs,
      env: config.env,
      timeoutSec: config.timeoutSec,
      graceSec: config.graceSec,
    };
  }

  // Build session from execution context
  buildSession(ctx: AdapterExecutionContext): OpenCodeSession | undefined {
    const { agent, runtime, config, context } = ctx;
    
    // Check for existing session
    const sessionParams = runtime.sessionParams || {};
    const sessionId = sessionParams.sessionId || runtime.sessionId;
    
    if (!sessionId) return undefined;

    // Determine working directory
    const workspaceContext = context.paperclipWorkspace || {};
    const workspaceCwd = workspaceContext.cwd;
    const configuredCwd = config.cwd;
    const agentHome = workspaceContext.agentHome;
    
    const effectiveCwd = workspaceCwd || configuredCwd || agentHome;

    return {
      sessionId,
      cwd: effectiveCwd,
      workspaceId: workspaceContext.workspaceId,
      repoUrl: workspaceContext.repoUrl,
      repoRef: workspaceContext.repoRef,
    };
  }

  // Connect and create connection
  async connect(connectionId: string, ctx: AdapterExecutionContext): Promise<OpenCodeConnection> {
    const config = this.buildConfig(ctx);
    const session = this.buildSession(ctx);
    
    // Validate model
    if (!this.isValidModel(config.model)) {
      throw new Error(`Invalid OpenCode model: ${config.model}`);
    }

    // Build connection
    const connection: OpenCodeConnection = {
      config,
      session,
      isConnected: true,
    };

    this.connections.set(connectionId, connection);
    return connection;
  }

  // Disconnect and cleanup
  disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isConnected = false;
      connection.lastError = "Disconnected";
      // Cleanup resources if needed
    }
    this.connections.delete(connectionId);
  }

  // Get connection by ID
  getConnection(connectionId: string): OpenCodeConnection | undefined {
    return this.connections.get(connectionId);
  }

  // Validate model ID format
  private isValidModel(modelId: string): boolean {
    return typeof modelId === "string" && 
           modelId.trim().length > 0 && 
           modelId.includes("/") && 
           !modelId.endsWith("/");
  }

  // Build execution command
  buildExecutionCommand(
    connection: OpenCodeConnection,
    effectiveCwd: string,
    prompt: string
  ): { command: string; args: string[] } {
    const { config } = connection;
    
    const command = config.command || "opencode";
    const args = [
      "run",
      "--format", "json",
      "--dir", effectiveCwd,
      "--model", config.model,
    ];

    if (config.variant) {
      args.push("--variant", config.variant);
    }

    if (config.dangerouslySkipPermissions) {
      args.push("--permission", "allow");
    }

    if (config.extraArgs?.length) {
      args.push(...config.extraArgs);
    }

    return { command, args };
  }

  // Build environment variables
  buildEnvironmentVariables(connection: OpenCodeConnection): Record<string, string> {
    const env: Record<string, string> = {
      ...connection.config.env,
      OPENCODE_DISABLE_PROJECT_CONFIG: "true",
    };

    // Add Paperclip environment variables
    if (connection.session?.workspaceId) {
      env.PAPERCLIP_WORKSPACE_ID = connection.session.workspaceId;
    }

    if (connection.session?.repoUrl) {
      env.PAPERCLIP_REPO_URL = connection.session.repoUrl;
    }

    return env;
  }
}

// === Connection Examples ===

// Example 1: Basic connection
export const basicConnectionExample: OpenCodeConnectionConfig = {
  model: "openai/gpt-5.2-codex",
  cwd: "/workspace/my-project",
  dangerouslySkipPermissions: true,
};

// Example 2: Connection with variant and extra args
export const advancedConnectionExample: OpenCodeConnectionConfig = {
  model: "anthropic/claude-opus-5-5",
  variant: "high",
  cwd: "/workspace/code-review",
  instructionsFilePath: "/workspace/instructions.md",
  extraArgs: ["--verbose", "--timeout", "300"],
  env: {
    OPENCODE_CUSTOM_SETTING: "value",
    PAPERCIP_API_KEY: "your-api-key",
  },
  timeoutSec: 300,
  graceSec: 30,
};

// Example 3: Session-based connection
export const sessionConnectionExample: OpenCodeConnectionConfig = {
  model: "google/gemini-4-argon",
  cwd: "/workspace/session-test",
  dangerouslySkipPermissions: true,
};

// === Usage Example ===

// In your adapter execution function:
export async function executeOpenCodeAgent(
  ctx: AdapterExecutionContext
): Promise<AdapterExecutionResult> {
  const connectionManager = new OpenCodeConnectionManager();
  const connectionId = `run-${ctx.runId}`;

  try {
    // Connect and build connection
    const connection = await connectionManager.connect(connectionId, ctx);
    
    // Determine effective working directory
    const effectiveCwd = connection.session?.cwd || connection.config.cwd || process.cwd();
    
    // Build command and arguments
    const { command, args } = connectionManager.buildExecutionCommand(
      connection,
      effectiveCwd,
      ctx.prompt || ""
    );
    
    // Build environment variables
    const env = connectionManager.buildEnvironmentVariables(connection);
    
    // Execute (this would be the actual execution logic)
    // const result = await executeCommand(command, args, { cwd: effectiveCwd, env, ... });
    
    return {
      exitCode: 0,
      stdout: "Execution result would go here",
      stderr: "",
      usage: { costUsd: 0.01, usageComplete: true },
      model: connection.config.model,
    };
    
  } catch (error) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : "Unknown error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    connectionManager.disconnect(connectionId);
  }
}

export default OpenCodeConnectionManager;