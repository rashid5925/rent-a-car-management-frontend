import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Wrench, Paperclip, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { money, fmtDate } from '../lib/format';
import { PageHeader } from '../components/common';
import { Modal, Loading, EmptyState } from '../components/ui';
import Pagination from '../components/Pagination';
import MaintenanceForm from '../components/forms/MaintenanceForm';

const PER_PAGE = 50;

export default function Maintenance() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', dueOnly, page],
    queryFn: async () =>
      (await api.get('/maintenance', { params: { ...(dueOnly ? { due: 1 } : {}), page, limit: PER_PAGE } })).data,
  });
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const showDue = (v) => { setDueOnly(v); setPage(1); };
  const create = useMutation({
    mutationFn: (fd) => api.post('/maintenance', fd),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); setAdding(false); toast.success('Maintenance added'); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <PageHeader title="Maintenance & Service" subtitle={`${total.toLocaleString()} record(s)`}
        action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Record</button>} />

      <div className="flex gap-2 mb-5">
        <button className={`btn-sm ${!dueOnly ? 'btn-primary' : 'btn-ghost'}`} onClick={() => showDue(false)}>All</button>
        <button className={`btn-sm ${dueOnly ? 'btn-primary' : 'btn-ghost'}`} onClick={() => showDue(true)}>
          <AlertTriangle className="w-3.5 h-3.5" /> Due soon
        </button>
      </div>

      {isLoading ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon={Wrench} title={dueOnly ? 'Nothing due soon' : 'No maintenance records'} />
      ) : (
        <>
        <div className="card divide-y divide-gray-100">
          {rows.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  {m.title}
                  <span className="badge bg-gray-100 text-gray-500">{m.type}</span>
                  {m.attachment_count > 0 && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{m.attachment_count}</span>}
                </p>
                <p className="text-xs text-gray-400">
                  <Link to={`/vehicles/${m.vehicle_id}`} className="hover:text-brand-600">{m.make} {m.model} · {m.registration_no}</Link>
                  {' · '}{fmtDate(m.service_date)}{m.vendor ? ` · ${m.vendor}` : ''}
                  {m.next_due_date ? ` · next due ${fmtDate(m.next_due_date)}` : ''}
                </p>
              </div>
              <p className="font-bold text-gray-900 text-sm shrink-0">{money(m.cost)}</p>
            </div>
          ))}
        </div>
        <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} limit={PER_PAGE} onPage={setPage} />
        </>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add Maintenance" size="lg">
        <MaintenanceForm submitting={create.isPending} onCancel={() => setAdding(false)} onSubmit={(fd) => create.mutate(fd)} />
      </Modal>
    </div>
  );
}
