"use client";

import { GoogleGenAI, Modality, Type, type LiveServerMessage, type Session, type FunctionDeclaration } from "@google/genai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "SPEAKING"
  | "LISTENING";

export interface LiveAPICallbacks {
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
  onAnalysisRequested?: () => void;
}

const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

const SYSTEM_INSTRUCTION = [
  'You are an expert analyst assistant for a camera-based reality browser app.',
  'You are AUDIO ONLY -- you cannot see the camera directly.',
  'However, you have a tool called "analyze_scene" that triggers the camera to analyze what it currently sees.',
  '',
  'CAPABILITIES:',
  '- You can call the analyze_scene tool to scan and identify what the camera is pointing at.',
  '- After analysis completes, you will receive a SCENE CONTEXT UPDATE with the results.',
  '- You have Google Search enabled for real-time information lookup.',
  '',
  'WHEN TO USE analyze_scene:',
  '- User says "analyze this", "what is this?", "scan this", "what am I looking at?", "help me analyze", or similar requests.',
  '- Call analyze_scene ONCE, then wait for the scene context update before responding.',
  '- After calling the tool, say something brief like "Scanning now..." or "Let me take a look."',
  '',
  'RULES:',
  '1. If the user asks about the scene and you have NO context yet, call analyze_scene first.',
  '2. If you HAVE recent context, answer based on that context. Do NOT re-analyze unless asked.',
  '3. NEVER hallucinate or invent what might be in the scene. Only discuss what the scene context tells you.',
  '4. Keep responses concise -- 1-3 sentences. You are a real-time assistant, not a lecturer.',
  '5. Be professional and data-driven in tone.',
  '6. Use Google Search for product details, pricing, reviews, or factual lookups.',
].join('\n');

// Output audio from the API is 24 kHz PCM
const OUTPUT_SAMPLE_RATE = 24000;

// Target sample rate for mic input to Live API
const MIC_SAMPLE_RATE = 16000;

// Function declaration for scene analysis tool
const ANALYZE_SCENE_DECLARATION: FunctionDeclaration = {
  name: 'analyze_scene',
  description: 'Analyze what the camera is currently pointing at. Triggers the vision AI to capture and identify the current scene -- building, product, or object. Call this when the user asks to analyze, scan, or identify something.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

// ---------------------------------------------------------------------------
// Audio playback helper – schedules base64 PCM chunks seamlessly
// ---------------------------------------------------------------------------

class AudioPlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;

  async play(base64Pcm: string): Promise<void> {
    if (!this.ctx || this.ctx.state === "closed") {
      // Safari may not support custom sampleRate -- use default then resample
      try {
        this.ctx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      } catch {
        this.ctx = new AudioContext();
      }
      this.nextStartTime = this.ctx.currentTime;
    }

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    const float32 = base64PcmToFloat32(base64Pcm);

    // If AudioContext sample rate differs from source, we need to play at the right rate
    const buffer = this.ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(new Float32Array(float32), 0);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    if (this.nextStartTime < this.ctx.currentTime) {
      this.nextStartTime = this.ctx.currentTime;
    }
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  stop(): void {
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.nextStartTime = 0;
  }
}

// ---------------------------------------------------------------------------
// PCM conversion helpers
// ---------------------------------------------------------------------------

function base64PcmToFloat32(base64: string): Float32Array {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  const length = bytes.length / 2;
  const float32 = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sample = bytes[i * 2] | (bytes[i * 2 + 1] << 8);
    if (sample >= 32768) sample -= 65536;
    float32[i] = sample / 32768;
  }
  return float32;
}

function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Downsample a Float32Array from sourceSampleRate to targetSampleRate
 * using simple linear interpolation.
 */
function downsample(input: Float32Array, sourceSampleRate: number, targetSampleRate: number): Float32Array {
  if (sourceSampleRate === targetSampleRate) return input;
  const ratio = sourceSampleRate / targetSampleRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const low = Math.floor(srcIndex);
    const high = Math.min(low + 1, input.length - 1);
    const frac = srcIndex - low;
    output[i] = input[low] * (1 - frac) + input[high] * frac;
  }
  return output;
}

/**
 * Convert Float32 samples to 16-bit PCM Int16Array
 */
function float32ToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
  }
  return output;
}

// ---------------------------------------------------------------------------
// LiveAPIClient
// ---------------------------------------------------------------------------

export class LiveAPIClient {
  private session: Session | null = null;
  private audioPlayer = new AudioPlayer();
  private state: ConnectionState = "DISCONNECTED";
  private callbacks: LiveAPICallbacks;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  constructor(callbacks: LiveAPICallbacks = {}) {
    this.callbacks = callbacks;
  }

  // ---- public API ----

  get connectionState(): ConnectionState {
    return this.state;
  }

  async connect(): Promise<void> {
    if (this.session) return;

    this.shouldReconnect = true;
    this.setState("CONNECTING");

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
      });

      const session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          tools: [{ googleSearch: {} }, { functionDeclarations: [ANALYZE_SCENE_DECLARATION] }],
        },
        callbacks: {
          onopen: () => {
            this.setState("CONNECTED");
          },
          onmessage: (msg: LiveServerMessage) => {
            this.handleMessage(msg);
          },
          onerror: (e: unknown) => {
            console.error("[LiveAPI] WebSocket error:", e);
            this.callbacks.onError?.(
              e instanceof Error ? e : new Error(String(e))
            );
          },
          onclose: () => {
            this.handleDisconnect();
          },
        },
      });

      this.session = session;
    } catch (err) {
      this.setState("DISCONNECTED");
      this.callbacks.onError?.(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanup();
  }

  /**
   * Stream raw mic audio to the Live API.
   * @param pcmBase64 base64-encoded 16-bit PCM at 16 kHz mono
   */
  sendAudio(pcmBase64: string): void {
    if (!this.session || this.state === "DISCONNECTED" || this.state === "CONNECTING") return;
    try {
      this.session.sendRealtimeInput({
        media: {
          mimeType: "audio/pcm;rate=16000",
          data: pcmBase64,
        },
      });
    } catch {
      // Connection may have closed between the check and the send
    }
  }

  /**
   * Send text context about the current scene so the AI knows what the camera
   * is pointing at. Does NOT trigger a spoken response by itself; the AI will
   * use it to enrich answers when the user speaks.
   */
  updateContext(text: string): void {
    if (!this.session || this.state === "DISCONNECTED" || this.state === "CONNECTING") return;
    try {
      this.session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [
              {
                text: `[SCENE CONTEXT UPDATE -- do not respond to this, just absorb it for future questions]\n${text}`,
              },
            ],
          },
        ],
        turnComplete: true,
      });
    } catch {
      // Swallow -- connection may have dropped
    }
  }

  // ---- internals ----

  private setState(next: ConnectionState): void {
    if (this.state === next) return;
    this.state = next;
    this.callbacks.onStateChange?.(next);
  }

  private handleMessage(msg: LiveServerMessage): void {
    try {
      // The SDK delivers typed LiveServerMessage objects.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = msg as any;

      // Check for tool calls (function calling)
      const toolCall = data?.toolCall;
      if (toolCall?.functionCalls) {
        for (const fc of toolCall.functionCalls) {
          if (fc.name === 'analyze_scene') {
            // Trigger analysis in the UI
            this.callbacks.onAnalysisRequested?.();

            // Send tool response back to Gemini so it knows the tool was executed
            if (this.session) {
              try {
                this.session.sendToolResponse({
                  functionResponses: [{
                    id: fc.id,
                    name: fc.name,
                    response: { status: 'triggered', message: 'Analysis started. Scene context will be sent when ready.' },
                  }],
                });
              } catch {
                // Connection may have dropped
              }
            }
          }
        }
      }

      // Check for audio in serverContent
      const serverContent = data?.serverContent;
      if (serverContent) {
        const parts = serverContent.modelTurn?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith("audio/")) {
              this.setState("SPEAKING");
              this.audioPlayer.play(part.inlineData.data).catch(() => {});
            }
          }
        }
        // When the server signals turn completion, switch to LISTENING
        if (serverContent.turnComplete) {
          this.setState("LISTENING");
        }
      }

      // Handle GoAway
      if (data?.goAway || data?.setupComplete) {
        if (data.setupComplete) {
          this.setState("LISTENING");
        }
      }
    } catch {
      // Ignore parse errors -- not all messages are audio
    }
  }

  private handleDisconnect(): void {
    this.cleanup();
    if (this.shouldReconnect) {
      // Auto-reconnect after a brief delay
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect().catch(() => {});
      }, 2000);
    }
  }

  private cleanup(): void {
    this.audioPlayer.stop();
    if (this.session) {
      try {
        this.session.close();
      } catch {
        // Already closed
      }
      this.session = null;
    }
    this.setState("DISCONNECTED");
  }
}

// ---------------------------------------------------------------------------
// Mic audio capture -- returns a controller to start/stop streaming PCM chunks
// ---------------------------------------------------------------------------

export interface MicController {
  stop: () => void;
}

/**
 * Captures microphone audio, downsamples to 16 kHz mono 16-bit PCM,
 * and calls `onChunk` with base64-encoded PCM data.
 *
 * Uses AudioWorklet where supported, falls back to ScriptProcessorNode
 * for Safari/iOS which doesn't support AudioWorklet from Blob URLs.
 */
export async function startMicCapture(
  onChunk: (base64Pcm: string) => void
): Promise<MicController> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Safari doesn't support custom sampleRate on AudioContext --
  // create with default rate, then downsample in the processor
  let audioContext: AudioContext;
  try {
    audioContext = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
  } catch {
    audioContext = new AudioContext(); // fallback: native rate (e.g., 48kHz)
  }

  const source = audioContext.createMediaStreamSource(stream);
  const nativeSampleRate = audioContext.sampleRate;

  // Try AudioWorklet first (Chrome, Firefox), fall back to ScriptProcessorNode (Safari)
  let cleanup: () => void;

  const useWorklet = await tryAudioWorklet(audioContext, source, nativeSampleRate, onChunk);

  if (useWorklet) {
    cleanup = useWorklet;
  } else {
    // ScriptProcessorNode fallback for Safari/iOS
    cleanup = useScriptProcessor(audioContext, source, nativeSampleRate, onChunk);
  }

  return {
    stop: () => {
      cleanup();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      audioContext.close().catch(() => {});
    },
  };
}

/**
 * Try to set up AudioWorklet-based capture.
 * Returns a cleanup function on success, null if AudioWorklet is unsupported.
 */
async function tryAudioWorklet(
  audioContext: AudioContext,
  source: MediaStreamAudioSourceNode,
  nativeSampleRate: number,
  onChunk: (base64Pcm: string) => void,
): Promise<(() => void) | null> {
  try {
    const workletCode = `
class PcmRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(4096);
    this.writeIndex = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.writeIndex++] = channel[i];
      if (this.writeIndex >= this.buffer.length) {
        this.port.postMessage({ samples: this.buffer.slice(0, this.writeIndex) });
        this.writeIndex = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-recorder-processor', PcmRecorderProcessor);
`;

    const blob = new Blob([workletCode], { type: "application/javascript" });
    const workletUrl = URL.createObjectURL(blob);

    await audioContext.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    const workletNode = new AudioWorkletNode(audioContext, "pcm-recorder-processor");
    workletNode.port.onmessage = (e: MessageEvent) => {
      const float32Samples: Float32Array = e.data.samples;
      const downsampled = downsample(float32Samples, nativeSampleRate, MIC_SAMPLE_RATE);
      const int16 = float32ToInt16(downsampled);
      onChunk(arrayBufferToBase64(int16.buffer));
    };

    source.connect(workletNode);
    workletNode.connect(audioContext.destination);

    return () => {
      workletNode.disconnect();
    };
  } catch {
    // AudioWorklet not supported or blob URL rejected (Safari)
    return null;
  }
}

/**
 * ScriptProcessorNode fallback for Safari/iOS.
 * Deprecated API but universally supported.
 */
function useScriptProcessor(
  audioContext: AudioContext,
  source: MediaStreamAudioSourceNode,
  nativeSampleRate: number,
  onChunk: (base64Pcm: string) => void,
): () => void {
  // bufferSize must be power of 2: 4096 gives ~85ms chunks at 48kHz
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (e: AudioProcessingEvent) => {
    const input = e.inputBuffer.getChannelData(0);
    const downsampled = downsample(input, nativeSampleRate, MIC_SAMPLE_RATE);
    const int16 = float32ToInt16(downsampled);
    onChunk(arrayBufferToBase64(int16.buffer));
  };

  source.connect(processor);
  processor.connect(audioContext.destination); // required to keep processing alive

  return () => {
    processor.disconnect();
  };
}
