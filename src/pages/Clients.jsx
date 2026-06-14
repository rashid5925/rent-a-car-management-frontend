import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, UserSquare2, Search, Phone, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { PageHeader } from '../components/common';
import { Modal, Loading, EmptyState, Input } from '../components/ui';
import Pagination from '../components/Pagination';
import ClientForm from '../components/forms/ClientForm';

const PER_PAGE = 50;

export default function Clients() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', q, page],
    queryFn: async () =>
      (await api.get('/clients', { params: { ...(q ? { q } : {}), page, limit: PER_PAGE } })).data,
  });
  const clients = data?.data ?? [];
  const total = data?.total ?? 0;

  const onSearch = (e) => { setQ(e.target.value); setPage(1); };
  const create = useMutation({
    mutationFn: (p) => api.post('/clients', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setAdding(false); toast.success('Client added'); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${total.toLocaleString()} client(s)`}
        action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Client</button>} />

      <div className="relative max-w-md mb-5">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input className="pl-9" placeholder="Search name, phone, CNIC…" value={q} onChange={onSearch} />
      </div>

      {isLoading ? <Loading /> : clients.length === 0 ? (
        <EmptyState icon={UserSquare2} title="No clients yet" action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Client</button>} />
      ) : (
        <>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <Link key={c.id} to={`/clients/${c.id}`} className="card p-5 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">{c.name?.slice(0, 1)}</div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone || '—'}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500 flex items-center gap-1">
                <CalendarDays className="w-4 h-4" /> {c.booking_count} booking(s)
              </div>
            </Link>
          ))}
        </div>
        <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} limit={PER_PAGE} onPage={setPage} />
        </>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add Client">
        <ClientForm submitting={create.isPending} onCancel={() => setAdding(false)} onSubmit={(p) => create.mutate(p)} />
      </Modal>
    </div>
  );
}
