import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Car, Search, Gauge, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { money, VEHICLE_STATUS } from '../lib/format';
import { PageHeader } from '../components/common';
import { Modal, Loading, EmptyState, StatusBadge, Select, Input } from '../components/ui';
import VehicleForm from '../components/forms/VehicleForm';

export default function Vehicles() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [filters, setFilters] = useState({ status: '', ownership_type: '', q: '' });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', filters],
    queryFn: async () => (await api.get('/vehicles', { params: cleanParams(filters) })).data,
  });

  const create = useMutation({
    mutationFn: (payload) => api.post('/vehicles', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setAdding(false);
      toast.success('Vehicle added');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle={`${vehicles.length} vehicle(s) in your fleet`}
        action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Vehicle</button>}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input className="pl-9" placeholder="Search make, model, reg no…"
            value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
        <Select className="w-auto" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {Object.keys(VEHICLE_STATUS).map((s) => <option key={s} value={s}>{VEHICLE_STATUS[s].label}</option>)}
        </Select>
        <Select className="w-auto" value={filters.ownership_type} onChange={(e) => setFilters((f) => ({ ...f, ownership_type: e.target.value }))}>
          <option value="">All ownership</option>
          <option value="OWNED">Company owned</option>
          <option value="INVESTOR">Investor owned</option>
        </Select>
      </div>

      {isLoading ? (
        <Loading />
      ) : vehicles.length === 0 ? (
        <EmptyState icon={Car} title="No vehicles found" hint="Add your first vehicle to get started."
          action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Vehicle</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Link key={v.id} to={`/vehicles/${v.id}`} className="card overflow-hidden hover:shadow-md transition group">
              <div className="h-40 bg-gray-100 relative overflow-hidden">
                {v.primary_image ? (
                  <img src={v.primary_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><Car className="w-12 h-12" /></div>
                )}
                <div className="absolute top-3 left-3"><StatusBadge map={VEHICLE_STATUS} value={v.status} /></div>
                <div className="absolute top-3 right-3">
                  <span className={`badge ${v.ownership_type === 'INVESTOR' ? 'bg-violet-600 text-white' : 'bg-gray-900/70 text-white'}`}>
                    {v.ownership_type === 'INVESTOR' ? 'Investor' : 'Owned'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{v.make} {v.model}</p>
                    <p className="text-xs text-gray-400">{v.registration_no} · {v.year || '—'}</p>
                  </div>
                  <p className="text-sm font-bold text-brand-600">{money(v.daily_rate)}<span className="text-[11px] text-gray-400 font-normal">/day</span></p>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> {Number(v.current_odometer || 0).toLocaleString()} km</span>
                  {v.investor_name && <span className="flex items-center gap-1 truncate"><User className="w-3.5 h-3.5" /> {v.investor_name}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add Vehicle" size="lg">
        <VehicleForm onSubmit={(payload) => create.mutate(payload)} submitting={create.isPending} onCancel={() => setAdding(false)} />
      </Modal>
    </div>
  );
}

function cleanParams(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v));
}
