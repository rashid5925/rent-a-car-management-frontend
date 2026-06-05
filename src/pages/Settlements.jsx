import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { HandCoins, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { money, fmtDate, SETTLEMENT_STATUS } from '../lib/format';
import { PageHeader } from '../components/common';
import { Loading, EmptyState, StatusBadge } from '../components/ui';

export default function Settlements() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['settlements'],
    queryFn: async () => (await api.get('/settlements')).data,
  });

  const pending = rows.filter((r) => r.status === 'FINALIZED').reduce((s, r) => s + Number(r.investor_share_amount), 0);

  return (
    <div>
      <PageHeader title="Investor Payouts" subtitle={`${rows.length} settlement(s) · ${money(pending)} pending`} />

      {isLoading ? <Loading /> : rows.length === 0 ? (
        <EmptyState icon={HandCoins} title="No settlements yet"
          hint="Open an investor and generate a settlement for a period to create one." />
      ) : (
        <div className="card divide-y divide-gray-100">
          {rows.map((s) => (
            <Link key={s.id} to={`/settlements/${s.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold shrink-0">
                  {s.investor_name?.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 flex items-center gap-2">
                    {s.investor_name} <StatusBadge map={SETTLEMENT_STATUS} value={s.status} />
                  </p>
                  <p className="text-xs text-gray-400">{fmtDate(s.period_start)} → {fmtDate(s.period_end)} · net {money(s.net_profit)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-violet-700">{money(s.investor_share_amount)}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
