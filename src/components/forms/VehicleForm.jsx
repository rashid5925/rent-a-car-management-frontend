import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Field, Input, Select, Textarea, Spinner } from '../ui';
import { PROFIT_MODEL } from '../../lib/format';

const empty = {
  make: '', model: '', year: '', registration_no: '', color: '', category: 'Sedan',
  seats: 5, transmission: 'AUTOMATIC', fuel_type: 'PETROL', daily_rate: '',
  ownership_type: 'OWNED', investor_id: '', profit_model: 'NET_SHARE',
  investor_share_pct: 50, manager_commission_pct: 20, fixed_payout_amount: '',
  purchase_price: '', purchase_date: '', current_odometer: '', status: 'AVAILABLE', notes: '',
};

export default function VehicleForm({ initial, onSubmit, submitting, onCancel }) {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const [f, setF] = useState({ ...empty, ...(initial || {}) });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const { data: investors = [] } = useQuery({
    queryKey: ['investors'],
    queryFn: async () => (await api.get('/investors')).data,
    enabled: isOwner,
  });

  const isInvestor = f.ownership_type === 'INVESTOR';

  const submit = (e) => {
    e.preventDefault();
    onSubmit(f);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Make *"><Input value={f.make} onChange={set('make')} required placeholder="Toyota" /></Field>
        <Field label="Model *"><Input value={f.model} onChange={set('model')} required placeholder="Corolla GLi" /></Field>
        <Field label="Registration No *"><Input value={f.registration_no} onChange={set('registration_no')} required placeholder="LEB-21-1234" /></Field>
        <Field label="Year"><Input type="number" value={f.year || ''} onChange={set('year')} placeholder="2022" /></Field>
        <Field label="Color"><Input value={f.color || ''} onChange={set('color')} /></Field>
        <Field label="Category"><Input value={f.category || ''} onChange={set('category')} placeholder="Sedan / SUV / Van" /></Field>
        <Field label="Seats"><Input type="number" value={f.seats || ''} onChange={set('seats')} /></Field>
        <Field label="Daily Rate (Rs) *"><Input type="number" value={f.daily_rate} onChange={set('daily_rate')} required /></Field>
        <Field label="Transmission">
          <Select value={f.transmission} onChange={set('transmission')}>
            <option value="AUTOMATIC">Automatic</option>
            <option value="MANUAL">Manual</option>
          </Select>
        </Field>
        <Field label="Fuel">
          <Select value={f.fuel_type} onChange={set('fuel_type')}>
            {['PETROL', 'DIESEL', 'HYBRID', 'CNG', 'ELECTRIC'].map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="Odometer (km)"><Input type="number" value={f.current_odometer || ''} onChange={set('current_odometer')} /></Field>
        <Field label="Status">
          <Select value={f.status} onChange={set('status')}>
            {['AVAILABLE', 'RENTED', 'MAINTENANCE', 'INACTIVE'].map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
      </div>

      {/* Ownership & investor profit terms */}
      <div className="rounded-2xl bg-gray-50 p-4 space-y-4">
        <Field label="Ownership">
          <div className="grid grid-cols-2 gap-2">
            {['OWNED', 'INVESTOR'].map((o) => (
              <button type="button" key={o} onClick={() => setF((s) => ({ ...s, ownership_type: o }))}
                className={`btn ${f.ownership_type === o ? 'btn-primary' : 'btn-ghost'}`}>
                {o === 'OWNED' ? 'Company owned' : 'Investor owned'}
              </button>
            ))}
          </div>
        </Field>

        {isInvestor && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Investor *">
              <Select value={f.investor_id || ''} onChange={set('investor_id')} required>
                <option value="">Select investor…</option>
                {investors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </Field>
            <Field label="Profit Model">
              <Select value={f.profit_model} onChange={set('profit_model')}>
                {Object.entries(PROFIT_MODEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            {f.profit_model === 'NET_SHARE' && (
              <Field label="Investor share of net profit (%)" hint="Manager keeps the rest">
                <Input type="number" step="0.01" value={f.investor_share_pct} onChange={set('investor_share_pct')} />
              </Field>
            )}
            {f.profit_model === 'GROSS_COMMISSION' && (
              <Field label="Manager commission (% of gross)" hint="Investor gets gross − commission − expenses">
                <Input type="number" step="0.01" value={f.manager_commission_pct} onChange={set('manager_commission_pct')} />
              </Field>
            )}
            {f.profit_model === 'FIXED' && (
              <Field label="Fixed payout to investor (Rs / period)">
                <Input type="number" value={f.fixed_payout_amount} onChange={set('fixed_payout_amount')} />
              </Field>
            )}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Purchase Price (Rs)"><Input type="number" value={f.purchase_price || ''} onChange={set('purchase_price')} /></Field>
        <Field label="Purchase Date"><Input type="date" value={f.purchase_date || ''} onChange={set('purchase_date')} /></Field>
      </div>
      <Field label="Notes"><Textarea rows={2} value={f.notes || ''} onChange={set('notes')} /></Field>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner className="w-4 h-4" />} Save Vehicle
        </button>
      </div>
    </form>
  );
}
