import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AddAppModal({ isOpen, onClose, onAdd }) {
  const [name, setName]       = useState('');
  const [url, setUrl]         = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setUrl('');
      setError('');
      setLoading(false);
      setTimeout(() => nameRef.current?.focus(), 120);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  function validate() {
    if (!name.trim()) return 'Please enter a service name.';
    if (!url.trim())  return 'Please enter a URL to monitor.';
    try {
      const parsed = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return 'URL must start with http:// or https://';
      }
    } catch {
      return 'Please enter a valid URL (e.g. https://api.example.com/health)';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');
    try {
      await onAdd(name.trim(), url.trim());
      onClose();
    } catch (err) {
      setError(err.message ?? 'Failed to add service. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(26, 26, 26, 0.45)',
              backdropFilter: 'blur(3px)',
              zIndex: 200,
            }}
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 201,
              width: '100%',
              maxWidth: '460px',
              margin: '0 1rem',
            }}
          >
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e4dd',
              borderRadius: '12px',
              boxShadow: '0 20px 60px -10px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '1.5rem 1.75rem 1.25rem',
                borderBottom: '1px solid #e2e4dd',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
              }}>
                <div>
                  <div style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#d4622a',
                    marginBottom: '0.35rem',
                  }}>
                    / Add Service
                  </div>
                  <h2 style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#1a1a1a',
                    letterSpacing: '-0.03em',
                  }}>
                    Monitor a new application
                  </h2>
                  <p style={{
                    fontSize: '0.8rem',
                    color: '#555750',
                    marginTop: '0.3rem',
                    lineHeight: 1.5,
                  }}>
                    Enter the name and a publicly reachable URL. PulseCheck will
                    ping it every 15 seconds and report its status.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  style={{
                    width: '28px', height: '28px',
                    borderRadius: '6px',
                    border: '1px solid #e2e4dd',
                    backgroundColor: 'transparent',
                    color: '#555750',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f2eb'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle} htmlFor="svc-name">Service name</label>
                  <input
                    id="svc-name"
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setError(''); }}
                    placeholder="e.g. My API, Production DB, Auth Service"
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = '#1a1a1a'}
                    onBlur={e => e.currentTarget.style.borderColor = '#e2e4dd'}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={labelStyle} htmlFor="svc-url">Endpoint URL</label>
                  <input
                    id="svc-url"
                    type="text"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setError(''); }}
                    placeholder="https://api.yourapp.com/health"
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = '#1a1a1a'}
                    onBlur={e => e.currentTarget.style.borderColor = '#e2e4dd'}
                  />
                  <p style={{
                    marginTop: '0.35rem',
                    fontSize: '0.71rem',
                    color: '#8d9086',
                  }}>
                    Tip: use a lightweight endpoint like <code style={{ fontFamily: 'monospace', color: '#555750' }}>/health</code> or <code style={{ fontFamily: 'monospace', color: '#555750' }}>/ping</code>.
                  </p>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginBottom: '1rem',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '6px',
                      backgroundColor: '#fee2e2',
                      border: '1px solid #fca5a5',
                      color: '#dc2626',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                    }}
                  >
                    {error}
                  </motion.p>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      ...btnBase,
                      backgroundColor: 'transparent',
                      color: '#555750',
                      border: '1px solid #e2e4dd',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f2eb'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...btnBase,
                      backgroundColor: loading ? '#555' : '#1a1a1a',
                      color: '#ffffff',
                      border: '1px solid transparent',
                      minWidth: '120px',
                      opacity: loading ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#333'; }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#1a1a1a'; }}
                  >
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <Spinner /> Checking…
                      </span>
                    ) : 'Add & Monitor'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#1a1a1a',
  marginBottom: '0.4rem',
  letterSpacing: '0.01em',
};

const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  borderRadius: '7px',
  border: '1px solid #e2e4dd',
  backgroundColor: '#fafafa',
  fontSize: '0.875rem',
  color: '#1a1a1a',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

const btnBase = {
  padding: '0.55rem 1.1rem',
  borderRadius: '7px',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.15s',
  letterSpacing: '0.01em',
};

function Spinner() {
  return (
    <span style={{
      width: '12px', height: '12px',
      borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#ffffff',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}
