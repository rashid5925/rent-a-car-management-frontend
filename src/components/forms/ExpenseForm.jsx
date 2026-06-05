import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Paperclip } from 'lucide-react';
import api from '../../lib/api';
import { Field, Input, Select, Spinner } from '../ui';

const CATEGORIES = ['FUEL', 'INSURANCE', 'REGISTRATION', 'FINE', 'TYRE', 'CLEANING', 'MAINTENANCE', 'OTHER'];

export default function ExpenseForm({ vehicleId, lockVehicle, onSubmit, submitting, onCancel }) {
  const [f, setF] = useState({
    vehicle_id: vehicleId || '',
    category: 'FUEL',
    amount: '',
    expense_date: dayjs().format('YYYY-MM-DD'),
    description: '',
  });
  const [file, setFile] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-min'],
    queryFn: async () => (await api.get('/vehicles')).data,
    enabled: !lockVehicle,
  });

  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => v !== '' && v != null && fd.append(k, v));
    if (file) fd.append('receipt', file);
    onSubmit(fd);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {!lockVehicle && (
          <Field label="Vehicle" className="sm:col-span-2" hint="Leave empty for a general / overhead expense">
            <Select value={f.vehicle_id} onChange={set('vehicle_id')}>
              <option value="">General (not a specific car)</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration_no}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Category">
          <Select value={f.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Amount (Rs) *"><Input type="number" value={f.amount} onChange={set('amount')} required /></Field>
        <Field label="Date *"><Input type="date" value={f.expense_date} onChange={set('expense_date')} required /></Field>
        <Field label="Description"><Input value={f.description} onChange={set('description')} placeholder="Petrol top-up" /></Field>
      </div>

      <Field label="Receipt">
        <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-50 text-sm text-gray-500">
          <Paperclip className="w-4 h-4" />
          {file ? file.name : 'Attach receipt (image/PDF)'}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
        </label>
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner className="w-4 h-4" />} Save Expense
        </button>
      </div>
    </form>
  );
}
