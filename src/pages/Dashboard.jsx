import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Car, CheckCircle2, KeyRound, Wrench, TrendingUp, TrendingDown,
  HandCoins, AlertTriangle, Clock, CalendarClock,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import api from '../lib/api';
import { money, fmtDate } from '../lib/format';
import { PageHeader, StatCard } from '../components/common';
import { Section, Loading, EmptyState } from '../components/ui';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/reports/dashboard')).data,
  });

  if (isLoading) return <Loading />;
  if (!data) return null;

  const { fleet, month, pending_payouts, alerts, recent_bookings, monthly } = data;
  const chartData = monthly.map((m) => ({ ...m, name: m.month.slice(5) }));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Overview · ${month.label}`} />

      {/* Pending approvals banner */}
      {data.pending_approvals?.count > 0 && (
        <Link to="/payments" className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 border border-amber-100 px-5 py-3 mb-4 hover:bg-amber-100/70">
          <span className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <Clock className="w-4 h-4" /> {data.pending_approvals.count} payment(s) awaiting your approval · {money(data.pending_approvals.total)}
          </span>
          <span className="text-sm font-semibold text-amber-700">Review →</span>
        </Link>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Fleet Size" value={fleet.total} icon={Car} accent="brand"
          sub={`${fleet.company_owned} owned · ${fleet.investor_owned} investor`} />
        <StatCard label="Available" value={fleet.available} icon={CheckCircle2} accent="green"
          sub={`${fleet.rented} rented · ${fleet.maintenance} in shop`} />
        <StatCard label={`Income · ${month.label.split(' ')[0]}`} value={money(month.income)} icon={TrendingUp} accent="green" />
        <StatCard label="Pending Investor Payouts" value={money(pending_payouts.total)} icon={HandCoins} accent="amber"
          sub={`${pending_payouts.count} unpaid settlement(s)`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Chart */}
        <Section title="Income vs Expenses (6 months)" className="lg:col-span-2" icon={TrendingUp}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1f47e6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1f47e6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 13 }} />
                <Area type="monotone" dataKey="income" stroke="#1f47e6" strokeWidth={2.5} fill="url(#inc)" name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={2.5} fill="url(#exp)" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-sm">
            <span className="flex items-center gap-2 text-gray-500"><TrendingUp className="w-4 h-4 text-emerald-500" /> Income {money(month.income)}</span>
            <span className="flex items-center gap-2 text-gray-500"><TrendingDown className="w-4 h-4 text-orange-500" /> Expenses {money(month.expenses)}</span>
            <span className="font-bold text-gray-900">Profit {money(month.profit)}</span>
          </div>
        </Section>

        {/* Alerts */}
        <Section title="Needs Attention" icon={AlertTriangle}>
          <AlertList
            items={alerts.returns_due}
            empty="No upcoming returns"
            icon={CalendarClock}
            render={(r) => ({
              to: `/bookings`,
              title: `${r.make} ${r.model} return`,
              meta: `${r.client_name} · due ${fmtDate(r.end_date)}`,
              tone: 'blue',
            })}
          />
          <AlertList
            items={alerts.maintenance_due}
            empty=""
            icon={Wrench}
            render={(m) => ({
              to: `/vehicles/${m.vehicle_id}`,
              title: `${m.make} ${m.model}`,
              meta: `${m.title} due ${fmtDate(m.next_due_date)}`,
              tone: 'amber',
            })}
          />
          <AlertList
            items={alerts.overdue_balances}
            empty=""
            icon={Clock}
            render={(b) => ({
              to: `/bookings`,
              title: `${money(b.balance)} unpaid`,
              meta: `${b.client_name} · ${b.make} ${b.model}`,
              tone: 'red',
            })}
          />
          {!alerts.returns_due.length && !alerts.maintenance_due.length && !alerts.overdue_balances.length && (
            <EmptyState icon={CheckCircle2} title="All clear" hint="No pending returns, dues or overdue payments." />
          )}
        </Section>
      </div>

      {/* Recent bookings */}
      <Section title="Recent Bookings" className="mt-4" icon={KeyRound}
        action={<Link to="/bookings" className="text-sm text-brand-600 font-semibold">View all</Link>}>
        {recent_bookings.length === 0 ? (
          <EmptyState title="No bookings yet" />
        ) : (
          <div className="divide-y divide-gray-100">
            {recent_bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{b.make} {b.model} · {b.registration_no}</p>
                  <p className="text-xs text-gray-400">{b.client_name} · {fmtDate(b.start_date)} → {fmtDate(b.end_date)}</p>
                </div>
                <span className="font-bold text-gray-900 text-sm">{money(b.total_amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function AlertList({ items, render, icon: Icon }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return items.map((item, i) => {
    const v = render(item);
    return (
      <Link key={i} to={v.to} className="flex items-center gap-3 py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tones[v.tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{v.title}</p>
          <p className="text-xs text-gray-400 truncate">{v.meta}</p>
        </div>
      </Link>
    );
  });
}
