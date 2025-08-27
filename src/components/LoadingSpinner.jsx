export default function LoadingSpinner() {
  const size = 34;
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '28px' }} aria-busy="true" aria-live="polite">
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid color-mix(in oklab, var(--border) 80%, transparent)' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: 'var(--accent)', animation: 'spin 800ms linear infinite' }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
