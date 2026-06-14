import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Phone, CreditCard, MapPin, BadgeCheck, CalendarDays, Paperclip, FileText, Plus, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { money, fmtDate, BOOKING_STATUS } from '../lib/format';
import { PageHeader, Spec } from '../components/common';
import { Modal, ConfirmDialog, Loading, EmptyState, Section, StatusBadge } from '../components/ui';
import Pagination from '../components/Pagination';
import usePaged from '../lib/usePaged';
import ClientForm from '../components/forms/ClientForm';
import PaymentsTable from '../components/PaymentsTable';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const { data: c, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => (await api.get(`/clients/${id}`)).data,
  });
  const { data: paymentsData } = useQuery({
    queryKey: ['payments', { client_id: id }],
    queryFn: async () => (await api.get('/payments', { params: { client_id: id } })).data,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['client', id] });

  const update = useMutation({
    mutationFn: (p) => api.put(`/clients/${id}`, p),
    onSuccess: () => { invalidate(); setEditing(false); toast.success('Client updated'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/clients/${id}`),
    onSuccess: () => { toast.success('Client deleted'); navigate('/clients'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const upload = useMutation({
    mutationFn: (files) => {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('documents', f));
      return api.post(`/clients/${id}/documents`, fd);
    },
    onSuccess: () => { invalidate(); toast.success('Document uploaded'); },
    onError: (e) => toast.error(apiError(e)),
  });

  const bookingsPg = usePaged(c?.bookings || [], 50);
  const paymentsPg = usePaged(paymentsData?.payments || [], 50);

  if (isLoading) return <Loading />;
  if (!c) return null;

  return (
    <div>
      <PageHeader title={c.name} subtitle="Client profile & rental history" back="/clients"
        action={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil className="w-4 h-4" /> Edit</button>
            <button className="btn-danger" onClick={() => setConfirmDel(true)}><Trash2 className="w-4 h-4" /></button>
          </div>
        } />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <Section title="Profile">
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gray-400" /> {c.phone || '—'}</p>
              <p className="flex items-center gap-2 text-gray-600"><CreditCard className="w-4 h-4 text-gray-400" /> {c.cnic || '—'}</p>
              <p className="flex items-center gap-2 text-gray-600"><BadgeCheck className="w-4 h-4 text-gray-400" /> {c.license_no || '—'}</p>
              <p className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-gray-400" /> {c.address || '—'}</p>
            </div>
            {c.notes && <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">{c.notes}</p>}
          </Section>

          <Section title="Documents" icon={Paperclip}
            action={
              <label className="btn-ghost btn-sm cursor-pointer"><Plus className="w-3.5 h-3.5" /> Add
                <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files.length && upload.mutate(e.target.files)} />
              </label>
            }>
            {c.documents.length === 0 ? <EmptyState icon={Paperclip} title="No documents" /> : (
              <div className="space-y-2">
                {c.documents.map((d) => (
                  <a key={d.id} href={d.file_path} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 rounded-lg border border-gray-100 px-3 py-2">
                    <FileText className="w-4 h-4" /> {d.label || 'Document'}
                  </a>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section title="Rental History" icon={CalendarDays}>
            {c.bookings.length === 0 ? <EmptyState icon={CalendarDays} title="No bookings yet" /> : (
              <div className="space-y-2">
                {bookingsPg.pageItems.map((b) => (
                  <Link key={b.id} to={`/vehicles/${b.vehicle_id}`} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                        {b.make} {b.model} · {b.registration_no}
                        <StatusBadge map={BOOKING_STATUS} value={b.status} />
                      </p>
                      <p className="text-xs text-gray-400">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</p>
                    </div>
                    <span className="font-bold text-gray-900 text-sm">{money(b.total_amount)}</span>
                  </Link>
                ))}
                <Pagination page={bookingsPg.page} totalPages={bookingsPg.totalPages} total={bookingsPg.total} limit={bookingsPg.limit} onPage={bookingsPg.setPage} />
              </div>
            )}
          </Section>

          <Section title="Payments" icon={Wallet} className="mt-4"
            action={paymentsData ? <span className="text-sm text-gray-400">{money(paymentsData.total)} total</span> : null}>
            <PaymentsTable payments={paymentsPg.pageItems} hideClient onChanged={() => qc.invalidateQueries({ queryKey: ['payments'] })} />
            <Pagination page={paymentsPg.page} totalPages={paymentsPg.totalPages} total={paymentsPg.total} limit={paymentsPg.limit} onPage={paymentsPg.setPage} />
          </Section>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Client">
        <ClientForm initial={c} submitting={update.isPending} onCancel={() => setEditing(false)} onSubmit={(p) => update.mutate(p)} />
      </Modal>
      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={() => remove.mutate()} loading={remove.isPending}
        title="Delete client?" message="This client will be removed. Bookings referencing them may block deletion." />
    </div>
  );
}
