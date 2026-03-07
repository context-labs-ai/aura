"use client";

import React, { forwardRef, useImperativeHandle } from "react";
import { useCamera } from "@/hooks/useCamera";

export interface CameraFeedHandle {
  captureFrame: () => string | null;
}

const CameraFeed = forwardRef<CameraFeedHandle>(function CameraFeed(_, ref) {
  const { videoRef, status, errorMessage, captureFrame } = useCamera();

  useImperativeHandle(ref, () => ({ captureFrame }), [captureFrame]);

  if (status === "permission-denied" || status === "no-camera" || status === "error") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "3rem",
            marginBottom: "1rem",
          }}
        >
          {status === "permission-denied" ? "🔒" : status === "no-camera" ? "📷" : "⚠️"}
        </div>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
            margin: 0,
          }}
        >
          {status === "permission-denied"
            ? "Camera Access Required"
            : status === "no-camera"
              ? "No Camera Found"
              : "Camera Error"}
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
