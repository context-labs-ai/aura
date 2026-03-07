"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export type CameraStatus =
  | "initializing"
  | "active"
  | "permission-denied"
  | "no-camera"
  | "error";

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  errorMessage: string | null;
  captureFrame: () => string | null;
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      try {
        // Try ideal constraints first, fall back to basic if OverconstrainedError
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch (constraintErr) {
          // iOS Safari and some devices reject ideal constraints —
          // fall back to basic camera request
          if (
            constraintErr instanceof DOMException &&
            (constraintErr.name === "OverconstrainedError" ||
              constraintErr.name === "NotReadableError")
          ) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
              audio: false,
            });
          } else {
            throw constraintErr;
          }
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // iOS Safari requires explicit play() — autoPlay attribute alone
          // is not reliable when srcObject is set programmatically
          try {
            await videoRef.current.play();
          } catch {
            // play() can reject if user navigates away — safe to ignore
          }
        }

        setStatus("active");
        setErrorMessage(null);
      } catch (err: unknown) {
        if (cancelled) return;

        if (err instanceof DOMException) {
          switch (err.name) {
            case "NotAllowedError":
              setStatus("permission-denied");
              setErrorMessage(
                "Camera access was denied. Please allow camera permission in your browser settings and reload the page."
              );
              break;
            case "NotFoundError":
              setStatus("no-camera");
              setErrorMessage(
                "No camera found on this device. Please connect a camera and reload."
              );
              break;
            case "OverconstrainedError":
              setStatus("error");
              setErrorMessage(
                "Camera does not support the requested resolution. Please try a different device."
              );
              break;
            default:
              setStatus("error");
              setErrorMessage(`Camera error: ${err.message}`);
          }
        } else {
          setStatus("error");
          setErrorMessage("An unexpected error occurred while accessing the camera.");
        }
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_CURRENT_DATA) {
      return null;
    }

    // Downscale to max 640px width for faster Gemini API processing
    // Full resolution (1920x1080) creates ~300KB+ base64 payloads — too slow
    const MAX_WIDTH = 640;
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.7);
  }, []);

  return { videoRef, status, errorMessage, captureFrame };
}
