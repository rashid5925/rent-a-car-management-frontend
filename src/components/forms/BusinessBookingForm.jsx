import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../lib/api';
import { RATE_TYPE, money } from '../../lib/format';
import { Field, Input, Select, Spinner } from '../ui';

// Inclusive day count between two dates (min 1), mirroring the main booking form.
const daysOf = (s, e) => Math.max(1, dayjs(e).diff(dayjs(s), 'day') + 1);

// How many billing units a span of days covers for the chosen rate type.
function calcUnits(rateType, days) {
  if (rateType === 'MONTHLY') return Math.max(1, Math.ceil(days / 30));
  if (rateType === 'YEARLY') return Math.max(1, Math.ceil(days / 365));
  return Math.max(1, days);
}

// The vehicle's stored rate for the chosen charge type (daily/monthly/yearly).
const rateOf = (rt, veh) =>
  (rt === 'MONTHLY' ? veh?.monthly_rate : rt === 'YEARLY' ? veh?.yearly_rate : veh?.daily_rate) || '';

// Simple booking form for a business administrator's private ledger.
// When `vehicleId` is provided the vehicle is fixed (used on the vehicle page);
// otherwise the user picks a vehicle from a dropdown.
//
// Pricing is fully derived (no effects): the rate defaults to the car's saved
// rate for the chosen charge type, and the amount derives from rate × units —
// both stay editable via per-field "override" values that, once typed, win.
export default function BusinessBookingForm({ initial, vehicleId, onSubmit, submitting, onCancel }) {
  const isEdit = !!initial;
  const fixedVehicle = vehicleId || initial?.vehicle_id;
  const today = dayjs().format('YYYY-MM-DD');

  const [f, setF] = useState({
    vehicle_id: initial?.vehicle_id || vehicleId || '',
    start_date: initial?.start_date ? dayjs(initial.start_date).format('YYYY-MM-DD') : today,
    end_date: initial?.end_date ? dayjs(initial.end_date).format('YYYY-MM-DD') : today,
    is_paid: initial?.is_paid ? true : false,
    rate_type: 'DAILY',
    rateOverride: '',
    // Pre-seed the amount in edit mode so the saved value shows and is kept.
    amountOverride: initial?.amount != null ? String(initial.amount) : '',
  });

  // Only load the vehicle list when we actually need the picker.
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles', 'picker'],
    queryFn: async () => (await api.get('/vehicles')).data,
    enabled: !fixedVehicle,
  });

  // When the vehicle is fixed (vehicle page), fetch it so we know its stored rates.
  const { data: fixedVehicleData } = useQuery({
    queryKey: ['vehicle', fixedVehicle, 'rates'],
    queryFn: async () => (await api.get(`/vehicles/${fixedVehicle}`)).data,
    enabled: !!fixedVehicle,
  });

  const selectedVehicle = fixedVehicle
    ? fixedVehicleData
    : vehicles.find((v) => String(v.id) === String(f.vehicle_id));

  // ---- Derived pricing (recomputed every render, never stored) -------------
  const days = daysOf(f.start_date, f.end_date);
  const unit = RATE_TYPE[f.rate_type]?.unit || 'day';
  const units = calcUnits(f.rate_type, days);
  const vehicleRate = rateOf(f.rate_type, selectedVehicle);
  const rateValue = f.rateOverride !== '' ? f.rateOverride : vehicleRate;
  const rateNum = Number(rateValue) || 0;
  const computedAmount = rateNum > 0 ? rateNum * units : 0;
  const amountValue =
    f.amountOverride !== '' ? f.amountOverride : (computedAmount > 0 ? String(computedAmount) : '');

  // Changing any pricing input lets the amount re-derive (clears its override).
  const setCalc = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value, amountOverride: '' }));
  // Picking a car / charge type also refreshes the rate from the car.
  const onVehicle = (e) => setF((s) => ({ ...s, vehicle_id: e.target.value, rateOverride: '', amountOverride: '' }));
  const onRateType = (e) => setF((s) => ({ ...s, rate_type: e.target.value, rateOverride: '', amountOverride: '' }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      vehicle_id: Number(f.vehicle_id),
      start_date: f.start_date,
      end_date: f.end_date,
      amount: Number(amountValue) || 0,
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
            <Select value={f.vehicle_id} onChange={onVehicle} required>
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
          <Input type="date" value={f.start_date} onChange={setCalc('start_date')} required />
        </Field>
        <Field label="To (end date)">
          <Input type="date" value={f.end_date} onChange={setCalc('end_date')} required />
        </Field>
      </div>

      {/* Optional price helper — fills the amount automatically. */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Work out the price (optional)</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Charge by">
            <Select value={f.rate_type} onChange={onRateType}>
              {Object.entries(RATE_TYPE).map(([k, val]) => (
                <option key={k} value={k}>{val.label}</option>
              ))}
            </Select>
          </Field>
          <Field label={`Rate per ${unit} (Rs)`} hint="From the car's saved rate — you can change it">
            <Input type="number" min="0" step="any" inputMode="numeric" placeholder="e.g. 5000"
              value={rateValue} onChange={setCalc('rateOverride')} />
          </Field>
        </div>
        <p className="text-xs text-gray-500">
          {days} day{days > 1 ? 's' : ''}
          {rateNum > 0 && (
            <> = {units} {unit}{units > 1 ? 's' : ''} × {money(rateNum)} = <b className="text-gray-800">{money(computedAmount)}</b></>
          )}
        </p>
      </div>

      <Field label="Amount (Rs)" hint="Filled from the price above — you can change it">
        <Input type="number" min="0" step="any" inputMode="numeric" placeholder="e.g. 15000"
          value={amountValue} onChange={(e) => setF((s) => ({ ...s, amountOverride: e.target.value }))} required />
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
