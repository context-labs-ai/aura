"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export type CameraStatus =
  | "initializing"
  | "active"
  | "permission-denied"
  | "no-camera"
  | "error";

export type CameraFacingMode = "environment" | "user";

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  errorMessage: string | null;
  captureFrame: () => string | null;
  facingMode: CameraFacingMode;
  toggleFacingMode: () => void;
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>("environment");

  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      setStatus("initializing");
      setErrorMessage(null);

      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        let stream: MediaStream;

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch (constraintErr) {
          if (
            constraintErr instanceof DOMException &&
            (constraintErr.name === "OverconstrainedError" ||
              constraintErr.name === "NotReadableError")
          ) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode },
              audio: false,
            });
          } else {
            throw constraintErr;
          }
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // Ignore play() failures caused by navigation/context switches.
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
                "Camera access was denied. Allow permission in browser settings and reload."
              );
              break;
            case "NotFoundError":
              setStatus("no-camera");
              setErrorMessage(
                "No camera found on this device. Connect a camera and reload."
              );
              break;
            case "OverconstrainedError":
              setStatus("error");
              setErrorMessage(
                "Camera does not support the requested resolution. Try another device."
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
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_CURRENT_DATA) {
      return null;
    }

    const MAX_WIDTH = 640;
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.7);
  }, []);

  const toggleFacingMode = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  return { videoRef, status, errorMessage, captureFrame, facingMode, toggleFacingMode };
}
