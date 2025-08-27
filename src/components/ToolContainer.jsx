import React, { Suspense, useMemo } from 'react';
import { AnimatePresence, motion as FM } from 'framer-motion';
import ToolRegistry from '../core/ToolRegistry';
import LoadingSpinner from './LoadingSpinner';

class ToolErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Tool crash:', error, info); }
  componentDidUpdate(prevProps) {
    if (prevProps.toolId !== this.props.toolId && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="tool-error" role="alert" style={{ padding: 24 }}>
          <h3>Something went wrong</h3>
          <pre className="muted" style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error)}</pre>
          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => this.setState({ hasError: false, error: null })}>Reload tool</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ToolContainer({ toolId }) {
  const importer = ToolRegistry.getImporter(toolId);

  const ToolLazy = useMemo(() => importer ? React.lazy(importer) : null, [importer]);

  return (
  <div className="tool-stage" role="main" aria-live="polite" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <AnimatePresence mode="wait">
        <FM.div
          key={toolId || 'empty'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}
        >
          {!ToolLazy ? (
            <div style={{ padding: 24 }} className="muted">Select a tool to get started.</div>
          ) : (
            <Suspense fallback={<LoadingSpinner />}>
        <ToolErrorBoundary toolId={toolId}>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
                  <ToolLazy />
                </div>
              </ToolErrorBoundary>
            </Suspense>
          )}
  </FM.div>
      </AnimatePresence>
    </div>
  );
}
