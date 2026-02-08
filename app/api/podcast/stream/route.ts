import Anthropic from "@anthropic-ai/sdk";
import { StreamingTurnParser } from "@/lib/stream-parser";
import { getSystemPrompt, buildUserMessage } from "@/lib/system-prompt";

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { worry, mutedIds = [] } = (await req.json()) as {
      worry: string;
      mutedIds?: string[];
    };

    if (!worry || typeof worry !== "string") {
      return new Response(JSON.stringify({ error: "worry is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parser = new StreamingTurnParser();

    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: getSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildUserMessage(worry, mutedIds),
        },
      ],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = event.delta.text;
              const events = parser.feed(chunk);

              for (const evt of events) {
                const sseData = `event: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              }
            }
          }

          // Flush remaining
          const remaining = parser.flush();
          for (const evt of remaining) {
            const sseData = `event: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }

          // Send done event
          controller.enqueue(
            encoder.encode(`event: done\ndata: {}\n\n`)
          );
          controller.close();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("Stream error:", errMsg, err);
          const errorData = `event: error\ndata: ${JSON.stringify({ error: errMsg })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("API error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
