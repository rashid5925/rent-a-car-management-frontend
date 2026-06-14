import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Car, Gauge } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/common';
import { Loading } from '../components/ui';
import BusinessBookingsPanel from '../components/BusinessBookingsPanel';

// Simplified vehicle page for a business administrator: the car's basic profile
// plus that user's own booking ledger for this car. No finances or operations.
export default function BusinessVehicleDetail() {
  const { id } = useParams();

  const { data: v, isLoading } = useQuery({
    queryKey: ['vehicle', id, 'business'],
    queryFn: async () => (await api.get(`/vehicles/${id}`)).data,
  });

  if (isLoading) return <Loading />;
  if (!v) return <PageHeader title="Vehicle not found" back="/vehicles" />;

  return (
    <div>
      <PageHeader title={`${v.make} ${v.model}`} subtitle={v.registration_no} back="/vehicles" />

      {/* Car summary card */}
      <div className="card overflow-hidden mb-6 flex flex-col sm:flex-row">
        <div className="sm:w-64 h-44 bg-gray-100 shrink-0">
          {v.images?.[0]?.file_path ? (
            <img src={v.images[0].file_path} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300"><Car className="w-12 h-12" /></div>
          )}
        </div>
        <div className="p-5 flex-1">
          <p className="text-lg font-bold text-gray-900">{v.make} {v.model} {v.year ? `· ${v.year}` : ''}</p>
          <p className="text-sm text-gray-400">{v.registration_no}{v.color ? ` · ${v.color}` : ''}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-gray-600">
            {v.category && <span className="capitalize">{v.category}</span>}
            {v.seats ? <span>{v.seats} seats</span> : null}
            {v.transmission && <span className="capitalize">{String(v.transmission).toLowerCase()}</span>}
            {v.current_odometer != null && (
              <span className="flex items-center gap-1"><Gauge className="w-4 h-4 text-gray-400" /> {Number(v.current_odometer).toLocaleString()} km</span>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-extrabold text-gray-900 mb-3">Bookings for this car</h2>
      <BusinessBookingsPanel vehicleId={Number(id)} />
    </div>
  );
}
