import { useEffect, useState } from 'react';
import { ArrowUpRight, Clock3, Radio, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import TrackingCamera from '../components/TrackingCamera.jsx';
import { api } from '../services/api.js';

function MetricStrip({ metrics, totals }) {
  return (
    <div className="metric-grid">
      <StatCard label="People now" value={metrics.current} detail="Currently in frame" />
      <StatCard label="Entries today" value={totals.entries} tone="entries" detail="Recorded this day" />
      <StatCard label="Exits today" value={totals.exits} tone="exits" detail="Recorded this day" />
      <StatCard label="Active tracks" value={metrics.active} detail="Stable IDs in frame" />
    </div>
  );
}

export default function Dashboard({ metrics, setMetrics, refreshKey, onEventRecorded, onSummary }) {
  const [totals, setTotals] = useState({ entries: 0, exits: 0 });
  const [summaryError, setSummaryError] = useState('');

  useEffect(() => {
    api.summary().then((data) => {
      setTotals({ entries: Number(data.entries), exits: Number(data.exits) });
      onSummary(data);
      setSummaryError('');
    }).catch((error) => setSummaryError(error.message));
  }, [refreshKey, onSummary]);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><span className="eyebrow">OVERVIEW / TODAY</span><h1>Operations dashboard</h1><p>Live occupancy and visitor flow at a glance.</p></div>
        <span className="date-chip"><Clock3 size={15} />{new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date())}</span>
      </div>
      <MetricStrip metrics={metrics} totals={totals} />
      {summaryError && <p className="inline-error" role="alert">{summaryError}</p>}
      <div className="dashboard-main-grid">
        <TrackingCamera compact onMetrics={setMetrics} onEventRecorded={onEventRecorded} />
        <aside className="activity-panel">
          <div className="panel-heading"><div><span className="eyebrow">SYSTEM</span><h2>Live status</h2></div><Radio size={19} /></div>
          <div className="status-row"><span className="status-dot" /><span>Detection engine</span><strong>{metrics.status === 'live' ? 'Running' : 'Standby'}</strong></div>
          <div className="status-row"><span className={`status-dot ${metrics.status === 'live' ? '' : 'dot-muted'}`} /><span>Camera</span><strong>{metrics.status === 'live' ? 'Connected' : 'Offline'}</strong></div>
          <div className="activity-summary"><UsersRound size={20} /><div><strong>{metrics.current} people detected</strong><span>Updates as the camera scans</span></div></div>
          <Link to="/tracking" className="text-link">Open live tracking <ArrowUpRight size={16} /></Link>
          <div className="privacy-note"><span>LOCAL INFERENCE</span><p>Video stays in your browser. Only line-crossing events are saved.</p></div>
        </aside>
      </div>
      <div className="section-footnote"><span>DATA SOURCE</span> MySQL event records · counts reset at local midnight</div>
    </div>
  );
}