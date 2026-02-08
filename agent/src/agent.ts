#!/usr/bin/env node
/**
 * 고민뭐하니 Agent — Claude Agent SDK integration for Moru sandbox.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import * as readline from "readline";
import { execSync } from "child_process";

// ============================================================================
// System Prompt — 압축 버전
// ============================================================================

const SYSTEM_PROMPT = `너는 "고민뭐하니" 라디오 토크쇼 AI. 고민 받으면 패널들이 자연스럽게 대화하며 조언해.

MC + 패널 4명:
🎙️ 유재석(MC): 국민MC. 편안+따뜻+리액션왕. "고민러님~" 호칭. 오프닝에서 사연 공감, 마무리에 핵심 정리. 필요시만 중재. "이야~ 이건 정말..."
😎 침착맨: 만화가·유튜버. 침착+논리+유머. 게임·만화 비유. "마비노기로 치면...", "스킬트리를 잘못 찍은 거". 핵심을 침착하게 찌름.
⚽ 손흥민: 토트넘 주장. 겸손+성실. "아버지가 항상 말씀하셨는데..." 축구 비유. 노력의 가치.
🚀 일론 머스크: Tesla·SpaceX. 괴짜+도발. 제1원리 사고. "왜 안 돼?", 엉뚱한 비유.
🎤 이영지: 래퍼·예능인. MZ 직설. "솔직히 님이 결정할 문제", "와 레전드". 어른들에게 "그건 옛날 얘기" 도발.

규칙:
- 패널끼리 이름 부르며 자유 반응 (동의/반박/유머)
- 1발언 = 2~3문장 짧게
- 총 8~10발언 (MC 포함). 빠르고 임팩트 있게
- 4명 전원 최소 1회 발언
- 한국어, 마크다운 금지 (순수 텍스트+이모지만)

형식 (발언 사이 빈 줄):
🎙️ 유재석: [오프닝]

😎 침착맨: [발언]

⚽ 손흥민: [발언]

🎙️ 유재석: [마무리]`;

// ============================================================================
// Infrastructure
// ============================================================================

function debug(msg: string, data?: any): void {
  const ts = new Date().toISOString();
  console.error(data !== undefined ? `[${ts}] ${msg}: ${JSON.stringify(data)}` : `[${ts}] ${msg}`);
}

interface AgentMessage { type: string; session_id?: string; message?: string; result?: any; }

function emit(msg: AgentMessage): void { console.log(JSON.stringify(msg)); }

function parseContent(msg: any): string {
  if (msg.text) return msg.text;
  if (msg.content) return msg.content.filter((b: any) => b.type === "text" && b.text).map((b: any) => b.text).join("\n");
  return "";
}

class LineReader {
  private lines: string[] = [];
  private resolvers: ((line: string | null) => void)[] = [];
  private closed = false;
  constructor(rl: readline.Interface) {
    rl.on("line", (l) => this.resolvers.length > 0 ? this.resolvers.shift()!(l) : this.lines.push(l));
    rl.on("close", () => { this.closed = true; while (this.resolvers.length) this.resolvers.shift()!(null); });
  }
  async readLine(): Promise<string | null> {
    if (this.lines.length > 0) return this.lines.shift()!;
    if (this.closed) return null;
    return new Promise((r) => this.resolvers.push(r));
  }
}

function flushVolume(): void {
  try { execSync("sync", { timeout: 10_000 }); } catch {}
}

async function callCallback(status: "completed" | "error", sessionId?: string, errorMessage?: string) {
  const url = process.env.CALLBACK_URL;
  if (!url) return;
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, sessionId, errorMessage }) });
    if (!r.ok) console.error(`Callback failed: ${r.status}`);
  } catch (e) { console.error("Callback error:", e); }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const workspace = process.env.WORKSPACE_DIR || process.cwd();
  const resumeSessionId = process.env.RESUME_SESSION_ID || undefined;

  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  const reader = new LineReader(rl);

  try {
    const startLine = await reader.readLine();
    if (!startLine) { emit({ type: "process_error", message: "No input" }); return; }
    const startMsg = JSON.parse(startLine);
    if (startMsg.type !== "process_start") { emit({ type: "process_error", message: "Expected process_start" }); return; }

    const sessionIdToResume = startMsg.session_id || resumeSessionId;
    emit({ type: "process_ready", session_id: sessionIdToResume || "pending" });

    const msgLine = await reader.readLine();
    if (!msgLine) { emit({ type: "process_error", message: "No message" }); return; }
    const sessionMsg = JSON.parse(msgLine);
    if (sessionMsg.type !== "session_message") { emit({ type: "process_error", message: "Expected session_message" }); return; }

    const userWorry = parseContent(sessionMsg);
    if (!userWorry) { emit({ type: "process_error", message: "Empty prompt" }); return; }

    const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n고민러님의 사연:\n${userWorry}`;

    let currentSessionId: string | undefined = sessionIdToResume;
    let gotResult = false;

    debug("Starting query", { worry: userWorry.substring(0, 80) });

    for await (const message of query({
      prompt: fullPrompt,
      options: {
        allowedTools: [],
        maxTurns: 1,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        cwd: workspace,
        resume: sessionIdToResume,
      },
    })) {
      if (message.type === "system" && (message as any).subtype === "init") {
        currentSessionId = (message as any).session_id;
        emit({ type: "session_started", session_id: currentSessionId });
      }

      if ("result" in message && message.type === "result") {
        gotResult = true;
        const r = message as any;
        emit({ type: "session_complete", session_id: currentSessionId, result: { duration_ms: r.duration_ms, duration_api_ms: r.duration_api_ms, total_cost_usd: r.total_cost_usd, num_turns: r.num_turns } });
        flushVolume();
        await callCallback("completed", currentSessionId);
      }
    }

    if (!gotResult) {
      emit({ type: "session_complete", session_id: currentSessionId, result: {} });
      flushVolume();
      await callCallback("completed", currentSessionId);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Exception:", msg);
    emit({ type: "process_error", message: msg });
    flushVolume();
    await callCallback("error", undefined, msg);
  } finally {
    rl.close();
    emit({ type: "process_stopped" });
  }
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
