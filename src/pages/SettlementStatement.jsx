import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Printer, CheckCircle2, Car, Download, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { money, fmtDate, SETTLEMENT_STATUS, PROFIT_MODEL } from '../lib/format';
import { PageHeader } from '../components/common';
import { Loading, StatusBadge, Select, Spinner } from '../components/ui';
import { useState } from 'react';

export default function SettlementStatement() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [method, setMethod] = useState('CASH');

  const { data: s, isLoading } = useQuery({
    queryKey: ['settlement', id],
    queryFn: async () => (await api.get(`/settlements/${id}`)).data,
  });

  const pay = useMutation({
    mutationFn: () => api.patch(`/settlements/${id}/pay`, { paid_method: method }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settlement', id] }); toast.success('Marked as paid'); },
    onError: (e) => toast.error(apiError(e)),
  });

  const downloadPdf = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/settlements/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlement-${String(id).padStart(4, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(apiError(e, 'Could not generate PDF')),
  });

  if (isLoading) return <Loading />;
  if (!s) return null;

  // Build a WhatsApp share link with a plain-text summary of the settlement.
  const shareWhatsApp = () => {
    const lines = [
      `*${s.business?.business_name || 'Rent A Car'}* — Profit Settlement #${String(s.id).padStart(4, '0')}`,
      `Investor: ${s.investor_name}`,
      `Period: ${fmtDate(s.period_start)} to ${fmtDate(s.period_end)}`,
      '',
      ...s.lines.map((l) => `• ${l.vehicle_label}: income ${money(l.gross_income)}, expenses ${money(l.expenses_total)}, your cut *${money(l.investor_share_amount)}*`),
      '',
      `Gross income: ${money(s.gross_income)}`,
      `Total expenses: ${money(s.total_expenses)}`,
      `Net profit: ${money(s.net_profit)}`,
      `*Your total cut: ${money(s.investor_share_amount)}*`,
      s.status === 'PAID' ? `Status: PAID (${s.paid_method})` : 'Status: Pending payment',
    ];
    const text = encodeURIComponent(lines.join('\n'));
    const phone = (s.investor_phone || '').replace(/[^0-9]/g, '').replace(/^0/, '92');
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <div className="no-print">
        <PageHeader title="Investor Settlement Statement" back={`/investors/${s.investor_id}`}
          action={
            <div className="flex items-center gap-2">
              {s.status !== 'PAID' && (
                <>
                  <Select className="w-auto" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {['CASH', 'BANK', 'CARD', 'OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                  <button className="btn-ghost" onClick={() => pay.mutate()} disabled={pay.isPending}>
                    <CheckCircle2 className="w-4 h-4" /> Mark Paid
                  </button>
                </>
              )}
              <button className="btn-ghost" onClick={shareWhatsApp} title="Share summary on WhatsApp">
                <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp
              </button>
              <button className="btn-ghost" onClick={() => downloadPdf.mutate()} disabled={downloadPdf.isPending}>
                {downloadPdf.isPending ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />} PDF
              </button>
              <button className="btn-primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print</button>
            </div>
          } />
      </div>

      {/* Printable area */}
      <div className="card p-8 print-area max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white"><Car className="w-6 h-6" /></div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">{s.business?.business_name || 'Rent A Car'}</h2>
              <p className="text-xs text-gray-400">{s.business?.address} {s.business?.phone ? `· ${s.business.phone}` : ''}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Profit Settlement</p>
            <p className="text-sm font-bold text-gray-700">#{String(s.id).padStart(4, '0')}</p>
            <div className="mt-1"><StatusBadge map={SETTLEMENT_STATUS} value={s.status} /></div>
          </div>
        </div>

        {/* Investor + period */}
        <div className="flex flex-wrap justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Investor</p>
            <p className="font-bold text-gray-900">{s.investor_name}</p>
            {s.investor_phone && <p className="text-sm text-gray-500">{s.investor_phone}</p>}
            {s.investor_cnic && <p className="text-sm text-gray-500">CNIC: {s.investor_cnic}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Period</p>
            <p className="font-bold text-gray-900">{fmtDate(s.period_start)} → {fmtDate(s.period_end)}</p>
            <p className="text-sm text-gray-500">Generated {fmtDate(s.generated_at)}</p>
            {s.paid_at && <p className="text-sm text-emerald-600">Paid {fmtDate(s.paid_at)} ({s.paid_method})</p>}
          </div>
        </div>

        {/* Per-vehicle detail */}
        {s.lines.map((l) => (
          <div key={l.id} className="mb-6 rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
              <p className="font-bold text-gray-800">{l.vehicle_label}</p>
              <p className="text-xs text-gray-500">{PROFIT_MODEL[l.profit_model]} · {l.share_pct}%</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-px bg-gray-100">
              {/* Income */}
              <div className="bg-white p-4">
                <p className="text-xs font-bold text-emerald-600 uppercase mb-2">Income (payments)</p>
                {l.payments?.length ? l.payments.map((p, i) => (
                  <div key={i} className="flex justify-between gap-2 text-sm py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500 truncate pr-2">{fmtDate(p.date)} · {p.client_name}</span>
                    <span className="font-medium shrink-0">{money(p.amount)}</span>
                  </div>
                )) : <p className="text-sm text-gray-400">No income this period</p>}
                <div className="flex justify-between text-sm font-bold pt-2 mt-1 border-t border-gray-100">
                  <span>Total income</span><span>{money(l.gross_income)}</span>
                </div>
              </div>
              {/* Expenses */}
              <div className="bg-white p-4">
                <p className="text-xs font-bold text-orange-600 uppercase mb-2">Expenses (maintenance, fuel, etc.)</p>
                {l.expense_items?.length ? l.expense_items.map((e, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500 truncate pr-2">{fmtDate(e.date)} · {e.description}</span>
                    <span className="font-medium shrink-0">{money(e.amount)}</span>
                  </div>
                )) : <p className="text-sm text-gray-400">No expenses this period</p>}
                <div className="flex justify-between text-sm font-bold pt-2 mt-1 border-t border-gray-100">
                  <span>Total expenses</span><span>{money(l.expenses_total)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-6 px-4 py-2.5 bg-gray-50 text-sm">
              <span className="text-gray-500">Net profit: <b className="text-gray-800">{money(l.net_profit)}</b></span>
              <span className="text-violet-700 font-bold">Investor cut: {money(l.investor_share_amount)}</span>
            </div>
          </div>
        ))}

        {/* Grand totals */}
        <div className="rounded-2xl bg-gray-900 text-white p-6 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div><p className="text-xs text-gray-400 uppercase">Gross Income</p><p className="text-lg font-bold">{money(s.gross_income)}</p></div>
            <div><p className="text-xs text-gray-400 uppercase">Total Expenses</p><p className="text-lg font-bold text-orange-300">{money(s.total_expenses)}</p></div>
            <div><p className="text-xs text-gray-400 uppercase">Net Profit</p><p className="text-lg font-bold">{money(s.net_profit)}</p></div>
            <div className="rounded-xl bg-violet-600 py-1"><p className="text-xs text-violet-200 uppercase">Investor Cut</p><p className="text-lg font-extrabold">{money(s.investor_share_amount)}</p></div>
          </div>
        </div>

        {s.notes && <p className="text-sm text-gray-500 mt-4">Note: {s.notes}</p>}
        <div className="flex justify-between mt-12 pt-8 text-sm text-gray-400">
          <div className="text-center"><div className="w-40 border-t border-gray-300 pt-1">Investor Signature</div></div>
          <div className="text-center"><div className="w-40 border-t border-gray-300 pt-1">Authorized Signature</div></div>
        </div>
      </div>
    </div>
  );
}
