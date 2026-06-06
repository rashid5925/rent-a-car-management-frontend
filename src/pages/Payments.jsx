import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Wallet, Clock } from 'lucide-react';
import api from '../lib/api';
import { money } from '../lib/format';
import { PageHeader, StatCard } from '../components/common';
import { Loading, Select, Field, Input } from '../components/ui';
import PaymentsTable from '../components/PaymentsTable';

const CATEGORIES = ['RENTAL', 'DAMAGE', 'DEPOSIT', 'OTHER'];

export default function Payments() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
    category: '',
    status: '',
  });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const { data, isLoading } = useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => (await api.get('/payments', { params: clean(filters) })).data,
  });

  return (
    <div>
      <PageHeader title="Payments" subtitle="Every payment — who, when, against which vehicle, client and booking. Staff payments need admin approval to count." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Approved (filtered)" value={money(data?.total || 0)} icon={Wallet} accent="green" />
        <StatCard label="Pending Approval" value={money(data?.pending || 0)} icon={Clock} accent="amber" />
        <div className="card p-4 flex flex-wrap items-end gap-3 col-span-2">
          <Field label="From"><Input type="date" value={filters.from} onChange={set('from')} /></Field>
          <Field label="To"><Input type="date" value={filters.to} onChange={set('to')} /></Field>
          <Field label="Status">
            <Select value={filters.status} onChange={set('status')}>
              <option value="">All</option>
              {['PENDING', 'APPROVED', 'REJECTED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={filters.category} onChange={set('category')}>
              <option value="">All</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
      </div>

      <div className="card p-5">
        {isLoading ? <Loading /> : (
          <PaymentsTable payments={data?.payments || []} onChanged={() => qc.invalidateQueries({ queryKey: ['payments'] })} />
        )}
      </div>
    </div>
  );
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v));
}
