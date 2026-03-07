'use client';

import type { ConnectionState } from '@/lib/live-api';

interface VoiceButtonProps {
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
}

const STATE_CONFIG: Record<
  ConnectionState,
  { label: string; color: string; bg: string; pulse: boolean }
> = {
  DISCONNECTED: {
    label: 'TAP TO TALK',
    color: '#00f0ff',
    bg: 'rgba(0,240,255,0.15)',
    pulse: false,
  },
  CONNECTING: {
    label: 'CONNECTING...',
    color: '#ffaa00',
    bg: 'rgba(255,170,0,0.15)',
    pulse: true,
  },
  CONNECTED: {
    label: 'LISTENING',
    color: '#00ff88',
    bg: 'rgba(0,255,136,0.15)',
    pulse: true,
  },
  LISTENING: {
    label: 'LISTENING',
    color: '#00ff88',
    bg: 'rgba(0,255,136,0.2)',
    pulse: true,
  },
  SPEAKING: {
    label: 'AI SPEAKING',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.2)',
    pulse: true,
  },
};

/**
 * Floating microphone button — top-right of screen.
 * Tap to connect/disconnect voice session.
 */
export default function VoiceButton({
  connectionState,
  onConnect,
  onDisconnect,
}: VoiceButtonProps) {
  const config = STATE_CONFIG[connectionState];
  const isActive = connectionState !== 'DISCONNECTED';

  return (
    <button
      onClick={isActive ? onDisconnect : onConnect}
      style={{
        position: 'fixed',
        top: 56,
        right: 16,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        border: `1px solid ${config.color}44`,
        borderRadius: 24,
        background: config.bg,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: config.color,
        fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
        fontSize: '0.6rem',
        letterSpacing: '0.08em',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        pointerEvents: 'auto',
        boxShadow: isActive ? `0 0 12px ${config.color}33` : 'none',
      }}
    >
      {/* Mic icon / indicator */}
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: config.color,
          boxShadow: `0 0 6px ${config.color}`,
          animation: config.pulse ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      />
      {config.label}
    </button>
  );
}
