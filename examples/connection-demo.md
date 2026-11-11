# OpenCode Connection Model Demo

## Demo Purpose

This demo shows how the OpenCode connection model works in practice, demonstrating the complete flow from configuration to execution.

## Demo Setup

### 1. Basic Connection

This example shows a basic OpenCode connection with model selection and working directory:

```typescript
// Configure the connection
const config: OpenCodeConnectionConfig = {
  model: "openai/gpt-5.2-codex",           // Required: model in provider/model format
  cwd: "/workspace/my-project",             // Optional: working directory
  dangerouslySkipPermissions: true,        // Optional: skip permission prompts
};

// Create connection manager
const connectionManager = new OpenCodeConnectionManager();

// Simulate agent context
const mockAgentContext: AdapterExecutionContext = {
  runId: "demo-run-123",
  agent: { id: "agent-1", companyId: "company-1" },
  runtime: { sessionParams: { sessionId: "session-456" } },
  config,
  context: {
    paperclipWorkspace: {
      cwd: "/workspace/my-project",
      workspaceId: "workspace-1",
      repoUrl: "https://github.com/user/repo",
      repoRef: "main",
    },
    prompt: "Please review this code and provide feedback.",
  },
};

// Connect and build connection
const connection = await connectionManager.connect("demo-connection", mockAgentContext);

console.log("Connection established:", {
  model: connection.config.model,
  cwd: connection.config.cwd,
  sessionId: connection.session?.sessionId,
  isConnected: connection.isConnected,
});
```

### 2. Advanced Connection with Session

This example shows a more advanced connection with session persistence:

```typescript
// Advanced configuration
const advancedConfig: OpenCodeConnectionConfig = {
  model: "anthropic/claude-opus-5-5",
  variant: "high",                           // Reasoning profile
  cwd: "/workspace/code-review",
  instructionsFilePath: "/workspace/instructions.md",
  extraArgs: ["--verbose", "--timeout", "300"],
  env: {
    OPENCODE_CUSTOM_SETTING: "production",
    PAPERCLIP_API_KEY: "sk-demo-key",
  },
  timeoutSec: 300,
  graceSec: 30,
};

// Simulate agent with session
const sessionContext: AdapterExecutionContext = {
  runId: "session-demo-789",
  agent: { id: "agent-2", companyId: "company-1" },
  runtime: {
    sessionParams: {
      sessionId: "persistent-session-999",
      cwd: "/workspace/code-review",
      remoteExecution: {
        kind: "remote",
        transport: "ssh",
        host: "remote-host",
      },
    },
  },
  config: advancedConfig,
  context: {
    paperclipWorkspace: {
      cwd: "/workspace/code-review",
      workspaceId: "workspace-2",
      agentHome: "/home/user/.opencode",
    },
    prompt: "Analyze this PR and provide suggestions.",
  },
};

// Connect with session
const sessionConnection = await connectionManager.connect("session-demo", sessionContext);

console.log("Session connection:", {
  model: sessionConnection.config.model,
  variant: sessionConnection.config.variant,
  sessionId: sessionConnection.session?.sessionId,
  workspaceId: sessionConnection.session?.workspaceId,
  isConnected: sessionConnection.isConnected,
});
```

### 3. Command Building

This example shows how the connection manager builds the execution command:

```typescript
const connection: OpenCodeConnection = {
  config: {
    model: "google/gemini-4-argon",
    cwd: "/workspace/gemini-task",
    variant: "medium",
    dangerouslySkipPermissions: true,
  },
  session: {
    sessionId: "gemini-session-111",
    cwd: "/workspace/gemini-task",
  },
  isConnected: true,
};

const effectiveCwd = "/workspace/gemini-task";
const prompt = "Generate a summary of this document.";

const { command, args } = connectionManager.buildExecutionCommand(
  connection,
  effectiveCwd,
  prompt
);

console.log("Execution command:", command);
console.log("Arguments:", args);
// Output:
// command: "opencode"
// arguments: [
//   "run", "--format", "json",
//   "--dir", "/workspace/gemini-task",
//   "--model", "google/gemini-4-argon",
//   "--variant", "medium",
//   "--permission", "allow"
// ]
```

### 4. Environment Variables

This example shows how environment variables are built:

```typescript
const connection: OpenCodeConnection = {
  config: {
    model: "xai/grok-4.7",
    env: {
      CUSTOM_API_ENDPOINT: "https://api.example.com",
    },
  },
  session: {
    workspaceId: "workspace-3",
    repoUrl: "https://github.com/example/project",
  },
  isConnected: true,
};

const env = connectionManager.buildEnvironmentVariables(connection);

console.log("Environment variables:", env);
// Output:
// {
//   "CUSTOM_API_ENDPOINT": "https://api.example.com",
//   "OPENCODE_DISABLE_PROJECT_CONFIG": "true",
//   "PAPERCLIP_WORKSPACE_ID": "workspace-3",
//   "PAPERCLIP_REPO_URL": "https://github.com/example/project"
// }
```

### 5. Error Handling

This example shows error handling in the connection manager:

```typescript
const badConfig: OpenCodeConnectionConfig = {
  model: "invalid-model",  // Invalid format
  cwd: "/workspace/bad",
};

try {
  // This will fail validation
  const badConnection = await connectionManager.connect("bad-demo", {
    runId: "bad-run",
    agent: { id: "agent", companyId: "company" },
    runtime: {},
    config: badConfig,
    context: { prompt: "Test prompt" },
  });
} catch (error) {
  console.error("Connection failed:", error.message);
  // Output: "Invalid OpenCode model: invalid-model"
}
```

## Connection State Management

### Connection States

```typescript
interface OpenCodeConnection {
  config: OpenCodeConnectionConfig;
  session?: OpenCodeSession;
  isConnected: boolean;      // Connected, disconnected, or error
  lastError?: string;        // Error message if any
}
```

### Connection Lifecycle

1. **Connect**: Establish connection with validated configuration
2. **Execute**: Build and run command
3. **Disconnect**: Cleanup resources
4. **Re-connect**: Create new connections for new runs

## Model Validation

### Validation Rules

1. **Format**: Must be `provider/model`
2. **Not Empty**: Cannot be null, undefined, or empty string
3. **No Trailing Slash**: Cannot end with `/`

### Validation Examples

```typescript
// Valid models
"openai/gpt-5.2-codex"
"anthropic/claude-opus-5-5"
"google/gemini-4-argon"

// Invalid models
"invalid-model"           // Missing provider
"openai/"                // Trailing slash
""                       // Empty string
null                     // Not a string
```

## Session Management

### Session Persistence

Sessions allow OpenCode to persist state across runs:

```typescript
// Session can be resumed if:
// 1. Session ID exists
// 2. Working directory matches (or is empty)
// 3. Remote execution target matches

const sessionContext: AdapterExecutionContext = {
  runtime: {
    sessionParams: {
      sessionId: "my-session",
      cwd: "/workspace/project",  // Must match effectiveExecutionCwd
    },
  },
  // ... other properties
};
```

### Session Identity

Each session has unique identity information:

```typescript
interface OpenCodeSession {
  sessionId: string;        // Unique session identifier
  cwd?: string;             // Working directory for this session
  workspaceId?: string;      // Associated workspace
  repoUrl?: string;         // Source repository
  repoRef?: string;         // Branch/tag reference
}
```

## Security Considerations

### Permission Management

```typescript
// For unattended runs, skip permissions
const secureConfig: OpenCodeConnectionConfig = {
  model: "openai/gpt-5.2-codex",
  dangerouslySkipPermissions: true,  // ⚠️ Use with caution
  // ... other configs
};
```

### Environment Security

- **Validation**: All configuration is validated before use
- **Isolation**: Each connection has unique ID and isolation
- **Cleanup**: Resources are cleaned up in finally blocks
- **Error Handling**: Errors are caught and logged appropriately

## Integration Points

### With Adapter Execution

The connection manager integrates with the adapter execution flow:

```typescript
export async function executeOpenCodeAgent(
  ctx: AdapterExecutionContext
): Promise<AdapterExecutionResult> {
  const connectionManager = new OpenCodeConnectionManager();
  const connectionId = `run-${ctx.runId}`;

  try {
    // Establish connection
    const connection = await connectionManager.connect(connectionId, ctx);
    
    // Prepare execution
    const effectiveCwd = connection.session?.cwd || connection.config.cwd || process.cwd();
    const { command, args } = connectionManager.buildExecutionCommand(
      connection, effectiveCwd, ctx.prompt || ""
    );
    const env = connectionManager.buildEnvironmentVariables(connection);
    
    // Execute OpenCode command
    // const result = await runCommand(command, args, { cwd: effectiveCwd, env });
    
    return result;
    
  } catch (error) {
    // Handle errors
    return { exitCode: 1, errorMessage: error.message };
  } finally {
    // Cleanup
    connectionManager.disconnect(connectionId);
  }
}
```

## Benefits of This Connection Model

1. **Type Safety**: Full TypeScript typing for all connection components
2. **Validation**: Built-in validation for configuration and models
3. **Flexibility**: Supports various connection scenarios (basic, advanced, session-based)
4. **Security**: Comprehensive error handling and security considerations
5. **Maintainability**: Clean separation of concerns with dedicated manager class
6. **Reusability**: Connection manager can be used across different execution contexts

## Conclusion

This OpenCode connection model provides a robust foundation for integrating OpenCode agents with Paperclip. It handles configuration, validation, session management, and execution in a type-safe, secure, and maintainable way.

**Key takeaways:**

- Models must follow `provider/model` format
- Sessions enable persistence across runs
- Configuration is validated before use
- Error handling is comprehensive
- Resources are properly cleaned up
- The connection manager abstracts complex logic

This model ensures reliable, secure, and efficient OpenCode agent execution within Paperclip.