// HeroSection.jsx — Krowd-style hero with section label, bold headline, stat pills

import { motion } from 'framer-motion';

export default function HeroSection({ services, lastUpdated, isLoading }) {
  const upCount   = services.filter(s => s.status === 'up').length;
  const slowCount = services.filter(s => s.status === 'slow').length;
  const downCount = services.filter(s => s.status === 'down').length;
  const total     = services.length;

  const overallLabel =
    downCount > 0   ? 'Service Disruption Detected'
    : slowCount > 0 ? 'Partial Degradation'
    : total > 0     ? 'All Systems Operational'
    : '—';

  const overallColor =
    downCount > 0   ? '#dc2626'
    : slowCount > 0 ? '#b45309'
    : '#16a34a';

  const overallBg =
    downCount > 0   ? '#fee2e2'
    : slowCount > 0 ? '#fef3c7'
    : '#dcfce7';

  const lastStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <section style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '3rem 2rem 2.5rem',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* ── / SECTION LABEL ── Krowd-style */}
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#d4622a',
          marginBottom: '0.875rem',
        }}>
          / Status Dashboard
        </div>

        {/* ── Main headline ── */}
        <h1 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: '#1a1a1a',
          lineHeight: 1.15,
          marginBottom: '0.75rem',
        }}>
          Live Service Health
        </h1>

        <p style={{
          fontSize: '1rem',
          color: '#555750',
          lineHeight: 1.6,
          maxWidth: '480px',
          marginBottom: '1.75rem',
        }}>
          Real-time health monitoring across your critical services and applications.
          Auto-refreshes every&nbsp;15&nbsp;seconds.
        </p>

        {/* ── Stats row ── */}
        {!isLoading && total > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {/* Overall status badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.9rem',
              borderRadius: '6px',
              backgroundColor: overallBg,
              border: `1px solid ${overallColor}33`,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: overallColor,
            }}>
              <span style={{
                width: '7px', height: '7px',
                borderRadius: '50%',
                backgroundColor: overallColor,
                display: 'inline-block',
                flexShrink: 0,
              }} />
              {overallLabel}
            </div>

            {/* Stat pills */}
            <StatPill count={upCount}   label="Operational" color="#16a34a" bg="#dcfce7" />
            <StatPill count={slowCount} label="Degraded"    color="#b45309" bg="#fef3c7" />
            <StatPill count={downCount} label="Down"        color="#dc2626" bg="#fee2e2" />

            {/* Divider */}
            <span style={{ color: '#c8cbbf', fontSize: '0.9rem' }}>·</span>

            {/* Last updated */}
            <span style={{
              fontSize: '0.75rem',
              color: '#8d9086',
            }}>
              Updated {lastStr}
            </span>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}

function StatPill({ count, label, color, bg }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.3rem 0.75rem',
      borderRadius: '6px',
      backgroundColor: bg,
      border: `1px solid ${color}33`,
      fontSize: '0.75rem',
      fontWeight: 600,
      color,
    }}>
      <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      {label}
    </div>
  );
}
