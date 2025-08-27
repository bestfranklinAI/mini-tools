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
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className={`banner ${t.type || 'info'}`}>{t.message}</div>
      ))}
    </div>
  );
}
