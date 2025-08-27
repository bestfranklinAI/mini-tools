import bus from './EventBus';

// Lightweight UI helper for app-wide toasts and inline message events
// Usage:
//   import UI from '../core/UI';
//   UI.toast('Copied to clipboard', { type: 'success', timeout: 2200 });

const DEFAULT_TOAST = { type: 'info', timeout: 2400 };

const UI = {
  toast(message, opts = {}) {
    const t = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, message, ...DEFAULT_TOAST, ...(opts || {}) };
    bus.emit('ui:toast', t);
    return t.id;
  },
  onToast(cb) {
    return bus.on('ui:toast', cb);
  },
};

export default UI;
