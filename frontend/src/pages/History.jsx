import { useEffect, useState } from 'react';
import { CalendarDays, Download, Filter } from 'lucide-react';
import { api } from '../services/api.js';

export default function History() {
  const [filters, setFilters] = useState({ from: '', to: '', type: '' });
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.history(filters).then((result) => {
      if (active) { setEvents(result.events); setError(''); }
    }).catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  const exportCsv = () => {
    if (!events.length) return;
    const rows = [['Date and time', 'Event', 'Tracking ID', 'Camera', 'Session ID'], ...events.map((event) => [event.eventTime, event.eventType, event.trackingId, event.cameraName, event.sessionId])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'people-track-history.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><span className="eyebrow">RECORDS / EVENT LOG</span><h1>History</h1><p>Up to 500 most recent crossings saved in the database.</p></div>
        <button className="button button-secondary" onClick={exportCsv} disabled={!events.length}><Download size={16} />Export CSV</button>
      </div>
      <section className="history-panel">
        <div className="filter-bar"><span><Filter size={16} />Filter records</span>
          <label><CalendarDays size={15} /><input aria-label="From date" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
          <label><span>to</span><input aria-label="To date" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
          <select aria-label="Event type" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="">All events</option><option value="ENTRY">Entries</option><option value="EXIT">Exits</option></select>
          <button className="filter-reset" onClick={() => setFilters({ from: '', to: '', type: '' })}>Reset</button>
        </div>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="table-scroll"><table><thead><tr><th>DATE &amp; TIME</th><th>EVENT</th><th>TRACKING ID</th><th>CAMERA / SESSION</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="4" className="table-empty">Loading event history...</td></tr> : events.length === 0 ? <tr><td colSpan="4" className="table-empty">No crossing events match these filters.</td></tr> : events.map((event) => (
            <tr key={event.id}><td>{new Date(`${event.eventTime.replace(' ', 'T')}Z`).toLocaleString()}</td><td><span className={`event-badge ${event.eventType === 'ENTRY' ? 'event-entry' : 'event-exit'}`}>{event.eventType}</span></td><td className="track-code">{event.trackingId}</td><td>{event.cameraName} <span className="muted-cell">· #{event.sessionId}</span></td></tr>
          ))}</tbody></table></div>
        <footer className="table-footer">{events.length} {events.length === 1 ? 'record' : 'records'} shown</footer>
      </section>
    </div>
  );
}