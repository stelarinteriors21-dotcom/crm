import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { recordingUrl } = await req.json();

  if (!recordingUrl) {
    return NextResponse.json({ error: "No recording URL provided" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured. Please add it to Vercel environment variables." }, { status: 503 });
  }

  try {
    const audioResponse = await fetch(recordingUrl);
    if (!audioResponse.ok) {
      return NextResponse.json({ error: "Could not fetch recording file" }, { status: 400 });
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.mp3");
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      return NextResponse.json({ error: `Whisper API error: ${err}` }, { status: 500 });
    }

    const data = await whisperRes.json();
    return NextResponse.json({ transcript: data.text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Transcription failed" }, { status: 500 });
  }
}
