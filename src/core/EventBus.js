// Lightweight event bus for decoupled comms between components/tools
class EventBus {
  constructor() { this.listeners = new Map(); }

  on(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(cb);
    return () => this.off(event, cb);
  }

  off(event, cb) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(cb);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of Array.from(set)) {
      try { cb(payload); } catch (e) { console.error('EventBus handler error', e); }
    }
  }
}

const bus = new EventBus();
export default bus;
