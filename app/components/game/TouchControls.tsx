"use client";

import React from "react";

type TouchControlsProps = {
  keys: Record<string, boolean>;
  onJumpPress: () => void;
  onMuteToggle: () => void;
  onRestart: () => void;
  isGameOver: boolean;
};

const btnStyle: React.CSSProperties = {
  position: "absolute",
  background: "rgba(255, 255, 255, 0.15)",
  border: "2px solid rgba(255, 255, 255, 0.4)",
  borderRadius: 12,
  color: "white",
  fontSize: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  userSelect: "none",
  touchAction: "none",
  WebkitTapHighlightColor: "transparent",
  cursor: "pointer",
};

export default function TouchControls({ keys, onJumpPress, onMuteToggle, onRestart, isGameOver }: TouchControlsProps) {
  const makeHandlers = (key: string) => ({
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); keys[key] = true; },
    onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); keys[key] = false; },
    onTouchCancel: (e: React.TouchEvent) => { e.preventDefault(); keys[key] = false; },
  });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Left / Right movement — bottom left */}
      <button
        {...makeHandlers("a")}
        style={{ ...btnStyle, left: "env(safe-area-inset-left, 16px)", bottom: 100, width: 70, height: 70, pointerEvents: "auto" }}
        aria-label="Move left"
      >
        ←
      </button>
      <button
        {...makeHandlers("d")}
        style={{ ...btnStyle, left: "calc(env(safe-area-inset-left, 0px) + 100px)", bottom: 100, width: 70, height: 70, pointerEvents: "auto" }}
        aria-label="Move right"
      >
        →
      </button>

      {/* Jump + Shoot — bottom right */}
      <button
        onTouchStart={(e: React.TouchEvent) => { e.preventDefault(); keys["w"] = true; onJumpPress(); }}
        onTouchEnd={(e: React.TouchEvent) => { e.preventDefault(); keys["w"] = false; }}
        onTouchCancel={(e: React.TouchEvent) => { e.preventDefault(); keys["w"] = false; }}
        style={{ ...btnStyle, right: "calc(env(safe-area-inset-right, 0px) + 16px)", bottom: 180, width: 70, height: 70, pointerEvents: "auto" }}
        aria-label="Jump"
      >
        ↑
      </button>
      <button
        {...makeHandlers(" ")}
        style={{ ...btnStyle, right: "calc(env(safe-area-inset-right, 0px) + 100px)", bottom: 100, width: 70, height: 70, pointerEvents: "auto" }}
        aria-label="Shoot"
      >
        ●
      </button>

      {/* Mute — top right */}
      <button
        onTouchStart={(e: React.TouchEvent) => { e.preventDefault(); onMuteToggle(); }}
        onTouchEnd={(e: React.TouchEvent) => e.preventDefault()}
        style={{ ...btnStyle, right: "calc(env(safe-area-inset-right, 0px) + 16px)", top: 16, width: 60, height: 40, fontSize: 18, pointerEvents: "auto" }}
        aria-label="Toggle mute"
      >
        🔊
      </button>

      {/* Restart — center, only on game over */}
      {isGameOver && (
        <button
          onTouchStart={(e: React.TouchEvent) => { e.preventDefault(); onRestart(); }}
          onTouchEnd={(e: React.TouchEvent) => e.preventDefault()}
          style={{
            ...btnStyle,
            left: "50%",
            bottom: 140,
            transform: "translateX(-50%)",
            width: 140,
            height: 50,
            fontSize: 18,
            pointerEvents: "auto",
          }}
          aria-label="Restart game"
        >
          RESTART
        </button>
      )}
    </div>
  );
}
