import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, CalendarDays, Wallet, FileText, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { money, fmtDate, BOOKING_STATUS } from '../lib/format';
import { PageHeader } from '../components/common';
import { Modal, Loading, EmptyState, StatusBadge, Select, Field, Input } from '../components/ui';
import Pagination from '../components/Pagination';
import BookingForm from '../components/forms/BookingForm';
import ReturnModal from '../components/ReturnModal';

const PER_PAGE = 50;

export default function Bookings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pay, setPay] = useState(null);
  const [ret, setRet] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', status, page],
    queryFn: async () =>
      (await api.get('/bookings', { params: { ...(status ? { status } : {}), page, limit: PER_PAGE } })).data,
  });
  const bookings = data?.data ?? [];
  const total = data?.total ?? 0;

  const onStatus = (e) => { setStatus(e.target.value); setPage(1); };
  const invalidate = () => qc.invalidateQueries({ queryKey: ['bookings'] });

  const create = useMutation({
    mutationFn: (p) => api.post('/bookings', p),
    onSuccess: () => { invalidate(); setAdding(false); toast.success('Booking created'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const changeStatus = useMutation({
    mutationFn: ({ id, s }) => api.patch(`/bookings/${id}/status`, { status: s }),
    onSuccess: () => { invalidate(); toast.success('Status updated'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const addPay = useMutation({
    mutationFn: ({ id, body }) => api.post(`/bookings/${id}/payments`, body),
    onSuccess: () => { invalidate(); setPay(null); toast.success('Payment recorded'); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <PageHeader title="Bookings" subtitle={`${total.toLocaleString()} booking(s)`}
        action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> New Booking</button>} />

      <div className="flex gap-2 mb-5">
        <Select className="w-auto" value={status} onChange={onStatus}>
          <option value="">All statuses</option>
          {Object.keys(BOOKING_STATUS).map((s) => <option key={s} value={s}>{BOOKING_STATUS[s].label}</option>)}
        </Select>
      </div>

      {isLoading ? <Loading /> : bookings.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No bookings" action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> New Booking</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400 uppercase">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Vehicle</th>
                  <th className="text-left font-semibold px-4 py-3">Client</th>
                  <th className="text-left font-semibold px-4 py-3">Period</th>
                  <th className="text-right font-semibold px-4 py-3">Total</th>
                  <th className="text-right font-semibold px-4 py-3">Balance</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/vehicles/${b.vehicle_id}`} className="font-semibold text-gray-800 hover:text-brand-600">{b.make} {b.model}</Link>
                      <p className="text-xs text-gray-400">{b.registration_no}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{b.client_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(b.total_amount)}</td>
                    <td className={`px-4 py-3 text-right ${Number(b.balance) > 0 ? 'text-red-500 font-semibold' : 'text-emerald-600'}`}>{Number(b.balance) > 0 ? money(b.balance) : 'Paid'}</td>
                    <td className="px-4 py-3">
                      <Select className="w-auto text-xs py-1.5" value={b.status} onChange={(e) => changeStatus.mutate({ id: b.id, s: e.target.value })}>
                        {Object.keys(BOOKING_STATUS)
                          .filter((s) => s !== 'COMPLETED' || isOwner || b.status === 'COMPLETED')
                          .map((s) => <option key={s} value={s}>{BOOKING_STATUS[s].label}</option>)}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {b.status !== 'CANCELLED' && <button className="btn-ghost btn-sm mr-1" onClick={() => setRet(b)} title="Record return / damage"><RotateCcw className="w-3.5 h-3.5" /> Return</button>}
                      {Number(b.balance) > 0 && <button className="btn-ghost btn-sm mr-1" onClick={() => setPay(b)}><Wallet className="w-3.5 h-3.5" /> Pay</button>}
                      <Link to={`/bookings/${b.id}/receipt`} className="btn-ghost btn-sm"><FileText className="w-3.5 h-3.5" /> Receipt</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-3">
            <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} limit={PER_PAGE} onPage={setPage} />
          </div>
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="New Booking" size="xl">
        <BookingForm submitting={create.isPending} onCancel={() => setAdding(false)} onSubmit={(p) => create.mutate(p)} />
      </Modal>

      {pay && (
        <PayModal booking={pay} onClose={() => setPay(null)} submitting={addPay.isPending}
          onSubmit={(body) => addPay.mutate({ id: pay.id, body })} />
      )}
      {ret && (
        <ReturnModal booking={ret} onClose={() => setRet(null)} onDone={invalidate} />
      )}
    </div>
  );
}

function PayModal({ booking, onClose, onSubmit, submitting }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [category, setCategory] = useState('RENTAL');
  const [receipt, setReceipt] = useState(null);
  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('amount', amount); fd.append('method', method); fd.append('category', category);
    if (receipt) fd.append('receipt', receipt);
    onSubmit(fd);
  };
  return (
    <Modal open onClose={onClose} title={`Record Payment · ${booking.client_name}`} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm flex justify-between">
          <span className="text-gray-500">Balance due</span><span className="font-bold text-red-600">{money(booking.balance)}</span>
        </div>
        <Field label="Amount (Rs) *"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value)}>{['CASH', 'BANK', 'CARD', 'OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}</Select></Field>
          <Field label="For"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{['RENTAL', 'DAMAGE', 'DEPOSIT', 'OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}</Select></Field>
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
