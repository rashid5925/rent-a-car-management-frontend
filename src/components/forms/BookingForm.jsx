import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus, X, Paperclip, UserPlus, UserCheck, Search } from 'lucide-react';
import api from '../../lib/api';
import { Field, Input, Select, Textarea, Spinner } from '../ui';
import DamageDiagram from '../DamageDiagram';
import { money, daysBetween, RATE_TYPE } from '../../lib/format';

function suggestUnits(rateType, start, end) {
  if (!start || !end) return 1;
  const days = Math.max(1, daysBetween(start, end));
  if (rateType === 'MONTHLY') return Math.max(1, Math.ceil(days / 30));
  if (rateType === 'YEARLY') return Math.max(1, Math.ceil(days / 365));
  return days;
}

const FileBtn = ({ label, file, onChange, accept = 'image/*' }) => (
  <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs text-gray-500">
    <Paperclip className="w-3.5 h-3.5 shrink-0" />
    <span className="truncate">{file ? file.name : label}</span>
    <input type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files[0] || null)} />
  </label>
);

export default function BookingForm({ vehicleId, onSubmit, submitting, onCancel }) {
  const today = dayjs().format('YYYY-MM-DD');
  const [clientMode, setClientMode] = useState('new'); // 'new' | 'existing'
  const [clientSearch, setClientSearch] = useState('');
  const [f, setF] = useState({
    vehicle_id: vehicleId || '',
    client_id: '',
    client_name: '', client_phone: '', client_cnic: '', client_address: '', client_license: '',
    start_date: today, start_time: '10:00', end_date: today, end_time: '10:00',
    rate_type: 'DAILY', rate_amount: '', rate_units: 1,
    driver_charge: 0, discount: 0, security_deposit: 0,
    status: 'RESERVED', notes: '', damage_notes: '',
    initial_payment: '', payment_method: 'CASH', payment_category: 'RENTAL',
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  // Files
  const [clientPhoto, setClientPhoto] = useState(null);
  const [clientCnicFront, setClientCnicFront] = useState(null);
  const [clientCnicBack, setClientCnicBack] = useState(null);
  const [carPhotos, setCarPhotos] = useState([]);
  const [carVideo, setCarVideo] = useState(null);
  const [damagePhotos, setDamagePhotos] = useState([]);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [referrers, setReferrers] = useState([]);

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: async () => (await api.get('/clients')).data });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: async () => (await api.get('/vehicles')).data });

  const vehicle = useMemo(() => vehicles.find((v) => String(v.id) === String(f.vehicle_id)), [vehicles, f.vehicle_id]);
  const selectedClient = useMemo(() => clients.find((c) => String(c.id) === String(f.client_id)), [clients, f.client_id]);
  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase();
    return q ? clients.filter((c) => `${c.name} ${c.phone} ${c.cnic}`.toLowerCase().includes(q)) : clients;
  }, [clients, clientSearch]);

  const rateOf = (rt, veh) => (rt === 'MONTHLY' ? veh?.monthly_rate : rt === 'YEARLY' ? veh?.yearly_rate : veh?.daily_rate) || '';

  // When vehicle changes, auto-fill rate for current rate type.
  const onVehicle = (e) => {
    const id = e.target.value;
    const veh = vehicles.find((v) => String(v.id) === id);
    setF((s) => ({ ...s, vehicle_id: id, rate_amount: rateOf(s.rate_type, veh) }));
  };
  const onRateType = (e) => {
    const rt = e.target.value;
    setF((s) => ({ ...s, rate_type: rt, rate_amount: rateOf(rt, vehicle) || s.rate_amount, rate_units: suggestUnits(rt, s.start_date, s.end_date) }));
  };
  const onDate = (k) => (e) => setF((s) => {
    const next = { ...s, [k]: e.target.value };
    return { ...next, rate_units: suggestUnits(next.rate_type, next.start_date, next.end_date) };
  });

  // Default rate fill once vehicle is known (fixed vehicleId case)
  useMemo(() => {
    if (vehicle && f.rate_amount === '') setF((s) => ({ ...s, rate_amount: rateOf(s.rate_type, vehicle) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle]);

  const rental = (Number(f.rate_amount) || 0) * (Number(f.rate_units) || 0);
  const total = rental + Number(f.driver_charge || 0) - Number(f.discount || 0);

  const addReferrer = () => setReferrers((r) => [...r, { name: '', phone: '', cnic: '', front: null, back: null }]);
  const setRef = (i, k, v) => setReferrers((r) => r.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const removeRef = (i) => setReferrers((r) => r.filter((_, idx) => idx !== i));

  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    const scalars = ['vehicle_id', 'start_date', 'start_time', 'end_date', 'end_time', 'rate_type',
      'rate_amount', 'rate_units', 'driver_charge', 'discount', 'security_deposit',
      'status', 'notes', 'damage_notes', 'initial_payment', 'payment_method', 'payment_category'];
    scalars.forEach((k) => f[k] !== '' && f[k] != null && fd.append(k, f[k]));

    if (clientMode === 'existing') {
      fd.append('client_id', f.client_id);
    } else {
      ['client_name', 'client_phone', 'client_cnic', 'client_address', 'client_license'].forEach((k) => f[k] && fd.append(k, f[k]));
      if (clientPhoto) fd.append('client_photo', clientPhoto);
      if (clientCnicFront) fd.append('client_cnic_front', clientCnicFront);
      if (clientCnicBack) fd.append('client_cnic_back', clientCnicBack);
    }

    fd.append('damage_markers', JSON.stringify(markers));
    fd.append('referrers', JSON.stringify(referrers.map((r) => ({ name: r.name, phone: r.phone, cnic: r.cnic }))));
    referrers.forEach((r, i) => {
      if (r.front) fd.append(`referrer_cnic_front_${i}`, r.front);
      if (r.back) fd.append(`referrer_cnic_back_${i}`, r.back);
    });
    carPhotos.forEach((file) => fd.append('car_photos', file));
    if (carVideo) fd.append('car_video', carVideo);
    damagePhotos.forEach((file) => fd.append('damage_photos', file));
    if (paymentReceipt) fd.append('payment_receipt', paymentReceipt);

    onSubmit(fd);
  };

  const sectionCls = 'rounded-2xl border border-gray-100 p-4';
  const head = 'text-xs font-bold text-gray-700 uppercase tracking-wide mb-3';

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Vehicle + dates */}
      <div className={sectionCls}>
        <p className={head}>Vehicle & Period</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {!vehicleId && (
            <Field label="Vehicle *" className="sm:col-span-2">
              <Select value={f.vehicle_id} onChange={onVehicle} required>
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration_no}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Start Date *"><Input type="date" value={f.start_date} onChange={onDate('start_date')} required /></Field>
          <Field label="Start Time"><Input type="time" value={f.start_time} onChange={set('start_time')} /></Field>
          <Field label="End Date *"><Input type="date" value={f.end_date} onChange={onDate('end_date')} required /></Field>
          <Field label="End Time"><Input type="time" value={f.end_time} onChange={set('end_time')} /></Field>
        </div>
      </div>

      {/* Pricing */}
      <div className={sectionCls}>
        <p className={head}>Pricing</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Rate Type">
            <Select value={f.rate_type} onChange={onRateType}>
              {Object.entries(RATE_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label={`Rate per ${RATE_TYPE[f.rate_type].unit} (Rs) *`}><Input type="number" value={f.rate_amount} onChange={set('rate_amount')} required /></Field>
          <Field label={`No. of ${RATE_TYPE[f.rate_type].unit}s`}><Input type="number" step="0.5" value={f.rate_units} onChange={set('rate_units')} /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          <Field label="Driver Charge (Rs)"><Input type="number" value={f.driver_charge} onChange={set('driver_charge')} /></Field>
          <Field label="Discount (Rs)"><Input type="number" value={f.discount} onChange={set('discount')} /></Field>
          <Field label="Security Deposit (Rs)"><Input type="number" value={f.security_deposit} onChange={set('security_deposit')} /></Field>
        </div>
        <div className="rounded-xl bg-brand-50 px-4 py-3 flex items-center justify-between mt-4">
          <span className="text-sm text-brand-700">{f.rate_units} {RATE_TYPE[f.rate_type].unit}(s) × {money(f.rate_amount)}</span>
          <span className="font-bold text-brand-700">Total {money(total)}</span>
        </div>
      </div>

      {/* Client */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between mb-3">
          <p className={head + ' mb-0'}>Client</p>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button type="button" onClick={() => setClientMode('new')} className={`btn-sm ${clientMode === 'new' ? 'btn-primary' : 'btn-ghost'}`}><UserPlus className="w-3.5 h-3.5" /> New</button>
            <button type="button" onClick={() => setClientMode('existing')} className={`btn-sm ${clientMode === 'existing' ? 'btn-primary' : 'btn-ghost'}`}><UserCheck className="w-3.5 h-3.5" /> Existing</button>
          </div>
        </div>

        {clientMode === 'existing' ? (
          <div>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input className="pl-9" placeholder="Search client by name, phone, CNIC…" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
            </div>
            <Select value={f.client_id} onChange={set('client_id')} required>
              <option value="">Select client…</option>
              {filteredClients.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ''} {c.cnic ? `· ${c.cnic}` : ''}</option>)}
            </Select>
            {selectedClient && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                <span>CNIC: {selectedClient.cnic || '—'}</span>
                {selectedClient.cnic_front && <a href={selectedClient.cnic_front} target="_blank" rel="noreferrer" className="text-brand-600">CNIC front ↗</a>}
                {selectedClient.cnic_back && <a href={selectedClient.cnic_back} target="_blank" rel="noreferrer" className="text-brand-600">CNIC back ↗</a>}
                {selectedClient.photo && <a href={selectedClient.photo} target="_blank" rel="noreferrer" className="text-brand-600">Photo ↗</a>}
              </div>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Name *"><Input value={f.client_name} onChange={set('client_name')} required={clientMode === 'new'} /></Field>
            <Field label="Phone"><Input value={f.client_phone} onChange={set('client_phone')} /></Field>
            <Field label="CNIC"><Input value={f.client_cnic} onChange={set('client_cnic')} placeholder="35202-1234567-1" /></Field>
            <Field label="License No"><Input value={f.client_license} onChange={set('client_license')} /></Field>
            <Field label="Address" className="sm:col-span-2"><Input value={f.client_address} onChange={set('client_address')} /></Field>
            <Field label="Client Photo"><FileBtn label="Upload photo" file={clientPhoto} onChange={setClientPhoto} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="CNIC Front"><FileBtn label="Front" file={clientCnicFront} onChange={setClientCnicFront} /></Field>
              <Field label="CNIC Back"><FileBtn label="Back" file={clientCnicBack} onChange={setClientCnicBack} /></Field>
            </div>
          </div>
        )}
      </div>

      {/* Referrers / guarantors */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between mb-3">
          <p className={head + ' mb-0'}>Referred / Guaranteed by</p>
          <button type="button" className="btn-ghost btn-sm" onClick={addReferrer}><Plus className="w-3.5 h-3.5" /> Add person</button>
        </div>
        {referrers.length === 0 && <p className="text-xs text-gray-400">Optional — add guarantors who referred this booking.</p>}
        <div className="space-y-3">
          {referrers.map((r, i) => (
            <div key={i} className="rounded-xl bg-gray-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">Person {i + 1}</span>
                <button type="button" onClick={() => removeRef(i)} className="p-1 rounded hover:bg-red-50 text-red-500"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <Input placeholder="Name *" value={r.name} onChange={(e) => setRef(i, 'name', e.target.value)} />
                <Input placeholder="Phone" value={r.phone} onChange={(e) => setRef(i, 'phone', e.target.value)} />
                <Input placeholder="CNIC" value={r.cnic} onChange={(e) => setRef(i, 'cnic', e.target.value)} />
                <FileBtn label="CNIC Front" file={r.front} onChange={(file) => setRef(i, 'front', file)} />
                <FileBtn label="CNIC Back" file={r.back} onChange={(file) => setRef(i, 'back', file)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Car condition at handover (documents EXISTING damage before the rental) */}
      <div className={sectionCls}>
        <p className={head}>Car Condition at Handover</p>
        <p className="text-xs text-gray-400 -mt-2 mb-3">Record the car's existing condition now. Any new damage at return is charged when you complete the booking.</p>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <Field label="Car Photos">
            <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs text-gray-500">
              <Paperclip className="w-3.5 h-3.5" /> {carPhotos.length ? `${carPhotos.length} photo(s)` : 'Upload photos'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setCarPhotos(Array.from(e.target.files))} />
            </label>
          </Field>
          <Field label="Car Video"><FileBtn label="Upload video" file={carVideo} onChange={setCarVideo} accept="video/*" /></Field>
          <Field label="Damage Photos">
            <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs text-gray-500">
              <Paperclip className="w-3.5 h-3.5" /> {damagePhotos.length ? `${damagePhotos.length} photo(s)` : 'Upload photos'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setDamagePhotos(Array.from(e.target.files))} />
            </label>
          </Field>
        </div>
        <Field label="Mark scratches / dents on the diagram">
          <DamageDiagram value={markers} onChange={setMarkers} />
        </Field>
        <Field label="Existing damage / condition notes" className="mt-3"><Textarea rows={2} value={f.damage_notes} onChange={set('damage_notes')} placeholder="e.g. small dent on left door, windscreen chip…" /></Field>
      </div>

      {/* Payment + status */}
      <div className={sectionCls}>
        <p className={head}>Payment & Status</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Initial Payment (Rs)"><Input type="number" value={f.initial_payment} onChange={set('initial_payment')} placeholder="Optional" /></Field>
          <Field label="Method"><Select value={f.payment_method} onChange={set('payment_method')}>{['CASH', 'BANK', 'CARD', 'OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}</Select></Field>
          <Field label="Payment Receipt"><FileBtn label="Upload receipt/screenshot" file={paymentReceipt} onChange={setPaymentReceipt} accept="image/*,application/pdf" /></Field>
          <Field label="Booking Status">
            <Select value={f.status} onChange={set('status')}>
              <option value="RESERVED">Reserved</option>
              <option value="ACTIVE">Active (car handed over)</option>
              <option value="COMPLETED">Completed</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes" className="mt-4"><Textarea rows={2} value={f.notes} onChange={set('notes')} /></Field>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner className="w-4 h-4" />} Create Booking
        </button>
      </div>
    </form>
  );
}
