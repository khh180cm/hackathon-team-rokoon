import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text, voiceId } = await req.json();

  if (!text || !voiceId) {
    return NextResponse.json(
      { error: "text and voiceId are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured" },
      { status: 500 }
    );
  }

  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    return NextResponse.json(
      { error: `ElevenLabs API error: ${resp.status}`, detail: errText },
      { status: resp.status }
    );
  }

  const audioBuffer = await resp.arrayBuffer();

  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
