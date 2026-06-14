import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  Plus, CalendarDays, CheckCircle2, Clock, Wallet, Car,
  Pencil, Trash2, BadgeCheck, Download, Printer, MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { money, fmtDate } from '../lib/format';
import { Modal, ConfirmDialog, Loading, EmptyState, Input, Spinner } from './ui';
import Pagination from './Pagination';
import BusinessBookingForm from './forms/BusinessBookingForm';

const PER_PAGE = 50;

// Quick date presets to keep the filter friendly for non-technical users.
const PRESETS = [
  { key: 'all', label: 'All' },
  { key: 'month', label: 'This month' },
  { key: 'last', label: 'Last month' },
  { key: 'year', label: 'This year' },
];

function presetRange(key) {
  const d = dayjs();
  if (key === 'month') return { from: d.startOf('month').format('YYYY-MM-DD'), to: d.endOf('month').format('YYYY-MM-DD') };
  if (key === 'last') {
    const m = d.subtract(1, 'month');
    return { from: m.startOf('month').format('YYYY-MM-DD'), to: m.endOf('month').format('YYYY-MM-DD') };
  }
  if (key === 'year') return { from: d.startOf('year').format('YYYY-MM-DD'), to: d.endOf('year').format('YYYY-MM-DD') };
  return { from: '', to: '' };
}

// Big friendly summary tile.
function SummaryTile({ label, value, icon: Icon, tone }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  };
  return (
    <div className={`rounded-2xl ring-1 p-4 sm:p-5 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide opacity-80">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold mt-2 leading-none">{money(value)}</p>
    </div>
  );
}

export default function BusinessBookingsPanel({ vehicleId }) {
  const qc = useQueryClient();
  const [preset, setPreset] = useState('all');
  const [range, setRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const params = {
    ...(vehicleId ? { vehicle_id: vehicleId } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
    page,
    limit: PER_PAGE,
  };

  const queryKey = ['business-bookings', vehicleId || 'all', range, page];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await api.get('/business-bookings', { params })).data,
  });
  const bookings = data?.bookings || [];
  const summary = data?.summary || { paid: 0, pending: 0, total: 0, count: 0 };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['business-bookings'] });

  const create = useMutation({
    mutationFn: (p) => api.post('/business-bookings', p),
    onSuccess: () => { invalidate(); setAdding(false); toast.success('Booking added'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, p }) => api.patch(`/business-bookings/${id}`, p),
    onSuccess: () => { invalidate(); setEditing(null); toast.success('Booking updated'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/business-bookings/${id}`),
    onSuccess: () => { invalidate(); setConfirmDel(null); toast.success('Booking deleted'); },
    onError: (e) => { toast.error(apiError(e)); setConfirmDel(null); },
  });

  const markPaid = (b) => update.mutate({ id: b.id, p: { is_paid: true } });
  const markUnpaid = (b) => update.mutate({ id: b.id, p: { is_paid: false } });

  // Business name for the WhatsApp/share text (settings is readable by any user).
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  });

  // The current filter, minus paging — drives the PDF / print / share exports.
  const reportParams = {
    ...(vehicleId ? { vehicle_id: vehicleId } : {}),
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  };

  const fetchReportPdf = async () => {
    const { data } = await api.get('/business-bookings/pdf', { params: reportParams, responseType: 'blob' });
    return URL.createObjectURL(data);
  };

  const downloadPdf = useMutation({
    mutationFn: async () => {
      const url = await fetchReportPdf();
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookings-report-${dayjs().format('YYYY-MM-DD')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(apiError(e, 'Could not generate the PDF')),
  });

  const printPdf = useMutation({
    mutationFn: async () => {
      const url = await fetchReportPdf();
      // Print via a hidden iframe so the user gets the print dialog directly.
      const iframe = document.createElement('iframe');
      Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
      iframe.src = url;
      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch {
          window.open(url, '_blank');
        }
      };
      document.body.appendChild(iframe);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
    onError: (e) => toast.error(apiError(e, 'Could not open the print view')),
  });

  const shareWhatsApp = () => {
    const vehicleLabel = vehicleId && bookings[0]
      ? `${bookings[0].vehicle_make} ${bookings[0].vehicle_model} (${bookings[0].registration_no})`
      : null;
    const periodLabel = (range.from || range.to)
      ? `${range.from ? fmtDate(range.from) : 'Start'} to ${range.to ? fmtDate(range.to) : 'Today'}`
      : 'All time';
    const lines = [
      `*${settings?.business_name || 'Bookings'}* — Bookings Summary`,
      vehicleLabel ? `Car: ${vehicleLabel}` : null,
      `Period: ${periodLabel}`,
      `Bookings: ${summary.count}`,
      '',
      `Paid: ${money(summary.paid)}`,
      `Pending: ${money(summary.pending)}`,
      `*Total: ${money(summary.total)}*`,
    ].filter(Boolean);
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const busy = downloadPdf.isPending || printPdf.isPending;

  const choosePreset = (key) => {
    setPreset(key);
    setRange(presetRange(key));
    setPage(1);
  };
  const setManual = (k) => (e) => {
    setPreset('custom');
    setRange((r) => ({ ...r, [k]: e.target.value }));
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryTile label="Paid" value={summary.paid} icon={CheckCircle2} tone="green" />
        <SummaryTile label="Pending" value={summary.pending} icon={Clock} tone="amber" />
        <SummaryTile label="Total" value={summary.total} icon={Wallet} tone="brand" />
      </div>

      {/* Filter + add */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.key} onClick={() => choosePreset(p.key)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  preset === p.key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <label className="block">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">From</span>
              <Input type="date" value={range.from} onChange={setManual('from')} className="w-auto" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-gray-400 uppercase">To</span>
              <Input type="date" value={range.to} onChange={setManual('to')} className="w-auto" />
            </label>
          </div>
          <button className="btn-primary ml-auto text-base px-5 py-2.5" onClick={() => setAdding(true)}>
            <Plus className="w-5 h-5" /> Add Booking
          </button>
        </div>

        {/* Export the selected period: save, print, or share on WhatsApp. */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase mr-1">Report</span>
          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => downloadPdf.mutate()}>
            {downloadPdf.isPending ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />} Download PDF
          </button>
          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => printPdf.mutate()}>
            {printPdf.isPending ? <Spinner className="w-4 h-4" /> : <Printer className="w-4 h-4" />} Print
          </button>
          <button className="btn-ghost btn-sm" onClick={shareWhatsApp}>
            <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <Loading />
      ) : bookings.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No bookings yet"
          hint="Add your first booking to start keeping your records."
          action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Booking</button>} />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                {!vehicleId && (
                  <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                    <Car className="w-4 h-4 text-gray-400" />
                    {b.vehicle_make} {b.vehicle_model}
                    <span className="text-xs font-normal text-gray-400">· {b.registration_no}</span>
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                  <CalendarDays className="w-4 h-4 text-gray-400" />
                  {fmtDate(b.start_date)} → {fmtDate(b.end_date)}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xl font-extrabold text-gray-900">{money(b.amount)}</p>
                {b.is_paid ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <BadgeCheck className="w-4 h-4" /> Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Clock className="w-4 h-4" /> Pending
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {b.is_paid ? (
                  <button className="btn-ghost btn-sm" onClick={() => markUnpaid(b)} title="Mark as not paid">
                    Undo
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => markPaid(b)}>
                    <CheckCircle2 className="w-4 h-4" /> Mark Paid
                  </button>
                )}
                <button className="btn-ghost btn-sm" onClick={() => setEditing(b)} title="Edit"><Pencil className="w-4 h-4" /></button>
                <button className="btn-danger btn-sm" onClick={() => setConfirmDel(b)} title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={summary.count} limit={PER_PAGE} onPage={setPage} />
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add Booking">
        <BusinessBookingForm vehicleId={vehicleId} submitting={create.isPending}
          onCancel={() => setAdding(false)} onSubmit={(p) => create.mutate(p)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Booking">
        {editing && (
          <BusinessBookingForm initial={editing} vehicleId={vehicleId} submitting={update.isPending}
            onCancel={() => setEditing(null)} onSubmit={(p) => update.mutate({ id: editing.id, p })} />
        )}
      </Modal>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} loading={remove.isPending}
        onConfirm={() => remove.mutate(confirmDel.id)}
        title="Delete booking?" message="This booking record will be permanently removed." />
    </div>
  );
}
