import { Crosshair, MoveDown, MoveUp, Users } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import TrackingCamera from '../components/TrackingCamera.jsx';

export default function LiveTracking({ metrics, setMetrics, onEventRecorded }) {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><span className="eyebrow">CAMERA / TRACKING</span><h1>Live tracking</h1><p>Detect people, follow track IDs, and record line crossings.</p></div>
        <span className={`status-pill ${metrics.status === 'live' ? 'is-live' : ''}`}><i />{metrics.status === 'live' ? 'Detection active' : 'Detection stopped'}</span>
      </div>
      <div className="tracking-layout">
        <TrackingCamera onMetrics={setMetrics} onEventRecorded={onEventRecorded} />
        <aside className="tracking-side">
          <div className="tracking-counter"><span className="eyebrow">IN FRAME NOW</span><strong>{metrics.current}</strong><span><Users size={15} /> people detected</span></div>
          <div className="legend-panel">
            <span className="eyebrow">OVERLAY KEY</span>
            <div><i className="legend-box" /> Person bounding box</div>
            <div><i className="legend-line" /> Entry / exit line</div>
            <div><i className="legend-id">P-1</i> Stable track ID</div>
          </div>
          <div className="direction-panel">
            <span className="eyebrow">CROSSING DIRECTION</span>
            <p><MoveDown size={16} /> Top to bottom <b>ENTRY</b></p>
            <p><MoveUp size={16} /> Bottom to top <b>EXIT</b></p>
          </div>
          <div className="privacy-note"><Crosshair size={16} /><p>Crossings are counted once per track. Tune the line position in Settings.</p></div>
        </aside>
      </div>
      <div className="metric-grid tracking-metrics">
        <StatCard label="People detected" value={metrics.current} detail="Current frame" />
        <StatCard label="Active tracks" value={metrics.active} detail="IDs in view" />
        <StatCard label="Detection status" value={metrics.status === 'live' ? 'Active' : 'Idle'} detail="COCO-SSD · browser" />
      </div>
    </div>
  );
}