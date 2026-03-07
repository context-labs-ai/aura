'use client';

import type { ConnectionState } from '@/lib/live-api';

interface VoiceButtonProps {
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
}

const STATE_CONFIG: Record<
  ConnectionState,
  { label: string; accent: string; pulse: boolean }
> = {
  DISCONNECTED: {
    label: 'Voice',
    accent: 'rgba(179, 248, 255, 0.7)',
    pulse: false,
  },
  CONNECTING: {
    label: 'Connecting',
    accent: '#ffb79d',
    pulse: true,
  },
  CONNECTED: {
    label: 'Listening',
    accent: '#00ff88',
    pulse: true,
  },
  LISTENING: {
    label: 'Listening',
    accent: '#00ff88',
    pulse: true,
  },
  SPEAKING: {
    label: 'AI Speaking',
    accent: '#c084fc',
    pulse: true,
  },
};

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
      className="rb-mode-badge"
      style={{
        position: 'fixed',
        top: 'max(16px, env(safe-area-inset-top, 16px))',
        right: 16,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        minHeight: 32,
        background: isActive
          ? 'linear-gradient(180deg, rgba(8, 14, 24, 0.85), rgba(8, 14, 24, 0.95))'
          : 'rgba(8, 14, 24, 0.7)',
        borderColor: isActive
          ? `${config.accent}44`
          : 'rgba(179, 248, 255, 0.16)',
        color: isActive ? config.accent : 'rgba(255,243,237,0.6)',
        cursor: 'pointer',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        pointerEvents: 'auto',
        transition: 'all 0.2s ease',
        boxShadow: isActive ? `0 0 12px ${config.accent}22` : 'none',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: config.accent,
          boxShadow: isActive ? `0 0 6px ${config.accent}` : 'none',
          animation: config.pulse ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      />
      {config.label}
    </button>
  );
}
