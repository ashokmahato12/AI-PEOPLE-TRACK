import { ArrowDownRight, ArrowUpRight, Users } from 'lucide-react';

const icons = { current: Users, entries: ArrowDownRight, exits: ArrowUpRight };

export default function StatCard({ label, value, tone = 'current', detail }) {
  const Icon = icons[tone] || Users;
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-card-top">
        <span>{label}</span>
        <span className="stat-icon"><Icon size={17} strokeWidth={1.8} /></span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}