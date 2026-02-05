import Sandbox, { Volume, type CommandHandle } from "@moru-ai/core";

const TEMPLATE_NAME = "hackathon-ts-agent";

/**
 * Create a new volume for a conversation
 */
export async function createVolume(conversationId: string): Promise<string> {
  const volume = await Volume.create({ name: `hackathon-${conversationId}` });
  return volume.volumeId;
}

/**
 * Get an existing volume
 */
export async function getVolume(volumeId: string) {
  return Volume.get(volumeId);
}

/**
 * Agent code that runs inside the sandbox.
 * Uses Claude Agent SDK to process user prompts.
 */
const AGENT_CODE = `#!/usr/bin/env node
import { query } from "@anthropic-ai/claude-agent-sdk";
import * as readline from "readline";

interface ProcessStartCommand {
  type: "process_start";
  session_id?: string;
}

interface SessionMessageCommand {
  type: "session_message";
  text?: string;
  content?: Array<{ type: string; text?: string }>;
}

function emit(msg: Record<string, unknown>): void {
  console.log(JSON.stringify(msg));
}

function parseContent(msg: SessionMessageCommand): string {
  if (msg.text) return msg.text;
  if (msg.content) {
    return msg.content
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text!)
      .join("\\n");
  }
  return "";
}

async function readLine(rl: readline.Interface): Promise<string | null> {
  return new Promise((resolve) => {
    rl.once("line", resolve);
    rl.once("close", () => resolve(null));
  });
}

async function callCallback(status: "completed" | "error", sessionId?: string, errorMessage?: string) {
  const callbackUrl = process.env.CALLBACK_URL;
  if (!callbackUrl) return;

  try {
    await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, sessionId, errorMessage }),
    });
  } catch (error) {
    console.error("[AGENT] Callback error:", error);
  }
}

async function main() {
  const workspace = "/workspace/data";
  const resumeSessionId = process.env.RESUME_SESSION_ID || undefined;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  try {
    // Wait for process_start
    const startLine = await readLine(rl);
    if (!startLine) {
      emit({ type: "process_error", message: "No input received" });
      return;
    }

    const startMsg: ProcessStartCommand = JSON.parse(startLine);
    if (startMsg.type !== "process_start") {
      emit({ type: "process_error", message: "Expected process_start" });
      return;
    }

    const sessionIdToResume = startMsg.session_id || resumeSessionId || undefined;
    emit({ type: "process_ready", session_id: sessionIdToResume || "pending" });

    // Wait for session_message
    const msgLine = await readLine(rl);
    if (!msgLine) {
      emit({ type: "process_error", message: "No session_message received" });
      return;
    }

    const sessionMsg: SessionMessageCommand = JSON.parse(msgLine);
    if (sessionMsg.type !== "session_message") {
      emit({ type: "process_error", message: "Expected session_message" });
      return;
    }

    const prompt = parseContent(sessionMsg);
    if (!prompt) {
      emit({ type: "process_error", message: "Empty prompt" });
      return;
    }

    let currentSessionId: string | undefined = sessionIdToResume;
    let gotResult = false;

    // Run the agent
    for await (const message of query({
      prompt,
      options: {
        allowedTools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"],
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        cwd: workspace,
        resume: sessionIdToResume,
      },
    })) {
      // Capture session_id from init message
      if (message.type === "system" && (message as any).subtype === "init") {
        currentSessionId = (message as any).session_id;
        emit({ type: "session_started", session_id: currentSessionId });
      }

      // Handle result message
      if (message.type === "result") {
        gotResult = true;
        const resultMsg = message as any;
        emit({
          type: "session_complete",
          session_id: currentSessionId,
          result: {
            duration_ms: resultMsg.duration_ms,
            duration_api_ms: resultMsg.duration_api_ms,
            total_cost_usd: resultMsg.total_cost_usd,
            num_turns: resultMsg.num_turns,
          },
        });
        await callCallback("completed", currentSessionId);
      }
    }

    if (!gotResult) {
      emit({ type: "session_complete", session_id: currentSessionId, result: {} });
      await callCallback("completed", currentSessionId);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[AGENT] Exception:", errorMessage);
    emit({ type: "process_error", message: errorMessage });
    await callCallback("error", undefined, errorMessage);
  } finally {
    rl.close();
    emit({ type: "process_stopped" });
  }
}

main().catch((error) => {
  console.error("[AGENT] Fatal error:", error);
  process.exit(1);
});
`;

/**
 * Create a sandbox with the agent template
 */
export async function createSandbox(
  volumeId: string,
  conversationId: string,
  sessionId?: string
): Promise<{ sandbox: Sandbox; commandHandle: CommandHandle }> {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const sandbox = await Sandbox.create(TEMPLATE_NAME, {
    volumeId,
    volumeMountPath: "/workspace/data",
    envs: {
      ANTHROPIC_API_KEY: anthropicApiKey,
      CALLBACK_URL: `${baseUrl}/api/conversations/${conversationId}/status`,
      RESUME_SESSION_ID: sessionId || "",
    },
    timeoutMs: 30 * 60 * 1000, // 30 minutes
  });

  // Write agent code to sandbox
  await sandbox.files.write("/home/user/agent.mts", AGENT_CODE);

  // Start the agent process with tsx - it will read from stdin
  const commandHandle = await sandbox.commands.run(
    "npx tsx /home/user/agent.mts",
    {
      background: true,
      stdin: true,
      cwd: "/workspace/data",
    }
  );

  return { sandbox, commandHandle };
}

/**
 * Send a message to the sandbox agent via stdin
 */
export async function sendToAgent(
  sandbox: Sandbox,
  pid: number,
  message: Record<string, unknown>
) {
  await sandbox.commands.sendStdin(pid, JSON.stringify(message) + "\n");
}

export interface FileInfo {
  name: string;
  type: "file" | "directory";
  size?: number;
  path: string;
  children?: FileInfo[];
}

/**
 * List files in a volume directory
 */
export async function listVolumeFiles(
  volumeId: string,
  path: string
): Promise<FileInfo[]> {
  const volume = await Volume.get(volumeId);

  try {
    const files = await volume.listFiles(path);
    return files.map((f) => ({
      name: f.name,
      type: f.type,
      size: f.size,
      path: f.path,
    }));
  } catch {
    return [];
  }
}

/**
 * Build a recursive file tree from a volume
 */
export async function buildFileTree(
  volumeId: string,
  path: string = "/",
  maxDepth: number = 5
): Promise<FileInfo[]> {
  const volume = await Volume.get(volumeId);

  async function buildNode(
    currentPath: string,
    depth: number
  ): Promise<FileInfo[]> {
    if (depth > maxDepth) return [];

    try {
      const files = await volume.listFiles(currentPath);
      const result: FileInfo[] = [];

      for (const f of files) {
        const node: FileInfo = {
          name: f.name,
          type: f.type,
          size: f.size,
          path: f.path,
        };

        if (f.type === "directory") {
          node.children = await buildNode(f.path, depth + 1);
        }

        result.push(node);
      }

      // Sort: directories first, then alphabetically
      result.sort((a, b) => {
        if (a.type === "directory" && b.type !== "directory") return -1;
        if (a.type !== "directory" && b.type === "directory") return 1;
        return a.name.localeCompare(b.name);
      });

      return result;
    } catch {
      return [];
    }
  }

  return buildNode(path, 0);
}

/**
 * Read a file from a volume
 */
export async function readVolumeFile(
  volumeId: string,
  path: string
): Promise<string> {
  const volume = await Volume.get(volumeId);
  const buffer = await volume.download(path);
  return buffer.toString("utf-8");
}

/**
 * Kill a sandbox
 */
export async function killSandbox(sandboxId: string) {
  try {
    await Sandbox.kill(sandboxId);
  } catch {
    // Sandbox might already be dead
  }
}
