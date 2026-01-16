import './newTool.css';
import ToolHeader from '../../components/ToolHeader';

export default function NewTool() {
  return (
    <div className="tool-root newtool">
      <ToolHeader title="New Tool" subtitle="Start building your tool here" />
      <div className="tool-scroll-view">
        <div className="tool-pane">
          <div className="tool-pane-header">Section Title</div>
          <div className="tool-pane-content">
            <p className="muted">Keep state self-contained and use shared components.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
