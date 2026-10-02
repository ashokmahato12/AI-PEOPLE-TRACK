import { useEffect, useState } from 'react';
import { Activity, CalendarDays, Clock3, Users } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { api } from '../services/api.js';

const hourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`;

export default function Analytics() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.analytics(days).then((result) => {
      if (active) { setData(result); setError(''); }
    }).catch((loadError) => {
      if (active) setError(loadError.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days]);

  const hourly = Array.from({ length: 24 }, (_, hour) => {
    const row = data?.hourly.find((item) => Number(item.hour) === hour);
    return { hour: hourLabel(hour), entries: Number(row?.entries || 0), exits: Number(row?.exits || 0) };
  });
  const daily = (data?.daily || []).map((row) => ({
    day: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${row.day}T12:00:00`)),
    entries: Number(row.entries),
    exits: Number(row.exits)
  }));
  const peakLabel = data?.peakHour == null ? '—' : hourLabel(data.peakHour);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><span className="eyebrow">REPORTS / VISITOR FLOW</span><h1>Analytics</h1><p>Recorded line crossings from your MySQL event history.</p></div>
        <label className="range-select"><CalendarDays size={16} /><select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label>
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="analytics-stats">
        <article><span><Users size={16} />TOTAL VISITORS</span><strong>{loading ? '...' : Number(data?.totals.totalVisitors || 0)}</strong><small>Recorded entries · selected range</small></article>
        <article><span><Activity size={16} />TOTAL EVENTS</span><strong>{loading ? '...' : Number(data?.totals.totalEvents || 0)}</strong><small>Entries and exits · selected range</small></article>
        <article><span><Clock3 size={16} />PEAK ENTRY HOUR</span><strong>{peakLabel}</strong><small>{data?.peakHour == null ? 'No recorded entries yet' : 'Based on recorded entries'}</small></article>
      </div>
      <section className="chart-panel">
        <div className="chart-heading"><div><span className="eyebrow">HOURLY DISTRIBUTION</span><h2>People by hour</h2></div><span className="chart-legend"><i />Entries <i className="legend-exit" />Exits</span></div>
        <div className="chart-wrap">
          {hourly.every((row) => row.entries === 0 && row.exits === 0) ? <div className="empty-chart">Recorded crossings will appear here after a tracked person crosses the line.</div> : (
            <ResponsiveContainer width="100%" height="100%"><BarChart data={hourly} margin={{ top: 10, right: 12, left: -20, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#e9eeeb" />
              <XAxis dataKey="hour" tick={{ fill: '#788581', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis allowDecimals={false} tick={{ fill: '#788581', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f2f6f4' }} />
              <Bar dataKey="entries" name="Entries" fill="#148f76" radius={[3, 3, 0, 0]} />
              <Bar dataKey="exits" name="Exits" fill="#e78361" radius={[3, 3, 0, 0]} />
            </BarChart></ResponsiveContainer>
          )}
        </div>
      </section>
      <section className="chart-panel">
        <div className="chart-heading"><div><span className="eyebrow">DAILY STATISTICS</span><h2>Entries and exits</h2></div><span className="range-caption">Last {days} days</span></div>
        <div className="chart-wrap chart-short">
          {daily.length === 0 ? <div className="empty-chart">No saved events in this date range.</div> : (
            <ResponsiveContainer width="100%" height="100%"><BarChart data={daily} margin={{ top: 10, right: 12, left: -20, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#e9eeeb" />
              <XAxis dataKey="day" tick={{ fill: '#788581', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#788581', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip /><Bar dataKey="entries" name="Entries" fill="#148f76" radius={[3, 3, 0, 0]} /><Bar dataKey="exits" name="Exits" fill="#e78361" radius={[3, 3, 0, 0]} />
            </BarChart></ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}