import { useState } from 'react';
import { Field, Input, Select, Spinner } from '../ui';

export default function UserForm({ initial, onSubmit, submitting, onCancel }) {
  const isEdit = !!initial;
  const [f, setF] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    role: initial?.role || 'STAFF',
    password: '',
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name *"><Input value={f.name} onChange={set('name')} required /></Field>
        <Field label="Email *"><Input type="email" value={f.email} onChange={set('email')} required /></Field>
        <Field label="Role">
          <Select value={f.role} onChange={set('role')}>
            <option value="STAFF">Staff (operations only)</option>
            <option value="BUSINESS_ADMIN">Business Admin (own booking ledger)</option>
            <option value="OWNER">Owner (full access)</option>
          </Select>
        </Field>
        <Field label={isEdit ? 'New password (optional)' : 'Password *'} hint="Minimum 6 characters">
          <Input type="password" value={f.password} onChange={set('password')} required={!isEdit} minLength={6} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Spinner className="w-4 h-4" />} {isEdit ? 'Save User' : 'Create User'}
        </button>
      </div>
    </form>
  );
}
