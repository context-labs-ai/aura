"use client";

import React, { forwardRef, useImperativeHandle } from "react";
import { useCamera } from "@/hooks/useCamera";

export interface CameraFeedHandle {
  captureFrame: () => string | null;
  flipCamera: () => void;
}

interface CameraFeedProps {
  className?: string;
}

const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(function CameraFeed(
  { className },
  ref,
) {
  const { videoRef, status, errorMessage, captureFrame, toggleFacingMode } = useCamera();

  useImperativeHandle(
    ref,
    () => ({
      captureFrame,
      flipCamera: toggleFacingMode,
    }),
    [captureFrame, toggleFacingMode],
  );

  if (status === "permission-denied" || status === "no-camera" || status === "error") {
    return (
      <div className={`rb-camera-fallback ${className ?? ""}`.trim()} role="status" aria-live="polite">
        <h3 className="rb-camera-fallback__title">
          {status === "permission-denied"
            ? "Camera Access Required"
            : status === "no-camera"
              ? "No Camera Found"
              : "Camera Error"}
        </h3>
        <p className="rb-camera-fallback__body">{errorMessage}</p>
      </div>
    );
  }

  return <video ref={videoRef} autoPlay playsInline muted className={className} />;
});

export default CameraFeed;
