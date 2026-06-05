import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, Gauge, HandCoins, Printer } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import api from '../lib/api';
import { money } from '../lib/format';
import { PageHeader, Money } from '../components/common';
import { Section, Loading, EmptyState, Field, Input } from '../components/ui';

export default function Reports() {
  const [range, setRange] = useState({
    from: dayjs().startOf('year').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
  });

  const { data: pl, isLoading: plLoading } = useQuery({
    queryKey: ['pl', range],
    queryFn: async () => (await api.get('/reports/pl', { params: range })).data,
  });
  const { data: util = [] } = useQuery({
    queryKey: ['utilization', range],
    queryFn: async () => (await api.get('/reports/utilization', { params: range })).data.vehicles,
  });
  const { data: payouts = [] } = useQuery({
    queryKey: ['investor-payouts'],
    queryFn: async () => (await api.get('/reports/investor-payouts')).data,
  });

  return (
    <div>
      <PageHeader title="Reports" subtitle="Profit & loss, utilization and investor payouts"
        action={<button className="btn-ghost no-print" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print</button>} />

      <div className="flex flex-wrap items-end gap-3 mb-5 no-print">
        <Field label="From"><Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></Field>
        <Field label="To"><Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></Field>
      </div>

      {/* P&L */}
      <Section title="Profit & Loss by Vehicle" icon={TrendingUp} className="mb-4">
        {plLoading ? <Loading /> : !pl?.vehicles.length ? <EmptyState title="No data" /> : (
          <>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pl.vehicles.map((v) => ({ name: v.registration_no, profit: v.net_profit }))} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(x) => (Math.abs(x) >= 1000 ? `${x / 1000}k` : x)} />
                  <Tooltip formatter={(x) => money(x)} contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 13 }} />
                  <Bar dataKey="profit" name="Net profit" radius={[4, 4, 0, 0]} fill="#1f47e6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400 uppercase">
                  <tr className="text-left">
                    <th className="py-2 px-1 font-semibold">Vehicle</th>
                    <th className="py-2 px-1 font-semibold">Owner</th>
                    <th className="py-2 px-1 font-semibold text-right">Income</th>
                    <th className="py-2 px-1 font-semibold text-right">Expenses</th>
                    <th className="py-2 px-1 font-semibold text-right">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pl.vehicles.map((v) => (
                    <tr key={v.id}>
                      <td className="py-2.5 px-1">
                        <Link to={`/vehicles/${v.id}`} className="font-semibold text-gray-800 hover:text-brand-600">{v.make} {v.model}</Link>
                        <p className="text-[11px] text-gray-400">{v.registration_no}</p>
                      </td>
                      <td className="py-2.5 px-1 text-gray-500 text-xs">{v.ownership_type === 'INVESTOR' ? v.investor_name : 'Company'}</td>
                      <td className="py-2.5 px-1 text-right">{money(v.income)}</td>
                      <td className="py-2.5 px-1 text-right text-orange-600">{money(v.expenses)}</td>
                      <td className="py-2.5 px-1 text-right font-bold"><Money value={v.net_profit} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-bold">
                    <td className="py-2.5 px-1" colSpan={2}>Total</td>
                    <td className="py-2.5 px-1 text-right">{money(pl.totals.income)}</td>
                    <td className="py-2.5 px-1 text-right text-orange-600">{money(pl.totals.expenses)}</td>
                    <td className="py-2.5 px-1 text-right"><Money value={pl.totals.net_profit} /></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </Section>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Utilization */}
        <Section title="Fleet Utilization" icon={Gauge}>
          {util.length === 0 ? <EmptyState title="No data" /> : (
            <div className="space-y-3">
              {util.map((v) => (
                <div key={v.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{v.make} {v.model}</span>
                    <span className="text-gray-400">{v.booked_days}/{v.total_days} days · {v.utilization_pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, v.utilization_pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Investor payouts */}
        <Section title="Investor Payouts" icon={HandCoins}>
          {payouts.length === 0 ? <EmptyState title="No investors" /> : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <Link key={p.id} to={`/investors/${p.id}`} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.settlement_count} settlement(s)</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-bold text-gray-900">{money(p.total_share)}</p>
                    <p className="text-xs"><span className="text-emerald-600">{money(p.paid)} paid</span> · <span className="text-amber-600">{money(p.pending)} due</span></p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
