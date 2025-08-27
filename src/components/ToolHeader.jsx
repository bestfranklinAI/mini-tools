import React from 'react';

export default function ToolHeader({ iconUrl, title, subtitle, actions }) {
  return (
    <div className="tool-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {iconUrl ? <img src={iconUrl} alt="" width={22} height={22} style={{ display: 'block' }} /> : null}
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <div className="tool-title" title={title}>{title}</div>
          {subtitle ? <div className="tool-subtitle" title={subtitle}>{subtitle}</div> : null}
        </div>
      </div>
      {actions ? <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div> : null}
    </div>
  );
}
