import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { Field, Input, Select, Textarea, Spinner } from '../ui';
import { money, daysBetween } from '../../lib/format';

export default function BookingForm({ vehicleId, vehicleDailyRate, onSubmit, submitting, onCancel }) {
  const today = dayjs().format('YYYY-MM-DD');
  const [f, setF] = useState({
    vehicle_id: vehicleId || '',
    client_id: '',
    start_date: today,
    end_date: today,
    daily_rate: vehicleDailyRate || '',
    driver_charge: 0,
    discount: 0,
    security_deposit: 0,
    with_driver: 0,
    status: 'RESERVED',
    initial_payment: '',
    payment_method: 'CASH',
    notes: '',
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-min'],
    queryFn: async () => (await api.get('/vehicles')).data,
    enabled: !vehicleId,
  });

  const days = useMemo(
    () => (f.start_date && f.end_date ? Math.max(1, daysBetween(f.start_date, f.end_date)) : 1),
    [f.start_date, f.end_date]
  );
  const total = (Number(f.daily_rate) || 0) * days + (Number(f.driver_charge) || 0) - (Number(f.discount) || 0);

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ ...f, with_driver: Number(f.driver_charge) > 0 ? 1 : 0 });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {!vehicleId && (
          <Field label="Vehicle *" className="sm:col-span-2">
            <Select value={f.vehicle_id} onChange={(e) => {
              const v = vehicles.find((x) => String(x.id) === e.target.value);
              setF((s) => ({ ...s, vehicle_id: e.target.value, daily_rate: v?.daily_rate || s.daily_rate }));
            }} required>
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration_no}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Client *">
          <Select value={f.client_id} onChange={set('client_id')} required>
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={f.status} onChange={set('status')}>
            <option value="RESERVED">Reserved</option>
            <option value="ACTIVE">Active (car handed over)</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </Field>
        <Field label="Start Date *"><Input type="date" value={f.start_date} onChange={set('start_date')} required /></Field>
        <Field label="End Date *"><Input type="date" value={f.end_date} onChange={set('end_date')} required /></Field>
        <Field label="Daily Rate (Rs) *"><Input type="number" value={f.daily_rate} onChange={set('daily_rate')} required /></Field>
        <Field label="Driver Charge (Rs)"><Input type="number" value={f.driver_charge} onChange={set('driver_charge')} /></Field>
        <Field label="Discount (Rs)"><Input type="number" value={f.discount} onChange={set('discount')} /></Field>
        <Field label="Security Deposit (Rs)"><Input type="number" value={f.security_deposit} onChange={set('security_deposit')} /></Field>
      </div>

      <div className="rounded-xl bg-brand-50 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-brand-700">{days} day(s) × rate {money(f.daily_rate)}</span>
        <span className="font-bold text-brand-700">Total {money(total)}</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Advance / Initial Payment (Rs)"><Input type="number" value={f.initial_payment} onChange={set('initial_payment')} placeholder="Optional" /></Field>
        <Field label="Payment Method">
          <Select value={f.payment_method} onChange={set('payment_method')}>
            {['CASH', 'BANK', 'CARD', 'OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={set('notes')} /></Field>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner className="w-4 h-4" />} Create Booking
        </button>
      </div>
    </form>
  );
}
