import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  Pencil, Trash2, Car, Wallet, TrendingUp, TrendingDown, HandCoins,
  Calculator, FileText, CheckCircle2, ChevronRight, Phone, CreditCard, MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { money, fmtDate, SETTLEMENT_STATUS, PROFIT_MODEL } from '../lib/format';
import { PageHeader, StatCard, Spec, Money } from '../components/common';
import {
  Modal, ConfirmDialog, Loading, EmptyState, Section, StatusBadge, Field, Input, Select, Spinner,
} from '../components/ui';
import InvestorForm from '../components/forms/InvestorForm';

const PRESETS = [
  { key: 'm1', label: 'Last month', months: 1 },
  { key: 'm3', label: 'Last 3 months', months: 3 },
  { key: 'm6', label: 'Last 6 months', months: 6 },
];

export default function InvestorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [range, setRange] = useState({
    start: dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
    end: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
  });
  const [preview, setPreview] = useState(null);

  const { data: inv, isLoading } = useQuery({
    queryKey: ['investor', id],
    queryFn: async () => (await api.get(`/investors/${id}`)).data,
  });

  const update = useMutation({
    mutationFn: (p) => api.put(`/investors/${id}`, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investor', id] }); setEditing(false); toast.success('Investor updated'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/investors/${id}`),
    onSuccess: () => { toast.success('Investor deleted'); navigate('/investors'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const doPreview = useMutation({
    mutationFn: () => api.post('/settlements/preview', { investor_id: Number(id), period_start: range.start, period_end: range.end }),
    onSuccess: (res) => setPreview(res.data),
    onError: (e) => toast.error(apiError(e)),
  });
  const finalize = useMutation({
    mutationFn: () => api.post('/settlements', { investor_id: Number(id), period_start: range.start, period_end: range.end }),
    onSuccess: (res) => { toast.success('Settlement saved'); navigate(`/settlements/${res.data.id}`); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (isLoading) return <Loading />;
  if (!inv) return null;

  const applyPreset = (months) => {
    setRange({
      start: dayjs().subtract(months, 'month').format('YYYY-MM-DD'),
      end: dayjs().format('YYYY-MM-DD'),
    });
    setPreview(null);
  };

  return (
    <div>
      <PageHeader title={inv.name} subtitle="Investor profile & profit settlements" back="/investors"
        action={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil className="w-4 h-4" /> Edit</button>
            <button className="btn-danger" onClick={() => setConfirmDel(true)}><Trash2 className="w-4 h-4" /></button>
          </div>
        } />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT: profile + vehicles */}
        <div className="space-y-4">
          <Section title="Profile">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xl font-bold">{inv.name?.slice(0, 1)}</div>
              <div>
                <p className="font-bold text-gray-900">{inv.name}</p>
                <p className="text-xs text-gray-400">Default share {inv.default_profit_share_pct}% of net</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gray-400" /> {inv.phone || '—'}</p>
              <p className="flex items-center gap-2 text-gray-600"><CreditCard className="w-4 h-4 text-gray-400" /> {inv.cnic || '—'}</p>
              <p className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-gray-400" /> {inv.address || '—'}</p>
            </div>
            {inv.notes && <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">{inv.notes}</p>}
          </Section>

          <Section title="Their Vehicles" icon={Car}>
            {inv.vehicles.length === 0 ? <EmptyState icon={Car} title="No cars assigned" /> : (
              <div className="space-y-2">
                {inv.vehicles.map((v) => (
                  <Link key={v.id} to={`/vehicles/${v.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{v.make} {v.model}</p>
                      <p className="text-xs text-gray-400">{v.registration_no} · {PROFIT_MODEL[v.profit_model]}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold"><Money value={v.lifetime.net_profit} /></p>
                      <p className="text-[11px] text-gray-400">net (lifetime)</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* RIGHT: totals + settlement generator + history */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Income" value={money(inv.totals.income)} icon={TrendingUp} accent="green" />
            <StatCard label="Total Expenses" value={money(inv.totals.expenses)} icon={TrendingDown} accent="red" />
            <StatCard label="Net Profit" value={money(inv.totals.net_profit)} icon={Wallet} accent="brand" />
          </div>

          {/* Settlement generator */}
          <Section title="Generate Profit Settlement" icon={Calculator}>
            <div className="flex flex-wrap items-end gap-3 mb-4">
              {PRESETS.map((p) => (
                <button key={p.key} className="btn-ghost btn-sm" onClick={() => applyPreset(p.months)}>{p.label}</button>
              ))}
              <Field label="From"><Input type="date" value={range.start} onChange={(e) => { setRange((r) => ({ ...r, start: e.target.value })); setPreview(null); }} /></Field>
              <Field label="To"><Input type="date" value={range.end} onChange={(e) => { setRange((r) => ({ ...r, end: e.target.value })); setPreview(null); }} /></Field>
              <button className="btn-primary" onClick={() => doPreview.mutate()} disabled={doPreview.isPending}>
                {doPreview.isPending ? <Spinner className="w-4 h-4" /> : <Calculator className="w-4 h-4" />} Calculate
              </button>
            </div>

            {!preview ? (
              <EmptyState icon={Calculator} title="Pick a period and calculate"
                hint="See exactly what each car earned, what was spent, and the investor's cut — before you finalize." />
            ) : preview.lines.length === 0 ? (
              <EmptyState title="No cars or activity in this period" />
            ) : (
              <div>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase">
                        <th className="py-2 px-1 font-semibold">Vehicle</th>
                        <th className="py-2 px-1 font-semibold text-right">Income</th>
                        <th className="py-2 px-1 font-semibold text-right">Expenses</th>
                        <th className="py-2 px-1 font-semibold text-right">Net</th>
                        <th className="py-2 px-1 font-semibold text-right">Investor Cut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.lines.map((l) => (
                        <tr key={l.vehicle_id}>
                          <td className="py-2.5 px-1">
                            <p className="font-semibold text-gray-800">{l.vehicle_label}</p>
                            <p className="text-[11px] text-gray-400">{PROFIT_MODEL[l.profit_model]} · {l.share_pct}%</p>
                          </td>
                          <td className="py-2.5 px-1 text-right">{money(l.gross_income)}</td>
                          <td className="py-2.5 px-1 text-right text-orange-600">{money(l.expenses_total)}</td>
                          <td className="py-2.5 px-1 text-right"><Money value={l.net_profit} /></td>
                          <td className="py-2.5 px-1 text-right font-bold text-violet-700">{money(l.investor_share_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 font-bold text-gray-900">
                        <td className="py-2.5 px-1">Total</td>
                        <td className="py-2.5 px-1 text-right">{money(preview.totals.gross_income)}</td>
                        <td className="py-2.5 px-1 text-right text-orange-600">{money(preview.totals.expenses_total)}</td>
                        <td className="py-2.5 px-1 text-right"><Money value={preview.totals.net_profit} /></td>
                        <td className="py-2.5 px-1 text-right text-violet-700">{money(preview.totals.investor)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-5 rounded-2xl bg-violet-50 px-5 py-4">
                  <div>
                    <p className="text-xs text-violet-600 font-semibold">Investor's total cut for {fmtDate(range.start)} → {fmtDate(range.end)}</p>
                    <p className="text-3xl font-extrabold text-violet-700">{money(preview.totals.investor)}</p>
                  </div>
                  <button className="btn-primary" onClick={() => finalize.mutate()} disabled={finalize.isPending}>
                    {finalize.isPending ? <Spinner className="w-4 h-4" /> : <FileText className="w-4 h-4" />} Finalize & Save Statement
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* History */}
          <Section title="Settlement History" icon={HandCoins}>
            {inv.settlements.length === 0 ? <EmptyState icon={HandCoins} title="No settlements yet" /> : (
              <div className="space-y-2">
                {inv.settlements.map((s) => (
                  <Link key={s.id} to={`/settlements/${s.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                        {fmtDate(s.period_start)} → {fmtDate(s.period_end)}
                        <StatusBadge map={SETTLEMENT_STATUS} value={s.status} />
                      </p>
                      <p className="text-xs text-gray-400">Generated {fmtDate(s.generated_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-violet-700">{money(s.investor_share_amount)}</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Investor">
        <InvestorForm initial={inv} submitting={update.isPending} onCancel={() => setEditing(false)} onSubmit={(p) => update.mutate(p)} />
      </Modal>
      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={() => remove.mutate()} loading={remove.isPending}
        title="Delete investor?" message="This removes the investor and unlinks their cars. Settlements are also deleted." />
    </div>
  );
}
