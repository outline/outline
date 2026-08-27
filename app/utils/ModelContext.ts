import Logger from "~/utils/Logger";

/** A content block returned from a WebMCP tool execution. */
export interface ModelContextContent {
  type: "text";
  text: string;
}

/** The result payload returned from a WebMCP tool execution. */
export interface ModelContextToolResult {
  content: ModelContextContent[];
  isError?: boolean;
}

/** A tool descriptor for registration with the browser's model context. */
export interface ModelContextTool {
  /** Unique tool identifier, e.g. "star_document". */
  name: string;
  /** Natural language description of the tool for agents. */
  description: string;
  /** JSON Schema describing the tool arguments. */
  inputSchema?: Record<string, unknown>;
  /** Callback invoked when an agent runs the tool. */
  execute: (
    args: Record<string, unknown>,
    options?: { signal?: AbortSignal }
  ) => Promise<ModelContextToolResult>;
}

interface ModelContext {
  registerTool: (
    tool: ModelContextTool,
    options?: { signal?: AbortSignal }
  ) => void | Promise<void>;
}

declare global {
  interface Document {
    /** Experimental WebMCP API, shipping behind a flag in Chrome 146+. */
    modelContext?: ModelContext;
  }
}

/**
 * Returns true when the browser supports the WebMCP model context API.
 *
 * @returns true when `document.modelContext` is available.
 */
export function isModelContextSupported(): boolean {
  return typeof window.document.modelContext?.registerTool === "function";
}

/**
 * Registers a tool with the browser's model context, skipping registration
 * when the API is unavailable or a tool with the same name is already
 * registered elsewhere in the app.
 *
 * @param tool the tool descriptor to register.
 * @param signal aborting the signal unregisters the tool.
 * @returns true when the tool was registered.
 */
export function registerModelContextTool(
  tool: ModelContextTool,
  signal: AbortSignal
): boolean {
  if (
    !isModelContextSupported() ||
    signal.aborted ||
    registeredToolNames.has(tool.name)
  ) {
    return false;
  }

  registeredToolNames.add(tool.name);
  signal.addEventListener(
    "abort",
    () => registeredToolNames.delete(tool.name),
    { once: true }
  );

  try {
    void window.document.modelContext?.registerTool(tool, { signal });
  } catch (_err) {
    Logger.warn("Failed to register WebMCP tool", { name: tool.name });
    registeredToolNames.delete(tool.name);
    return false;
  }

  return true;
}

/** Names of tools currently registered, to prevent duplicate registration. */
const registeredToolNames = new Set<string>();
