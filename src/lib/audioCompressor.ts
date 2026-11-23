/**
 * Adaptive Client-Side Voice Audio Compressor
 *
 * Uses Web Audio API + @breezystack/lamejs to convert and compress call recordings:
 * - Small files (<= 400 KB): slight optimization (48 kbps mono, keeps original if smaller)
 * - Medium files (400 KB - 2 MB): 32 kbps mono voice (16 kHz)
 * - Large files (2 MB - 6 MB): 24 kbps mono voice (16 kHz)
 * - Very large files (> 6 MB): 16 kbps (or 8 kbps for marathon calls) so output stays under maxBytes
 */

export interface AdaptiveAudioResult {
  file: File;
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  durationSec: number;
  bitrateKbps: number;
  tier: "slight" | "moderate" | "strong" | "aggressive" | "kept-original";
}

function mixDownAndConvertToInt16(buffer: AudioBuffer): Int16Array {
  const length = buffer.length;
  const numChannels = buffer.numberOfChannels;
  const pcm = new Int16Array(length);

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      sum += buffer.getChannelData(ch)[i] || 0;
    }
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, numChannels)));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return pcm;
}

async function encodeMonoMp3(
  sourceBuffer: AudioBuffer,
  targetSampleRate: number,
  kbps: number
): Promise<Blob> {
  const frameCount = Math.max(1, Math.ceil(sourceBuffer.duration * targetSampleRate));
  const offlineCtx = new OfflineAudioContext(1, frameCount, targetSampleRate);
  const src = offlineCtx.createBufferSource();
  src.buffer = sourceBuffer;
  src.connect(offlineCtx.destination);
  src.start(0);

  const resampled = await offlineCtx.startRendering();
  const samples = mixDownAndConvertToInt16(resampled);

  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const encoder = new Mp3Encoder(1, targetSampleRate, kbps);

  const chunkSize = 1152;
  const mp3Parts: Uint8Array[] = [];

  for (let i = 0; i < samples.length; i += chunkSize) {
    const chunk = samples.subarray(i, i + chunkSize);
    const encoded = encoder.encodeBuffer(chunk);
    if (encoded.length > 0) {
      mp3Parts.push(new Uint8Array(encoded));
    }
  }

  const tail = encoder.flush();
  if (tail.length > 0) {
    mp3Parts.push(new Uint8Array(tail));
  }

  const blobParts: BlobPart[] = mp3Parts.map((part) => {
    const copy = new Uint8Array(part.byteLength);
    copy.set(part);
    return copy.buffer;
  });
  return new Blob(blobParts, { type: "audio/mpeg" });
}

export async function compressAudioAdaptive(
  inputFile: File,
  maxBytes: number = 3.5 * 1024 * 1024
): Promise<AdaptiveAudioResult> {
  if (typeof window === "undefined") {
    throw new Error("Audio compression is only available in the browser");
  }

  const origSize = inputFile.size;
  const baseName = inputFile.name.replace(/\.[^.]+$/, "") || "call_recording";

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    if (origSize <= maxBytes) {
      return {
        file: inputFile,
        blob: inputFile,
        originalSize: origSize,
        compressedSize: origSize,
        savingsPercent: 0,
        durationSec: 0,
        bitrateKbps: 0,
        tier: "kept-original",
      };
    }
    throw new Error("Browser does not support audio decoding for compression");
  }

  const ctx = new AudioCtx();
  try {
    const arrBuf = await inputFile.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrBuf.slice(0));
    const durationSec = decoded.duration || 1;

    // Pick initial tier based on file size
    let tier: AdaptiveAudioResult["tier"] = "slight";
    const candidates: Array<{ sampleRate: number; kbps: number }> = [];

    if (origSize <= 400 * 1024) {
      tier = "slight";
      candidates.push({ sampleRate: 22050, kbps: 48 });
    } else if (origSize <= 2 * 1024 * 1024) {
      tier = "moderate";
      candidates.push(
        { sampleRate: 16000, kbps: 32 },
        { sampleRate: 16000, kbps: 24 },
        { sampleRate: 16000, kbps: 16 }
      );
    } else if (origSize <= 6 * 1024 * 1024) {
      tier = "strong";
      candidates.push(
        { sampleRate: 16000, kbps: 24 },
        { sampleRate: 16000, kbps: 16 },
        { sampleRate: 11025, kbps: 16 }
      );
    } else {
      tier = "aggressive";
      candidates.push(
        { sampleRate: 16000, kbps: 16 },
        { sampleRate: 11025, kbps: 16 },
        { sampleRate: 8000, kbps: 8 }
      );
    }

    // Filter out presets mathematically guaranteed to exceed maxBytes (kbps * 125 * sec)
    const viable = candidates.filter((c) => {
      const estBytes = c.kbps * 125 * durationSec;
      return estBytes <= maxBytes * 0.98 || c.kbps === 8;
    });
    const plan = viable.length > 0 ? viable : [{ sampleRate: 8000, kbps: 8 }];

    let bestBlob: Blob | null = null;
    let usedKbps = plan[0].kbps;

    for (const preset of plan) {
      const encoded = await encodeMonoMp3(decoded, preset.sampleRate, preset.kbps);
      bestBlob = encoded;
      usedKbps = preset.kbps;
      if (encoded.size <= maxBytes) {
        break;
      }
    }

    if (!bestBlob || (bestBlob.size >= origSize && origSize <= maxBytes)) {
      return {
        file: inputFile,
        blob: inputFile,
        originalSize: origSize,
        compressedSize: origSize,
        savingsPercent: 0,
        durationSec,
        bitrateKbps: 0,
        tier: "kept-original",
      };
    }

    const outFile = new File([bestBlob], `${baseName}.mp3`, { type: "audio/mpeg" });
    return {
      file: outFile,
      blob: bestBlob,
      originalSize: origSize,
      compressedSize: outFile.size,
      savingsPercent: origSize > 0 ? Math.max(0, Math.round(((origSize - outFile.size) / origSize) * 100)) : 0,
      durationSec,
      bitrateKbps: usedKbps,
      tier,
    };
  } finally {
    try {
      await ctx.close();
    } catch {}
  }
}
