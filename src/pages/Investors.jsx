import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Users, Car, Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { PageHeader } from '../components/common';
import { Modal, Loading, EmptyState } from '../components/ui';
import InvestorForm from '../components/forms/InvestorForm';

export default function Investors() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  const { data: investors = [], isLoading } = useQuery({
    queryKey: ['investors'],
    queryFn: async () => (await api.get('/investors')).data,
  });

  const create = useMutation({
    mutationFn: (p) => api.post('/investors', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investors'] }); setAdding(false); toast.success('Investor added'); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <PageHeader title="Investors" subtitle={`${investors.length} investor(s)`}
        action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Investor</button>} />

      {isLoading ? <Loading /> : investors.length === 0 ? (
        <EmptyState icon={Users} title="No investors yet" hint="Add investors to track their cars and profit shares."
          action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Investor</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {investors.map((i) => (
            <Link key={i.id} to={`/investors/${i.id}`} className="card p-5 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-lg font-bold">
                  {i.name?.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{i.name}</p>
                  <p className="text-xs text-gray-400">{i.phone || 'No phone'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Car className="w-4 h-4" /> {i.vehicle_count} car(s)</span>
                <span className="flex items-center gap-1"><Percent className="w-4 h-4" /> {i.default_profit_share_pct}% default</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add Investor">
        <InvestorForm submitting={create.isPending} onCancel={() => setAdding(false)} onSubmit={(p) => create.mutate(p)} />
      </Modal>
    </div>
  );
}
