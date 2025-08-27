import React from 'react';
import './ToolHeader.css';

export default function ToolHeader({ iconUrl, title, subtitle, actions }) {
  return (
    <div className="tool-header">
      <div className="tool-info">
        {iconUrl ? <img src={iconUrl} alt="" className="tool-icon" /> : null}
        <div className="tool-text">
          <div className="tool-title" title={title}>{title}</div>
          {subtitle ? <div className="tool-subtitle" title={subtitle}>{subtitle}</div> : null}
        </div>
      </div>
      {actions ? <div className="tool-actions">{actions}</div> : null}
    </div>
  );
}
