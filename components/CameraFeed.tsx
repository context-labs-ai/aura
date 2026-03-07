"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback, useEffect } from "react";
import { useCamera } from "@/hooks/useCamera";

export interface CameraFeedHandle {
  captureFrame: () => string | null;
}

const DEMO_IMAGE_URL = "/images/mbs-demo.jpg";

const CameraFeed = forwardRef<CameraFeedHandle>(function CameraFeed(_, ref) {
  const { videoRef, status, errorMessage, captureFrame: captureFromCamera } = useCamera();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [staticImageSrc, setStaticImageSrc] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Capture frame from static image when no camera
  const captureFromImage = useCallback((): string | null => {
    const img = imgRef.current;
    if (!img || !imageLoaded) return null;

    const MAX_WIDTH = 640;
    const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.7);
  }, [imageLoaded]);

  // Auto-load demo image when no camera
  useEffect(() => {
    if (status === "no-camera" || status === "permission-denied" || status === "error") {
      setStaticImageSrc(DEMO_IMAGE_URL);
    }
  }, [status]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setStaticImageSrc(reader.result as string);
      setImageLoaded(false);
    };
    reader.readAsDataURL(file);
  }, []);

  // Pick capture method based on status
  const captureFrame = useCallback((): string | null => {
    if (status === "active") {
      return captureFromCamera();
    }
    return captureFromImage();
  }, [status, captureFromCamera, captureFromImage]);

  useImperativeHandle(ref, () => ({ captureFrame }), [captureFrame]);

  // Camera unavailable — show static image mode
  if (status === "permission-denied" || status === "no-camera" || status === "error") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundColor: "#0a0a0a",
        }}
      >
        {/* Static image as background (like camera feed) */}
        {staticImageSrc && (
          <img
            ref={imgRef}
            src={staticImageSrc}
            alt="Demo scene"
            onLoad={() => setImageLoaded(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* Overlay controls for image mode */}
        <div
          style={{
            position: "absolute",
            top: "max(12px, env(safe-area-inset-top))",
            right: 12,
            zIndex: 30,
            display: "flex",
            gap: 8,
            pointerEvents: "auto",
          }}
        >
          {/* Load custom image button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "6px 12px",
              border: "1px solid rgba(0,240,255,0.4)",
              borderRadius: 16,
              background: "rgba(0,0,0,0.6)",
              color: "var(--hud-cyan, #00f0ff)",
              fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
              fontSize: "0.55rem",
              letterSpacing: "0.08em",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              textTransform: "uppercase",
            }}
          >
            📷 LOAD IMAGE
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>

        {/* Status indicator */}
        {!staticImageSrc && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              {status === "permission-denied" ? "🔒" : "📷"}
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
              {status === "permission-denied" ? "Camera Access Required" : "No Camera Found"}
            </h2>
            <p
              style={{
                fontSize: "0.9rem",
                color: "#aaaaaa",
                maxWidth: "320px",
                lineHeight: 1.5,
                margin: "0.75rem 0 0 0",
              }}
            >
              {errorMessage}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        objectFit: "cover",
        zIndex: 0,
      }}
    />
  );
});

export default CameraFeed;
