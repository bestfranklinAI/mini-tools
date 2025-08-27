import React, { useEffect, useState } from 'react';
import UI from '../core/UI';

export default function Toasts() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return UI.onToast((t) => {
      setItems((prev) => [...prev, t]);
      const timeout = t.timeout ?? 2400;
      if (timeout > 0) {
        setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), timeout);
      }
    });
  }, []);

  if (items.length === 0) return null;
  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16 + 92, display: 'grid', gap: 10, zIndex: 80 }}>
      {items.map((t) => (
        <div key={t.id} className={`banner ${t.type || 'info'}`}>{t.message}</div>
      ))}
    </div>
  );
}
