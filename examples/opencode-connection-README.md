# OpenCode Connection Model

## Overview

This directory contains the implementation of the OpenCode adapter connection model, demonstrating how Paperclip connects to OpenCode agents with proper session management, model selection, and configuration.

## Key Components

### 1. Model Registry (`opencode-connection-model.ts`)

Defines the available OpenCode models and validation logic:

```typescript
export const OPCODE_MODELS = [
  { id: "openai/gpt-5.2-codex", label: "OpenAI GPT-5.2 Codex" },
  { id: "anthropic/claude-opus-5-5", label: "Claude Opus 5.5" },
  { id: "google/gemini-4-argon", label: "Google Gemini 4 Argon" },
  // ... more models
];
```

### 2. Connection Manager

Manages connections, sessions, and configuration:

```typescript
export class OpenCodeConnectionManager {
  // Build connection from agent context
  buildConfig(ctx: AdapterExecutionContext): OpenCodeConnectionConfig
  
  // Create session from execution context
  buildSession(ctx: AdapterExecutionContext): OpenCodeSession | undefined
  
  // Establish connection
  connect(connectionId: string, ctx: AdapterExecutionContext): Promise<OpenCodeConnection>
  
  // Terminate connection
  disconnect(connectionId: string): void
  
  // Build execution command
  buildExecutionCommand(connection: OpenCodeConnection, effectiveCwd: string, prompt: string): { command: string; args: string[] }
  
  // Build environment variables
  buildEnvironmentVariables(connection: OpenCodeConnection): Record<string, string>
}
```

### 3. Connection Types

**Configuration Interface:**
```typescript
export interface OpenCodeConnectionConfig {
  model: OpenCodeModelId;                    // Required: provider/model format
  variant?: string;                         // Optional: reasoning profile
  cwd?: string;                             // Optional: working directory
  instructionsFilePath?: string;            // Optional: agent instructions
  dangerouslySkipPermissions?: boolean;     // Optional: skip prompts
  command?: string;                         // Optional: command (defaults to "opencode")
  extraArgs?: string[];                     // Optional: additional CLI args
  env?: Record<string, string>;             // Optional: environment variables
  timeoutSec?: number;                      // Optional: execution timeout
  graceSec?: number;                         // Optional: SIGTERM grace period
}
```

**Session Interface:**
```typescript
export interface OpenCodeSession {
  sessionId: string;        // OpenCode session ID
  cwd?: string;             // Working directory
  workspaceId?: string;      // Workspace identifier
  repoUrl?: string;         // Git repository URL
  repoRef?: string;         // Git reference (branch/tag)
}
```

## Connection Examples

### Basic Connection
```typescript
export const basicConnectionExample: OpenCodeConnectionConfig = {
  model: "openai/gpt-5.2-codex",
  cwd: "/workspace/my-project",
  dangerouslySkipPermissions: true,
};
```

### Advanced Connection
```typescript
export const advancedConnectionExample: OpenCodeConnectionConfig = {
  model: "anthropic/claude-opus-5-5",
  variant: "high",
  cwd: "/workspace/code-review",
  instructionsFilePath: "/workspace/instructions.md",
  extraArgs: ["--verbose", "--timeout", "300"],
  env: {
    OPENCODE_CUSTOM_SETTING: "value",
    PAPERCLIP_API_KEY: "your-api-key",
  },
  timeoutSec: 300,
  graceSec: 30,
};
```

### Session-Based Connection
```typescript
export const sessionConnectionExample: OpenCodeConnectionConfig = {
  model: "google/gemini-4-argon",
  cwd: "/workspace/session-test",
  dangerouslySkipPermissions: true,
};
```

## Connection Flow

1. **Configuration Building**: Extract and validate adapter configuration from agent context
2. **Session Creation**: Determine existing sessions or create new ones
3. **Connection Establishment**: Connect to OpenCode with validated configuration
4. **Command Building**: Construct execution command with model, arguments, and environment
5. **Execution**: Run OpenCode agent with built configuration
6. **Cleanup**: Disconnect and cleanup resources

## Key Features

- **Model Validation**: Ensures model IDs follow `provider/model` format
- **Session Persistence**: Supports OpenCode session resumption
- **Environment Configuration**: Manages Paperclip and OpenCode environment variables
- **Flexible Command Building**: Supports custom arguments and variants
- **Error Handling**: Comprehensive error handling and cleanup

## Usage in Adapter

The connection manager is used within the adapter execution:

```typescript
export async function executeOpenCodeAgent(
  ctx: AdapterExecutionContext
): Promise<AdapterExecutionResult> {
  const connectionManager = new OpenCodeConnectionManager();
  const connectionId = `run-${ctx.runId}`;

  try {
    // Connect and build connection
    const connection = await connectionManager.connect(connectionId, ctx);
    
    // Build command and arguments
    const { command, args } = connectionManager.buildExecutionCommand(
      connection,
      effectiveCwd,
      ctx.prompt || ""
    );
    
    // Build environment variables
    const env = connectionManager.buildEnvironmentVariables(connection);
    
    // Execute...
    
  } catch (error) {
    // Handle errors...
  } finally {
    connectionManager.disconnect(connectionId);
  }
}
```

## Model Format

All OpenCode models follow the `provider/model` format:
- `openai/gpt-5.2-codex` - OpenAI model
- `anthropic/claude-opus-5-5` - Anthropic model
- `google/gemini-4-argon` - Google model

This format ensures compatibility with OpenCode's model routing system.

## Environment Variables

**Paperclip Variables:**
- `PAPERCLIP_WORKSPACE_ID`: Workspace identifier
- `PAPERCLIP_REPO_URL`: Git repository URL
- `PAPERCLIP_API_KEY`: Authentication key

**OpenCode Variables:**
- `OPENCODE_DISABLE_PROJECT_CONFIG`: Disables project config file creation
- `OPENCODE_CUSTOM_SETTING`: Custom OpenCode settings

## Security Considerations

- **Permissions**: Use `dangerouslySkipPermissions: true` for unattended runs
- **Validation**: All inputs are validated before execution
- **Isolation**: Each connection is isolated with unique IDs
- **Cleanup**: Resources are properly cleaned up in finally blocks

This connection model provides a robust, type-safe way to integrate OpenCode agents with Paperclip, ensuring proper configuration, session management, and security.