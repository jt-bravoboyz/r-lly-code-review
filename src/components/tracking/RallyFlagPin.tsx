import React from 'react';

/**
 * R@lly flag pin — destination/event marker used on Track-tab maps.
 * Pure presentational, no props. DOM/animations match the original
 * inline JSX previously embedded in AttendeeMap.tsx exactly.
 */
const RallyFlagPin: React.FC = () => (
  <div style={{ position: 'relative', width: 48, height: 48, pointerEvents: 'none' }}>
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '1px solid #F47A19',
        boxShadow: '0 0 8px rgba(244,122,25,0.5)',
        willChange: 'transform,opacity',
        transform: 'translate(-50%,-50%) scale(0.5)',
        opacity: 0,
        animation: 'rally-beacon-ring 3.6s ease-out infinite',
        animationDelay: '0s',
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '1px solid #F47A19',
        boxShadow: '0 0 8px rgba(244,122,25,0.5)',
        willChange: 'transform,opacity',
        transform: 'translate(-50%,-50%) scale(0.5)',
        opacity: 0,
        animation: 'rally-beacon-ring 3.6s ease-out infinite',
        animationDelay: '1.2s',
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '1px solid #F47A19',
        boxShadow: '0 0 8px rgba(244,122,25,0.5)',
        willChange: 'transform,opacity',
        transform: 'translate(-50%,-50%) scale(0.5)',
        opacity: 0,
        animation: 'rally-beacon-ring 3.6s ease-out infinite',
        animationDelay: '2.4s',
      }}
    />
    <img
      src="/logo.svg"
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 44,
        height: 44,
        borderRadius: '50%',
        transform: 'translate(-50%,-50%)',
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))',
      }}
    />
  </div>
);

export default RallyFlagPin;
