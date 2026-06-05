import { useState } from 'react';
import { Field, Input, Textarea, Spinner } from '../ui';

const empty = { name: '', phone: '', cnic: '', address: '', default_profit_share_pct: 50, notes: '' };

export default function InvestorForm({ initial, onSubmit, submitting, onCancel }) {
  const [f, setF] = useState({ ...empty, ...(initial || {}) });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name *" className="sm:col-span-2"><Input value={f.name} onChange={set('name')} required /></Field>
        <Field label="Phone"><Input value={f.phone || ''} onChange={set('phone')} placeholder="0300-1234567" /></Field>
        <Field label="CNIC"><Input value={f.cnic || ''} onChange={set('cnic')} placeholder="35202-1234567-1" /></Field>
        <Field label="Default profit share (% of net)" hint="Used as the default for this investor's cars">
          <Input type="number" step="0.01" value={f.default_profit_share_pct} onChange={set('default_profit_share_pct')} />
        </Field>
        <Field label="Address"><Input value={f.address || ''} onChange={set('address')} /></Field>
      </div>
      <Field label="Notes"><Textarea rows={2} value={f.notes || ''} onChange={set('notes')} /></Field>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner className="w-4 h-4" />} Save Investor
        </button>
      </div>
    </form>
  );
}
