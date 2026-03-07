'use client';

import { useState } from 'react';

interface DecompositionImageProps {
  /** Base64 PNG image data (no data URI prefix) */
  imageBase64: string;
  /** Description from the model */
  description: string;
  /** Close handler */
  onClose: () => void;
}

/**
 * Full-screen overlay that displays an AI-generated exploded/decomposition
 * diagram of the product the user is looking at.
 */
export default function DecompositionImage({
  imageBase64,
  description,
  onClose,
}: DecompositionImageProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="decomp-image-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'scaleIn 0.3s ease-out',
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 'env(safe-area-inset-top, 16px)',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          style={{
            fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
            fontSize: '0.7rem',
            letterSpacing: '0.12em',
            color: 'var(--hud-cyan, #00f0ff)',
            textTransform: 'uppercase',
          }}
        >
          ◇ STRUCTURAL DECOMPOSITION
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* Image */}
      <img
        src={`data:image/png;base64,${imageBase64}`}
        alt="Product decomposition diagram"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        style={{
          maxWidth: expanded ? '100%' : '90%',
          maxHeight: expanded ? '85vh' : '65vh',
          objectFit: 'contain',
          borderRadius: 8,
          border: '1px solid rgba(0,240,255,0.2)',
          boxShadow: '0 0 30px rgba(0,240,255,0.1)',
          transition: 'all 0.3s ease',
          cursor: 'zoom-in',
        }}
      />

      {/* Description */}
      {description && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 16,
            maxWidth: '90%',
            padding: '12px 16px',
            background: 'rgba(0,240,255,0.05)',
            border: '1px solid rgba(0,240,255,0.15)',
            borderRadius: 8,
            fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
            maxHeight: '15vh',
            overflowY: 'auto',
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}
