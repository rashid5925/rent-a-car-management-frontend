import { Link } from 'react-router-dom';
import { FileText, Wallet } from 'lucide-react';
import { money, fmtDate, PAYMENT_CATEGORY } from '../lib/format';
import { EmptyState } from './ui';

const CAT_CLS = {
  RENTAL: 'bg-blue-50 text-blue-700',
  DAMAGE: 'bg-red-50 text-red-700',
  DEPOSIT: 'bg-violet-50 text-violet-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

// Shared payment history table. Hide columns that are implied by context.
export default function PaymentsTable({ payments = [], hideClient, hideVehicle }) {
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
            <th className="py-2 px-2 font-semibold">Method</th>
            <th className="py-2 px-2 font-semibold text-right">Amount</th>
            <th className="py-2 px-2 font-semibold"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="py-2.5 px-2 whitespace-nowrap text-gray-500">{fmtDate(p.created_at, 'DD MMM YYYY · h:mm A')}</td>
              <td className="py-2.5 px-2 text-gray-600">{p.recorded_by || '—'}</td>
              {!hideClient && (
                <td className="py-2.5 px-2">
                  <Link to={`/clients/${p.client_id}`} className="text-gray-800 hover:text-brand-600">{p.client_name}</Link>
                </td>
              )}
              {!hideVehicle && (
                <td className="py-2.5 px-2">
                  <Link to={`/vehicles/${p.vehicle_id}`} className="text-gray-800 hover:text-brand-600">{p.make} {p.model}</Link>
                  <span className="text-xs text-gray-400 block">{p.registration_no}</span>
                </td>
              )}
              <td className="py-2.5 px-2"><span className={`badge ${CAT_CLS[p.category] || CAT_CLS.OTHER}`}>{PAYMENT_CATEGORY[p.category] || p.category}</span></td>
              <td className="py-2.5 px-2 text-gray-500">{p.method}</td>
              <td className="py-2.5 px-2 text-right font-bold text-gray-900">{money(p.amount)}</td>
              <td className="py-2.5 px-2 text-right">
                <Link to={`/bookings/${p.booking_id}/receipt`} className="text-gray-400 hover:text-brand-600 inline-flex" title="Open booking receipt">
                  <FileText className="w-4 h-4" />
                </Link>
                {p.receipt_path && <a href={p.receipt_path} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 inline-flex ml-2" title="Payment receipt image">●</a>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
