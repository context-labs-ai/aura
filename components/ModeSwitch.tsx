'use client';

import type { ModeSelection } from '@/hooks/useMode';

interface ModeSwitchProps {
  selection: ModeSelection;
  onSelect: (mode: ModeSelection) => void;
}

const MODES: { value: ModeSelection; label: string; icon: string }[] = [
  { value: 'auto', label: 'AUTO', icon: '🔍' },
  { value: 'building', label: 'BUILDING', icon: '🏢' },
  { value: 'product', label: 'PRODUCT', icon: '📦' },
];

/**
 * Bottom-center mode switcher — 3 pill buttons.
 * Fully transparent to touch events except on the buttons themselves.
 */
export default function ModeSwitch({ selection, onSelect }: ModeSwitchProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'env(safe-area-inset-bottom, 16px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        display: 'flex',
        gap: 6,
        padding: '4px 6px',
        background: 'rgba(0,0,0,0.6)',
        borderRadius: 24,
        border: '1px solid rgba(0,240,255,0.2)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        pointerEvents: 'auto',
      }}
    >
      {MODES.map((m) => {
        const active = selection === m.value;
        return (
          <button
            key={m.value}
            onClick={() => onSelect(m.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              border: 'none',
              borderRadius: 20,
              background: active ? 'rgba(0,240,255,0.2)' : 'transparent',
              color: active ? '#00f0ff' : 'rgba(255,255,255,0.5)',
              fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              boxShadow: active ? '0 0 8px rgba(0,240,255,0.3)' : 'none',
            }}
          >
            <span style={{ fontSize: '0.75rem' }}>{m.icon}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
