// StatusGrid.jsx — Responsive grid of StatusCard components
//
// Handles three states: loading skeleton, error, data.
// Separates built-in services from custom (user-added) ones
// with a visual section divider between them.

import { motion, AnimatePresence } from 'framer-motion';
import StatusCard from './StatusCard';

export default function StatusGrid({ services, customServices, isLoading, error, onRemoveCustom }) {
  if (isLoading) return <SkeletonGrid />;
  if (error) return <ErrorState message={error.message} />;

  const hasCustom = customServices && customServices.length > 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 4rem' }}>

      {/* ── Built-in services section ── */}
      <SectionLabel label="Monitored Services" count={services.length} />
      <AnimatedGrid>
        <AnimatePresence>
          {services.map((svc, i) => (
            <StatusCard key={svc.name} service={svc} index={i} />
          ))}
        </AnimatePresence>
      </AnimatedGrid>

      {/* ── Custom applications section ── */}
      {hasCustom && (
        <div style={{ marginTop: '2.5rem' }}>
          <SectionLabel label="Your Applications" count={customServices.length} accent />
          <AnimatedGrid>
            <AnimatePresence>
              {customServices.map((svc, i) => (
                <StatusCard
                  key={svc.name}
                  service={svc}
                  index={i}
                  isCustom
                  onRemove={onRemoveCustom}
                />
              ))}
            </AnimatePresence>
          </AnimatedGrid>
        </div>
      )}

      {services.length === 0 && !hasCustom && (
        <p style={{ color: '#8d9086', textAlign: 'center', padding: '3rem' }}>
          No services configured.
        </p>
      )}
    </div>
  );
}

/* ── Section Label ─────────────────────────────────────────── */
function SectionLabel({ label, count, accent }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '1rem',
    }}>
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: accent ? '#d4622a' : '#8d9086',
      }}>
        / {label}
      </span>
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#8d9086',
        backgroundColor: '#e2e4dd',
        borderRadius: '20px',
        padding: '0.1rem 0.5rem',
      }}>
        {count}
      </span>
      <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e4dd' }} />
    </div>
  );
}

/* ── Animated Grid Wrapper ─────────────────────────────────── */
function AnimatedGrid({ children }) {
  return (
    <div style={{
      display: 'grid',
      // Krowd-style: clean 4-column grid that collapses gracefully.
      // min 260px so cards never get too narrow; max 1fr fills evenly.
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: '1rem',
    }}>
      {children}
    </div>
  );
}

/* ── Skeleton loading state ─────────────────────────────────── */
function SkeletonGrid() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 4rem' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1rem',
      }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e4dd',
              borderRadius: '10px',
              padding: '1.25rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <Shimmer width="60%" height="14px" />
                <Shimmer width="80%" height="10px" />
              </div>
              <Shimmer width="80px" height="26px" radius="6px" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Shimmer width="35%" height="10px" />
                <Shimmer width="20%" height="14px" />
              </div>
              <Shimmer width="100%" height="3px" radius="2px" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Shimmer({ width, height, radius = '4px' }) {
  return (
    <div style={{
      width,
      height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, #e2e4dd 25%, #f0f2ee 50%, #e2e4dd 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

/* ── Error state ───────────────────────────────────────────── */
function ErrorState({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        maxWidth: '480px',
        margin: '3rem auto',
        padding: '1.75rem',
        borderRadius: '10px',
        backgroundColor: '#fff',
        border: '1px solid #fca5a5',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
      <h3 style={{ color: '#dc2626', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
        Cannot reach the backend API
      </h3>
      <p style={{ color: '#555750', fontSize: '0.82rem', lineHeight: 1.6 }}>
        {message ?? 'Unknown error. Is the backend server running on port 3001?'}
      </p>
    </motion.div>
  );
}
