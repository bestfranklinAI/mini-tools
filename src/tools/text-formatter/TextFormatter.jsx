import './textFormatter.css';
import { useMemo, useState } from 'react';

export default function TextFormatter() {
  const [input, setInput] = useState('Hello World');
  const [op, setOp] = useState('upper');

  const output = useMemo(() => {
    const v = input ?? '';
    switch (op) {
      case 'upper': return v.toUpperCase();
      case 'lower': return v.toLowerCase();
      case 'slug': return v.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
      case 'trim': return v.trim();
      default: return v;
    }
  }, [input, op]);

  return (
    <div className="tool tf">
      <div className="tf__controls">
        <select value={op} onChange={(e) => setOp(e.target.value)}>
          <option value="upper">Uppercase</option>
          <option value="lower">Lowercase</option>
          <option value="slug">Slugify</option>
          <option value="trim">Trim</option>
        </select>
      </div>
      <div className="tf__grid">
        <textarea className="tf__input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type here…" />
        <textarea className="tf__output" value={output} readOnly />
      </div>
    </div>
  );
}
