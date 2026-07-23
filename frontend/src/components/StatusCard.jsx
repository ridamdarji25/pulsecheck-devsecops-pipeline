// StatusCard.jsx — Clean Krowd-style white card for a single service
//
// Key fixes over the previous version:
//   1. The card is a CSS Grid/Flex column with min-width:0 on text containers,
//      so long URLs are properly truncated instead of overflowing the card.
//   2. Status badge uses flex-shrink:0 so it never wraps.
//   3. Card height is determined by its own content (not a fixed value),
//      making the grid truly dynamic for any service name length.
//   4. Custom services have a trash/remove icon if `onRemove` is passed.

import { motion } from 'framer-motion';

const STATUS_CONFIG = {
  up: {
    label: 'Operational',
    color: '#16a34a',
    bg:    '#dcfce7',
    dot:   '#16a34a',
    pulse: true,
  },
  slow: {
    label: 'Degraded',
    color: '#b45309',
    bg:    '#fef3c7',
    dot:   '#f59e0b',
    pulse: false,
  },
  down: {
    label: 'Outage',
    color: '#dc2626',
    bg:    '#fee2e2',
    dot:   '#ef4444',
    pulse: false,
  },
};

export default function StatusCard({ service, index, onRemove, isCustom }) {
  const cfg = STATUS_CONFIG[service.status] ?? STATUS_CONFIG.down;

  const latencyDisplay = (service.latencyMs != null && service.latencyMs > 0)
    ? `${service.latencyMs} ms`
    : service.status === 'down' ? '— ms' : '0 ms';

  // Bar represents 0-1500 ms range; cap at 100%.
  const barPct = Math.min((service.latencyMs / 1500) * 100, 100);
  const barColor =
    service.latencyMs < 500 ? '#16a34a'
    : service.latencyMs < 900 ? '#f59e0b'
    : '#ef4444';

  // Clean the URL for display: strip https:// and trailing slash
  const displayUrl = service.url
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)', transition: { duration: 0.2 } }}
      layout
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e4dd',
        borderRadius: '10px',
        padding: '1.25rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'default',
        position: 'relative',
        // CRITICAL: do NOT set overflow:hidden on the card itself —
        // it was causing child text to be cut. Instead, control overflow
        // precisely on individual text nodes.
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        // min-width:0 ensures this flex child can shrink below its content size
        minWidth: 0,
      }}
    >
      {/* ── Custom badge + remove button ── */}
      {isCustom && (
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          right: onRemove ? '2.5rem' : '0.75rem',
          padding: '0.15rem 0.45rem',
          borderRadius: '4px',
          backgroundColor: '#f5ddd1',
          color: '#d4622a',
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Custom
        </div>
      )}

      {onRemove && (
        <button
          onClick={() => onRemove(service.name)}
          title="Remove service"
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            width: '22px', height: '22px',
            borderRadius: '4px',
            border: '1px solid #e2e4dd',
            backgroundColor: 'transparent',
            color: '#8d9086',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
            padding: 0,
            fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#8d9086'; }}
        >
          ×
        </button>
      )}

      {/* ── Header: name + status badge ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '0.75rem',
        // Ensure this row itself can shrink; critical for text truncation to work.
        minWidth: 0,
        paddingRight: onRemove ? '1.75rem' : 0,
      }}>
        {/* Service name + URL — wrapped in a flex child with min-width:0 */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#1a1a1a',
            letterSpacing: '-0.02em',
            marginBottom: '0.2rem',
            // Prevent the name from overflowing; use word-break so very long
            // single words wrap rather than bursting the card width.
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}>
            {service.name}
          </h2>
          <p style={{
            fontSize: '0.68rem',
            color: '#8d9086',
            fontFamily: 'ui-monospace, monospace',
            // Truncate with ellipsis — requires overflow + white-space + max-width.
            // The parent must have min-width:0 for this to work in flexbox.
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            // Width is constrained by the parent flex container, not a fixed px.
            maxWidth: '100%',
          }}>
            {displayUrl}
          </p>
        </div>

        {/* Status badge — fixed size, never shrinks */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.28rem 0.65rem',
          borderRadius: '6px',
          backgroundColor: cfg.bg,
          border: `1px solid ${cfg.color}33`,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          {/* Pulsing dot */}
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            {cfg.pulse && (
              <span style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                backgroundColor: cfg.dot,
                animation: 'dotPing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              }} />
            )}
            <span style={{
              display: 'inline-block',
              width: '7px', height: '7px',
              borderRadius: '50%',
              backgroundColor: cfg.dot,
              position: 'relative',
            }} />
          </span>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: cfg.color,
            letterSpacing: '0.03em',
          }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* ── Latency section ── */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '0.45rem',
          gap: '0.5rem',
        }}>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            color: '#8d9086',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            flexShrink: 0,
          }}>
            Response time
          </span>
          <span style={{
            fontSize: '1rem',
            fontWeight: 800,
            color: '#1a1a1a',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.03em',
          }}>
            {latencyDisplay}
          </span>
        </div>

        {/* Latency bar */}
        <div style={{
          height: '3px',
          borderRadius: '2px',
          backgroundColor: '#e2e4dd',
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${barPct}%` }}
            transition={{ duration: 0.7, delay: index * 0.06 + 0.25, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: '2px',
              backgroundColor: barColor,
            }}
          />
        </div>
      </div>
    </motion.article>
  );
}
