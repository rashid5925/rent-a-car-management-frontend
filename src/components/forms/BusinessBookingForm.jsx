import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { Field, Input, Select, Spinner } from '../ui';

// Simple booking form for a business administrator's private ledger.
// When `vehicleId` is provided the vehicle is fixed (used on the vehicle page);
// otherwise the user picks a vehicle from a dropdown.
export default function BusinessBookingForm({ initial, vehicleId, onSubmit, submitting, onCancel }) {
  const isEdit = !!initial;
  const fixedVehicle = vehicleId || initial?.vehicle_id;
  const today = dayjs().format('YYYY-MM-DD');

  const [f, setF] = useState({
    vehicle_id: initial?.vehicle_id || vehicleId || '',
    start_date: initial?.start_date ? dayjs(initial.start_date).format('YYYY-MM-DD') : today,
    end_date: initial?.end_date ? dayjs(initial.end_date).format('YYYY-MM-DD') : today,
    amount: initial?.amount ?? '',
    is_paid: initial?.is_paid ? true : false,
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  // Only load the vehicle list when we actually need the picker.
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles', 'picker'],
    queryFn: async () => (await api.get('/vehicles')).data,
    enabled: !fixedVehicle,
  });

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      vehicle_id: Number(f.vehicle_id),
      start_date: f.start_date,
      end_date: f.end_date,
      amount: Number(f.amount) || 0,
      is_paid: f.is_paid,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {!fixedVehicle && (
        <Field label="Which car?">
          {loadingVehicles ? (
            <div className="text-sm text-gray-400 flex items-center gap-2"><Spinner className="w-4 h-4" /> Loading cars…</div>
          ) : (
            <Select value={f.vehicle_id} onChange={set('vehicle_id')} required>
              <option value="">Select a car…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.make} {v.model} — {v.registration_no}</option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="From (start date)">
          <Input type="date" value={f.start_date} onChange={set('start_date')} required />
        </Field>
        <Field label="To (end date)">
          <Input type="date" value={f.end_date} onChange={set('end_date')} required />
        </Field>
      </div>

      <Field label="Amount (Rs)" hint="Total amount for this booking">
        <Input type="number" min="0" step="any" inputMode="numeric" placeholder="e.g. 15000"
          value={f.amount} onChange={set('amount')} required />
      </Field>

      <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50">
        <input type="checkbox" className="w-5 h-5 accent-brand-600"
          checked={f.is_paid} onChange={(e) => setF((s) => ({ ...s, is_paid: e.target.checked }))} />
        <span className="text-sm font-medium text-gray-800">Already paid</span>
        <span className="text-xs text-gray-400">Tick if you have received the money</span>
      </label>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner className="w-4 h-4" />} {isEdit ? 'Save Booking' : 'Add Booking'}
        </button>
      </div>
    </form>
  );
}
