// TopBar.jsx — Clean Krowd-style navigation bar with live clock

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function TopBar({ onAddApp }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formatted = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e4dd',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 2rem',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>

        {/* ── Logo ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {/* ECG icon */}
          <div style={{
            width: '28px', height: '28px',
            borderRadius: '6px',
            backgroundColor: '#1a1a1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#d4622a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 12 6 12 8 4 10 20 12 12 14 12 16 7 18 12 22 12" />
            </svg>
          </div>
          <span style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#1a1a1a',
          }}>
            Pulse<span style={{ color: '#d4622a' }}>Check</span>
          </span>
        </div>

        {/* ── Centre tag ── */}
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 500,
          color: '#8d9086',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          / Live Status Dashboard
        </div>

        {/* ── Right side ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
          {/* Live clock */}
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#555750',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em',
          }}>
            {formatted}
          </span>

          {/* Add Application button — Krowd-style "Get started" pill */}
          <button
            onClick={onAddApp}
            id="add-app-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              transition: 'background 0.15s, transform 0.1s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#333'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1a1a1a'}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
            Add Service
          </button>
        </div>
      </div>
    </motion.header>
  );
}
