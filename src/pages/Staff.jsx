import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, ShieldCheck, ChevronRight, Clock } from 'lucide-react';
import api from '../lib/api';
import { money } from '../lib/format';
import { PageHeader } from '../components/common';
import { Loading, EmptyState, Badge } from '../components/ui';

export default function Staff() {
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => (await api.get('/reports/staff')).data,
  });

  return (
    <div>
      <PageHeader title="Staff" subtitle="Bookings and payment activity by each team member" />
      {isLoading ? <Loading /> : staff.length === 0 ? (
        <EmptyState icon={Users} title="No users" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400 uppercase">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Member</th>
                  <th className="text-right font-semibold px-4 py-3">Bookings</th>
                  <th className="text-right font-semibold px-4 py-3">Booking Value</th>
                  <th className="text-right font-semibold px-4 py-3">Approved Received</th>
                  <th className="text-right font-semibold px-4 py-3">Pending Approval</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">{s.name?.slice(0, 1)}</div>
                        <div>
                          <Link to={`/staff/${s.id}`} className="font-semibold text-gray-800 hover:text-brand-600">{s.name}</Link>
                          <div><Badge className={s.role === 'OWNER' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}>{s.role === 'OWNER' && <ShieldCheck className="w-3 h-3" />} {s.role}</Badge></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{s.bookings_count}</td>
                    <td className="px-4 py-3 text-right">{money(s.total_amount)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{money(s.received)}</td>
                    <td className="px-4 py-3 text-right">
                      {s.pending_count > 0
                        ? <span className="text-amber-600 font-semibold inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{money(s.pending_amount)} ({s.pending_count})</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right"><Link to={`/staff/${s.id}`}><ChevronRight className="w-4 h-4 text-gray-300" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
