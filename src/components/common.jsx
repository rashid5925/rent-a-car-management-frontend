import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { money } from '../lib/format';

export function PageHeader({ title, subtitle, action, back }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        {back && (
          <Link to={back} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        )}
        <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Compact KPI card with optional accent + icon.
export function StatCard({ label, value, icon: Icon, accent = 'brand', sub, isMoney }) {
  const accents = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accents[accent]}`}>
            <Icon className="w-[18px] h-[18px]" />
          </div>
        )}
      </div>
      <p className="text-2xl font-extrabold text-gray-900 mt-2">
        {isMoney ? money(value) : value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// A labelled key/value spec row.
export function Spec({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value || '—'}</p>
    </div>
  );
}

export function Money({ value, className = '' }) {
  const n = Number(value) || 0;
  const color = n < 0 ? 'text-red-600' : className;
  return <span className={color}>{money(n)}</span>;
}
