import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { FileText, Wallet, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { money, fmtDate, PAYMENT_CATEGORY, PAYMENT_STATUS } from '../lib/format';
import { EmptyState } from './ui';

const CAT_CLS = {
  RENTAL: 'bg-blue-50 text-blue-700',
  DAMAGE: 'bg-red-50 text-red-700',
  DEPOSIT: 'bg-violet-50 text-violet-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

// Shared payment history table. Hide columns implied by context.
// `onChanged` is called after an approve/reject so the parent can refetch.
export default function PaymentsTable({ payments = [], hideClient, hideVehicle, onChanged }) {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const act = useMutation({
    mutationFn: ({ id, action }) => api.patch(`/payments/${id}/${action}`),
    onSuccess: (_r, vars) => { onChanged?.(); toast.success(vars.action === 'approve' ? 'Payment approved' : 'Payment rejected'); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!payments.length) return <EmptyState icon={Wallet} title="No payments yet" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-400 uppercase">
          <tr className="text-left">
            <th className="py-2 px-2 font-semibold">Date &amp; time</th>
            <th className="py-2 px-2 font-semibold">By</th>
            {!hideClient && <th className="py-2 px-2 font-semibold">Client</th>}
            {!hideVehicle && <th className="py-2 px-2 font-semibold">Vehicle</th>}
            <th className="py-2 px-2 font-semibold">For</th>
            <th className="py-2 px-2 font-semibold">Status</th>
            <th className="py-2 px-2 font-semibold text-right">Amount</th>
            <th className="py-2 px-2 font-semibold text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payments.map((p) => {
            const st = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.PENDING;
            return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="py-2.5 px-2 whitespace-nowrap text-gray-500">{fmtDate(p.created_at, 'DD MMM YYYY · h:mm A')}</td>
                <td className="py-2.5 px-2 text-gray-600">{p.recorded_by || '—'}</td>
                {!hideClient && (
                  <td className="py-2.5 px-2"><Link to={`/clients/${p.client_id}`} className="text-gray-800 hover:text-brand-600">{p.client_name}</Link></td>
                )}
                {!hideVehicle && (
                  <td className="py-2.5 px-2">
                    <Link to={`/vehicles/${p.vehicle_id}`} className="text-gray-800 hover:text-brand-600">{p.make} {p.model}</Link>
                    <span className="text-xs text-gray-400 block">{p.registration_no}</span>
                  </td>
                )}
                <td className="py-2.5 px-2"><span className={`badge ${CAT_CLS[p.category] || CAT_CLS.OTHER}`}>{PAYMENT_CATEGORY[p.category] || p.category}</span></td>
                <td className="py-2.5 px-2">
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                  {p.status === 'APPROVED' && p.approved_by_name && <span className="text-[10px] text-gray-400 block">by {p.approved_by_name}</span>}
                </td>
                <td className={`py-2.5 px-2 text-right font-bold ${p.status === 'APPROVED' ? 'text-gray-900' : 'text-gray-400'}`}>{money(p.amount)}</td>
                <td className="py-2.5 px-2 text-right whitespace-nowrap">
                  {isOwner && p.status === 'PENDING' && (
                    <>
                      <button className="btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 mr-1" disabled={act.isPending}
                        onClick={() => act.mutate({ id: p.id, action: 'approve' })}><Check className="w-3.5 h-3.5" /></button>
                      <button className="btn-sm bg-red-50 text-red-600 hover:bg-red-100 mr-1" disabled={act.isPending}
                        onClick={() => act.mutate({ id: p.id, action: 'reject' })}><X className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                  <Link to={`/bookings/${p.booking_id}/receipt`} className="text-gray-400 hover:text-brand-600 inline-flex align-middle" title="Open booking receipt"><FileText className="w-4 h-4" /></Link>
                  {p.receipt_path && <a href={p.receipt_path} target="_blank" rel="noreferrer" className="text-emerald-600 inline-flex align-middle ml-2" title="Payment receipt image">●</a>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
