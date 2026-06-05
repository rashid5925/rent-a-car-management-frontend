import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Wallet } from 'lucide-react';
import api from '../lib/api';
import { money } from '../lib/format';
import { PageHeader, StatCard } from '../components/common';
import { Loading, Select, Field, Input } from '../components/ui';
import PaymentsTable from '../components/PaymentsTable';

const CATEGORIES = ['RENTAL', 'DAMAGE', 'DEPOSIT', 'OTHER'];

export default function Payments() {
  const [filters, setFilters] = useState({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
    category: '',
  });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const { data, isLoading } = useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => (await api.get('/payments', { params: clean(filters) })).data,
  });

  return (
    <div>
      <PageHeader title="Payments" subtitle="Every payment received — who, when, against which vehicle, client and booking" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Total Received (filtered)" value={money(data?.total || 0)} icon={Wallet} accent="green" />
        <div className="card p-4 flex items-end gap-3 col-span-2">
          <Field label="From"><Input type="date" value={filters.from} onChange={set('from')} /></Field>
          <Field label="To"><Input type="date" value={filters.to} onChange={set('to')} /></Field>
          <Field label="Category">
            <Select value={filters.category} onChange={set('category')}>
              <option value="">All</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
      </div>

      <div className="card p-5">
        {isLoading ? <Loading /> : <PaymentsTable payments={data?.payments || []} />}
      </div>
    </div>
  );
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v));
}
