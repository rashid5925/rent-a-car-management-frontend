import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Paperclip } from 'lucide-react';
import api from '../../lib/api';
import { Field, Input, Select, Textarea, Spinner } from '../ui';

export default function MaintenanceForm({ vehicleId, onSubmit, submitting, onCancel }) {
  const [f, setF] = useState({
    vehicle_id: vehicleId || '',
    type: 'SERVICE',
    title: '',
    description: '',
    vendor: '',
    service_date: dayjs().format('YYYY-MM-DD'),
    odometer: '',
    cost: '',
    next_due_date: '',
    next_due_odometer: '',
  });
  const [files, setFiles] = useState([]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-min'],
    queryFn: async () => (await api.get('/vehicles')).data,
    enabled: !vehicleId,
  });

  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => v !== '' && v != null && fd.append(k, v));
    files.forEach((file) => fd.append('attachments', file));
    onSubmit(fd);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {!vehicleId && (
          <Field label="Vehicle *" className="sm:col-span-2">
            <Select value={f.vehicle_id} onChange={set('vehicle_id')} required>
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration_no}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Type">
          <Select value={f.type} onChange={set('type')}>
            {['SERVICE', 'REPAIR', 'MAINTENANCE', 'INSPECTION'].map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Cost (Rs) *"><Input type="number" value={f.cost} onChange={set('cost')} required /></Field>
        <Field label="Title *" className="sm:col-span-2"><Input value={f.title} onChange={set('title')} required placeholder="Engine oil & filter change" /></Field>
        <Field label="Vendor / Workshop"><Input value={f.vendor} onChange={set('vendor')} /></Field>
        <Field label="Service Date *"><Input type="date" value={f.service_date} onChange={set('service_date')} required /></Field>
        <Field label="Odometer (km)"><Input type="number" value={f.odometer} onChange={set('odometer')} /></Field>
        <Field label="Next Due Date"><Input type="date" value={f.next_due_date} onChange={set('next_due_date')} /></Field>
      </div>
      <Field label="Description"><Textarea rows={2} value={f.description} onChange={set('description')} /></Field>

      <Field label="Receipts & Photos">
        <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-50 text-sm text-gray-500">
          <Paperclip className="w-4 h-4" />
          {files.length ? `${files.length} file(s) selected` : 'Attach receipt or photo (image/PDF)'}
          <input type="file" multiple accept="image/*,application/pdf" className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files))} />
        </label>
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner className="w-4 h-4" />} Save Record
        </button>
      </div>
    </form>
  );
}
