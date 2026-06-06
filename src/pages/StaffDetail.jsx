import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Car, CalendarDays, FileText } from 'lucide-react';
import api from '../lib/api';
import { money, fmtDate, BOOKING_STATUS } from '../lib/format';
import { PageHeader } from '../components/common';
import { Loading, EmptyState, Section, StatusBadge } from '../components/ui';

export default function StaffDetail() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['staff', id],
    queryFn: async () => (await api.get(`/reports/staff/${id}`)).data,
  });

  if (isLoading) return <Loading />;
  if (!data) return null;
  const { user, bookings, by_vehicle } = data;

  return (
    <div>
      <PageHeader title={user.name} subtitle={`${user.role} · ${user.email}`} back="/staff" />

      <div className="grid lg:grid-cols-3 gap-4">
        <Section title="Bookings by Vehicle" icon={Car}>
          {by_vehicle.length === 0 ? <EmptyState icon={Car} title="No bookings" /> : (
            <div className="space-y-2">
              {by_vehicle.map((v) => (
                <Link key={v.id} to={`/vehicles/${v.id}`} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{v.make} {v.model}</p>
                    <p className="text-xs text-gray-400">{v.registration_no}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{v.bookings_count}</p>
                    <p className="text-[11px] text-gray-400">{money(v.total_amount)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title={`Bookings (${bookings.length})`} icon={CalendarDays} className="lg:col-span-2">
          {bookings.length === 0 ? <EmptyState icon={CalendarDays} title="No bookings created" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400 uppercase">
                  <tr className="text-left">
                    <th className="py-2 px-2 font-semibold">Vehicle</th>
                    <th className="py-2 px-2 font-semibold">Client</th>
                    <th className="py-2 px-2 font-semibold">Dates</th>
                    <th className="py-2 px-2 font-semibold">Status</th>
                    <th className="py-2 px-2 font-semibold text-right">Total</th>
                    <th className="py-2 px-2 font-semibold text-right">Balance</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-2">{b.make} {b.model}<span className="text-xs text-gray-400 block">{b.registration_no}</span></td>
                      <td className="py-2.5 px-2 text-gray-600">{b.client_name}</td>
                      <td className="py-2.5 px-2 text-gray-500 text-xs whitespace-nowrap">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</td>
                      <td className="py-2.5 px-2"><StatusBadge map={BOOKING_STATUS} value={b.status} /></td>
                      <td className="py-2.5 px-2 text-right font-semibold">{money(b.total_amount)}</td>
                      <td className={`py-2.5 px-2 text-right ${Number(b.balance) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{Number(b.balance) > 0 ? money(b.balance) : 'Paid'}</td>
                      <td className="py-2.5 px-2 text-right"><Link to={`/bookings/${b.id}/receipt`} className="text-gray-400 hover:text-brand-600 inline-flex"><FileText className="w-4 h-4" /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
