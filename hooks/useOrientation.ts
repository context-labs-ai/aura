"use client";

import { useCallback, useEffect, useState } from "react";

export type OrientationState = "idle" | "granted" | "denied" | "unsupported";

type OrientationWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

interface OrientationResult {
  heading: number | null;
  state: OrientationState;
  requestPermission: () => Promise<void>;
}

function normalizeHeading(alpha: number | null): number | null {
  if (alpha === null || Number.isNaN(alpha)) return null;
  const normalized = (360 - alpha) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function useOrientation(): OrientationResult {
  const [heading, setHeading] = useState<number | null>(null);
  const [state, setState] = useState<OrientationState>("idle");

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const withCompass = event as OrientationWithCompass;
    if (typeof withCompass.webkitCompassHeading === "number") {
      setHeading(withCompass.webkitCompassHeading);
      return;
    }

    const normalized = normalizeHeading(event.alpha);
    if (normalized !== null) {
      setHeading(normalized);
    }
  }, []);

  const subscribe = useCallback(() => {
    window.addEventListener("deviceorientation", handleOrientation);
  }, [handleOrientation]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") {
      setState("unsupported");
      return;
    }

    type OrientationPermissionEvent = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    const permissionEvent = DeviceOrientationEvent as OrientationPermissionEvent;

    if (permissionEvent.requestPermission) {
      try {
        const result = await permissionEvent.requestPermission();
        if (result === "granted") {
          setState("granted");
          subscribe();
        } else {
          setState("denied");
        }
      } catch {
        setState("denied");
      }
      return;
    }

    setState("granted");
    subscribe();
  }, [subscribe]);

  useEffect(() => {
    requestPermission();

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [handleOrientation, requestPermission]);

  return { heading, state, requestPermission };
}
