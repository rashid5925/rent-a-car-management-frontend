import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Receipt, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { money, fmtDate } from '../lib/format';
import { PageHeader } from '../components/common';
import { Modal, Loading, EmptyState, Select } from '../components/ui';
import ExpenseForm from '../components/forms/ExpenseForm';

const CATEGORIES = ['FUEL', 'INSURANCE', 'REGISTRATION', 'FINE', 'TYRE', 'CLEANING', 'MAINTENANCE', 'OTHER'];

export default function Expenses() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['expenses', category],
    queryFn: async () => (await api.get('/expenses', { params: category ? { category } : {} })).data,
  });
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  const create = useMutation({
    mutationFn: (fd) => api.post('/expenses', fd),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setAdding(false); toast.success('Expense added'); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <PageHeader title="Expenses" subtitle={`${rows.length} expense(s) · ${money(total)} total`}
        action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Expense</button>} />

      <div className="flex gap-2 mb-5">
        <Select className="w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {isLoading ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses logged" action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Expense</button>} />
      ) : (
        <div className="card divide-y divide-gray-100">
          {rows.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="badge bg-gray-100 text-gray-500 shrink-0">{ex.category}</span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{ex.description || ex.category}</p>
                  <p className="text-xs text-gray-400">
                    {fmtDate(ex.expense_date)}
                    {ex.vehicle_id ? <> · <Link to={`/vehicles/${ex.vehicle_id}`} className="hover:text-brand-600">{ex.make} {ex.model}</Link></> : ' · General'}
                  </p>
                </div>
                {ex.receipt_path && <a href={ex.receipt_path} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600"><FileText className="w-4 h-4" /></a>}
              </div>
              <p className="font-bold text-gray-900 text-sm shrink-0">{money(ex.amount)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add Expense">
        <ExpenseForm submitting={create.isPending} onCancel={() => setAdding(false)} onSubmit={(fd) => create.mutate(fd)} />
      </Modal>
    </div>
  );
}
