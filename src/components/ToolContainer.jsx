import React, { Suspense, useMemo, useRef } from 'react';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
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
  // Use nodeRef to avoid findDOMNode warning in StrictMode
  const nodeRef = useRef(null);

  return (
    <div className="tool-stage">
      <SwitchTransition mode="out-in">
        <CSSTransition key={toolId || 'empty'} timeout={180} classNames="fade" nodeRef={nodeRef}>
          <div ref={nodeRef}>
            {!ToolLazy ? (
              <div style={{ padding: 24 }} className="muted">Select a tool to get started.</div>
            ) : (
              <Suspense fallback={<LoadingSpinner />}>
                <ToolErrorBoundary>
                  <ToolLazy />
                </ToolErrorBoundary>
              </Suspense>
            )}
          </div>
        </CSSTransition>
      </SwitchTransition>
    </div>
  );
}
