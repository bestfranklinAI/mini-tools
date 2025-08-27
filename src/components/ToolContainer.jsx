import React, { Suspense, useMemo } from 'react';
import { AnimatePresence, motion as FM } from 'framer-motion';
import ToolRegistry from '../core/ToolRegistry';
import LoadingSpinner from './LoadingSpinner';

class ToolErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Tool crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h3>Something went wrong</h3>
          <pre className="muted" style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error)}</pre>
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
    <div className="tool-stage">
      <AnimatePresence mode="wait">
        <FM.div
          key={toolId || 'empty'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {!ToolLazy ? (
            <div style={{ padding: 24 }} className="muted">Select a tool to get started.</div>
          ) : (
            <Suspense fallback={<LoadingSpinner />}>
              <ToolErrorBoundary>
                <ToolLazy />
              </ToolErrorBoundary>
            </Suspense>
          )}
  </FM.div>
      </AnimatePresence>
    </div>
  );
}
