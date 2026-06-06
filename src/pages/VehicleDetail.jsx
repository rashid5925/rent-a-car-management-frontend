import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  Car, Pencil, Trash2, Plus, ImagePlus, Star, X, Gauge, Fuel, Settings2,
  TrendingUp, TrendingDown, Wallet, CalendarDays, Wrench, Receipt, User,
  Paperclip, BadgeDollarSign, FileText, RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  money, fmtDate, VEHICLE_STATUS, BOOKING_STATUS, PROFIT_MODEL,
} from '../lib/format';
import { PageHeader, StatCard, Spec, Money } from '../components/common';
import {
  Modal, ConfirmDialog, Loading, EmptyState, StatusBadge, Section, Field, Input, Select,
} from '../components/ui';
import VehicleForm from '../components/forms/VehicleForm';
import BookingForm from '../components/forms/BookingForm';
import ReturnModal from '../components/ReturnModal';
import PaymentsTable from '../components/PaymentsTable';
import MaintenanceForm from '../components/forms/MaintenanceForm';
import ExpenseForm from '../components/forms/ExpenseForm';

const PERIODS = [
  { key: 'all', label: 'All time' },
  { key: 'month', label: 'This month' },
  { key: 'q', label: 'Last 3 months' },
  { key: 'half', label: 'Last 6 months' },
];

function periodRange(key) {
  const end = dayjs().format('YYYY-MM-DD');
  if (key === 'month') return { start: dayjs().startOf('month').format('YYYY-MM-DD'), end };
  if (key === 'q') return { start: dayjs().subtract(3, 'month').format('YYYY-MM-DD'), end };
  if (key === 'half') return { start: dayjs().subtract(6, 'month').format('YYYY-MM-DD'), end };
  return {};
}

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const [period, setPeriod] = useState('all');
  const [modal, setModal] = useState(null); // 'edit' | 'book' | 'maint' | 'expense' | 'pay'
  const [payBooking, setPayBooking] = useState(null);
  const [returnBooking, setReturnBooking] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const range = periodRange(period);
  const { data: v, isLoading } = useQuery({
    queryKey: ['vehicle', id, period],
    queryFn: async () => (await api.get(`/vehicles/${id}`, { params: range })).data,
  });
  const { data: paymentsData } = useQuery({
    queryKey: ['payments', { vehicle_id: id }],
    queryFn: async () => (await api.get('/payments', { params: { vehicle_id: id } })).data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['vehicle', id] });
    qc.invalidateQueries({ queryKey: ['vehicles'] });
    qc.invalidateQueries({ queryKey: ['payments'] });
  };
  const mut = (fn, msg) =>
    useMutation({ mutationFn: fn, onSuccess: () => { invalidate(); setModal(null); setPayBooking(null); toast.success(msg); }, onError: (e) => toast.error(apiError(e)) });

  const updateVehicle = mut((p) => api.put(`/vehicles/${id}`, p), 'Vehicle updated');
  const addBooking = mut((p) => api.post('/bookings', p), 'Booking created');
  const addMaint = mut((fd) => api.post('/maintenance', fd), 'Maintenance added');
  const addExpense = mut((fd) => api.post('/expenses', fd), 'Expense added');
  const addPayment = useMutation({
    mutationFn: ({ bookingId, body }) => api.post(`/bookings/${bookingId}/payments`, body),
    onSuccess: () => { invalidate(); setPayBooking(null); toast.success('Payment recorded'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const changeStatus = useMutation({
    mutationFn: ({ bookingId, status }) => api.patch(`/bookings/${bookingId}/status`, { status }),
    onSuccess: () => { invalidate(); toast.success('Status updated'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const delVehicle = useMutation({
    mutationFn: () => api.delete(`/vehicles/${id}`),
    onSuccess: () => { toast.success('Vehicle deleted'); navigate('/vehicles'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const uploadImages = useMutation({
    mutationFn: (files) => {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('images', f));
      return api.post(`/vehicles/${id}/images`, fd);
    },
    onSuccess: () => { invalidate(); toast.success('Images uploaded'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const setPrimary = useMutation({
    mutationFn: (imageId) => api.patch(`/vehicles/${id}/images/${imageId}/primary`),
    onSuccess: invalidate,
  });
  const delImage = useMutation({
    mutationFn: (imageId) => api.delete(`/vehicles/${id}/images/${imageId}`),
    onSuccess: invalidate,
  });

  if (isLoading) return <Loading />;
  if (!v) return null;

  const fin = v.financials;
  const isInvestor = v.ownership_type === 'INVESTOR';

  // Estimated investor cut for the selected window (mirrors backend NET_SHARE logic for display).
  const estCut = (() => {
    if (!isInvestor) return null;
    if (v.profit_model === 'GROSS_COMMISSION') {
      const commission = (fin.income * Number(v.manager_commission_pct)) / 100;
      return fin.income - commission - fin.expenses;
    }
    if (v.profit_model === 'FIXED') return Number(v.fixed_payout_amount);
    return (fin.net_profit * Number(v.investor_share_pct)) / 100;
  })();

  return (
    <div>
      <PageHeader
        title={`${v.make} ${v.model}`}
        subtitle={`${v.registration_no} · ${v.year || ''} · ${v.color || ''}`}
        back="/vehicles"
        action={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setModal('edit')}><Pencil className="w-4 h-4" /> Edit</button>
            <button className="btn-danger" onClick={() => setConfirmDel(true)}><Trash2 className="w-4 h-4" /></button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT: gallery + specs + investor */}
        <div className="space-y-4">
          <Section title="Photos" icon={ImagePlus}
            action={
              <label className="btn-ghost btn-sm cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add
                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files.length && uploadImages.mutate(e.target.files)} />
              </label>
            }>
            {v.images.length === 0 ? (
              <div className="h-44 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300"><Car className="w-12 h-12" /></div>
            ) : (
              <div>
                <img src={v.images[0].file_path} alt="" className="w-full h-44 object-cover rounded-xl" />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {v.images.map((img) => (
                    <div key={img.id} className="relative group">
                      <img src={img.file_path} alt="" className={`w-14 h-14 object-cover rounded-lg border-2 ${img.is_primary ? 'border-brand-500' : 'border-transparent'}`} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center gap-1 transition">
                        {!img.is_primary && <button onClick={() => setPrimary.mutate(img.id)} title="Make primary"><Star className="w-4 h-4 text-white" /></button>}
                        <button onClick={() => delImage.mutate(img.id)} title="Delete"><X className="w-4 h-4 text-white" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title="Details" icon={Settings2}>
            <div className="flex items-center gap-2 mb-4">
              <StatusBadge map={VEHICLE_STATUS} value={v.status} />
              <span className={`badge ${isInvestor ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>
                {isInvestor ? 'Investor owned' : 'Company owned'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Spec label="Daily Rate" value={money(v.daily_rate)} />
              <Spec label="Odometer" value={`${Number(v.current_odometer || 0).toLocaleString()} km`} />
              <Spec label="Transmission" value={v.transmission} />
              <Spec label="Fuel" value={v.fuel_type} />
              <Spec label="Seats" value={v.seats} />
              <Spec label="Category" value={v.category} />
              <Spec label="Chassis No" value={v.chassis_no} />
              <Spec label="Purchase" value={v.purchase_date ? fmtDate(v.purchase_date) : '—'} />
            </div>
            {v.notes && <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">{v.notes}</p>}
          </Section>

          {isInvestor && (
            <Section title="Investor & Profit Share" icon={User} className="ring-1 ring-violet-100">
              <Link to={`/investors/${v.investor_id}`} className="flex items-center gap-3 mb-4 group">
                <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                  {v.investor_name?.slice(0, 1)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 group-hover:text-brand-600">{v.investor_name}</p>
                  <p className="text-xs text-gray-400">{v.investor_phone || ''}</p>
                </div>
              </Link>
              <div className="grid grid-cols-2 gap-4">
                <Spec label="Profit Model" value={PROFIT_MODEL[v.profit_model]} />
                <Spec label="Share / Rate" value={
                  v.profit_model === 'NET_SHARE' ? `${v.investor_share_pct}% of net`
                  : v.profit_model === 'GROSS_COMMISSION' ? `${v.manager_commission_pct}% mgr commission`
                  : money(v.fixed_payout_amount)
                } />
              </div>
              <div className="mt-4 rounded-xl bg-violet-50 px-4 py-3">
                <p className="text-xs text-violet-600 font-semibold">Estimated investor cut ({PERIODS.find((p) => p.key === period).label})</p>
                <p className="text-xl font-extrabold text-violet-700 mt-1">{money(estCut)}</p>
              </div>
              <Link to={`/investors/${v.investor_id}`} className="btn-ghost btn-sm w-full mt-3 justify-center">
                <BadgeDollarSign className="w-4 h-4" /> Generate settlement
              </Link>
            </Section>
          )}
        </div>

        {/* RIGHT: financials + chart + sections */}
        <div className="lg:col-span-2 space-y-4">
          {/* Period selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`btn-sm ${period === p.key ? 'btn-primary' : 'btn-ghost'}`}>{p.label}</button>
            ))}
          </div>

          {/* Financial KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Income" value={money(fin.income)} icon={TrendingUp} accent="green" />
            <StatCard label="Expenses" value={money(fin.expenses)} icon={TrendingDown} accent="red"
              sub={`Maint ${money(fin.expense_breakdown.maintenance)} · Other ${money(fin.expense_breakdown.expenses)}`} />
            <StatCard label="Net Profit" value={money(fin.net_profit)} icon={Wallet} accent="brand" />
            <StatCard label={isInvestor ? 'Investor Cut' : 'Lifetime Profit'} value={money(isInvestor ? estCut : v.lifetime.net_profit)} icon={BadgeDollarSign} accent="violet" />
          </div>

          {/* Chart */}
          <Section title="Income vs Expenses (6 months)" icon={TrendingUp}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={v.monthly.map((m) => ({ ...m, name: m.month.slice(5) }))} margin={{ left: -10, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(x) => (x >= 1000 ? `${x / 1000}k` : x)} />
                  <Tooltip formatter={(x) => money(x)} contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" fill="#1f47e6" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#f97316" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Bookings */}
          <Section title="Bookings" icon={CalendarDays}
            action={<button className="btn-primary btn-sm" onClick={() => setModal('book')}><Plus className="w-3.5 h-3.5" /> New</button>}>
            {v.bookings.length === 0 ? <EmptyState icon={CalendarDays} title="No bookings yet" /> : (
              <div className="space-y-2">
                {v.bookings.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{b.client_name}</p>
                      <p className="text-xs text-gray-400">{fmtDate(b.start_date)} → {fmtDate(b.end_date)} · {b.total_days} days</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{money(b.total_amount)}</p>
                        <p className={`text-xs ${Number(b.balance) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {Number(b.balance) > 0 ? `${money(b.balance)} due` : 'Paid'}
                        </p>
                      </div>
                      <Select className="w-auto text-xs py-1.5" value={b.status} onChange={(e) => changeStatus.mutate({ bookingId: b.id, status: e.target.value })}>
                        {Object.keys(BOOKING_STATUS)
                          .filter((s) => s !== 'COMPLETED' || isOwner || b.status === 'COMPLETED')
                          .map((s) => <option key={s} value={s}>{BOOKING_STATUS[s].label}</option>)}
                      </Select>
                      {b.status !== 'CANCELLED' && (
                        <button className="btn-ghost btn-sm" onClick={() => setReturnBooking(b)} title="Record return / damage"><RotateCcw className="w-3.5 h-3.5" /> Return</button>
                      )}
                      {Number(b.balance) > 0 && (
                        <button className="btn-ghost btn-sm" onClick={() => setPayBooking(b)}><Wallet className="w-3.5 h-3.5" /> Pay</button>
                      )}
                      <Link to={`/bookings/${b.id}/receipt`} className="btn-ghost btn-sm"><FileText className="w-3.5 h-3.5" /> Receipt</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Maintenance */}
          <Section title="Maintenance & Service" icon={Wrench}
            action={<button className="btn-primary btn-sm" onClick={() => setModal('maint')}><Plus className="w-3.5 h-3.5" /> New</button>}>
            {v.maintenance.length === 0 ? <EmptyState icon={Wrench} title="No maintenance records" /> : (
              <div className="space-y-2">
                {v.maintenance.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                        {m.title}
                        <span className="badge bg-gray-100 text-gray-500">{m.type}</span>
                        {m.attachment_count > 0 && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{m.attachment_count}</span>}
                      </p>
                      <p className="text-xs text-gray-400">{fmtDate(m.service_date)} {m.vendor ? `· ${m.vendor}` : ''} {m.next_due_date ? `· next due ${fmtDate(m.next_due_date)}` : ''}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{money(m.cost)}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Expenses */}
          <Section title="Expenses" icon={Receipt}
            action={<button className="btn-primary btn-sm" onClick={() => setModal('expense')}><Plus className="w-3.5 h-3.5" /> New</button>}>
            {v.expenses.length === 0 ? <EmptyState icon={Receipt} title="No expenses logged" /> : (
              <div className="space-y-2">
                {v.expenses.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="badge bg-gray-100 text-gray-500">{ex.category}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{ex.description || ex.category}</p>
                        <p className="text-xs text-gray-400">{fmtDate(ex.expense_date)}</p>
                      </div>
                      {ex.receipt_path && <a href={ex.receipt_path} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600"><FileText className="w-4 h-4" /></a>}
                    </div>
                    <p className="text-sm font-bold text-gray-900">{money(ex.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Payments */}
          <Section title="Payments" icon={Wallet}
            action={paymentsData ? <span className="text-sm text-gray-400">{money(paymentsData.total)} received</span> : null}>
            <PaymentsTable payments={paymentsData?.payments || []} hideVehicle onChanged={invalidate} />
          </Section>
        </div>
      </div>

      {/* Modals */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Edit Vehicle" size="lg">
        <VehicleForm initial={v} submitting={updateVehicle.isPending} onCancel={() => setModal(null)} onSubmit={(p) => updateVehicle.mutate(p)} />
      </Modal>
      <Modal open={modal === 'book'} onClose={() => setModal(null)} title="New Booking" size="xl">
        <BookingForm vehicleId={v.id} submitting={addBooking.isPending} onCancel={() => setModal(null)} onSubmit={(p) => addBooking.mutate(p)} />
      </Modal>
      <Modal open={modal === 'maint'} onClose={() => setModal(null)} title="Add Maintenance" size="lg">
        <MaintenanceForm vehicleId={v.id} submitting={addMaint.isPending} onCancel={() => setModal(null)} onSubmit={(fd) => addMaint.mutate(fd)} />
      </Modal>
      <Modal open={modal === 'expense'} onClose={() => setModal(null)} title="Add Expense" size="md">
        <ExpenseForm vehicleId={v.id} lockVehicle submitting={addExpense.isPending} onCancel={() => setModal(null)} onSubmit={(fd) => addExpense.mutate(fd)} />
      </Modal>

      <PayModal booking={payBooking} onClose={() => setPayBooking(null)} onSubmit={(body) => addPayment.mutate({ bookingId: payBooking.id, body })} submitting={addPayment.isPending} />

      {returnBooking && <ReturnModal booking={returnBooking} onClose={() => setReturnBooking(null)} onDone={invalidate} />}

      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={() => delVehicle.mutate()} loading={delVehicle.isPending}
        title="Delete vehicle?" message="This permanently deletes the vehicle and all its bookings, maintenance and expenses." />
    </div>
  );
}

function PayModal({ booking, onClose, onSubmit, submitting }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [category, setCategory] = useState('RENTAL');
  const [receipt, setReceipt] = useState(null);
  if (!booking) return null;
  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('amount', amount); fd.append('method', method); fd.append('category', category);
    if (receipt) fd.append('receipt', receipt);
    onSubmit(fd);
  };
  return (
    <Modal open={!!booking} onClose={onClose} title={`Record Payment · ${booking.client_name}`} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm flex justify-between">
          <span className="text-gray-500">Balance due</span>
          <span className="font-bold text-red-600">{money(booking.balance)}</span>
        </div>
        <Field label="Amount (Rs) *"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {['CASH', 'BANK', 'CARD', 'OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="For">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {['RENTAL', 'DAMAGE', 'DEPOSIT', 'OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Receipt / Screenshot">
          <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs text-gray-500">
            <FileText className="w-3.5 h-3.5" /> {receipt ? receipt.name : 'Attach payment receipt (optional)'}
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setReceipt(e.target.files[0] || null)} />
          </label>
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>Save Payment</button>
        </div>
      </form>
    </Modal>
  );
}
