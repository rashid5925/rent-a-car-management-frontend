import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, Car, FileText, Video } from 'lucide-react';
import api from '../lib/api';
import { money, fmtDate, fmtTime, RATE_TYPE, PAYMENT_CATEGORY, BOOKING_STATUS } from '../lib/format';
import { PageHeader } from '../components/common';
import { Loading, StatusBadge } from '../components/ui';
import DamageDiagram from '../components/DamageDiagram';

function Img({ src, label }) {
  if (!src) return null;
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block">
      <img src={src} alt={label} className="w-full h-24 object-cover rounded-lg border border-gray-200" />
      {label && <p className="text-[10px] text-gray-400 mt-0.5 text-center">{label}</p>}
    </a>
  );
}

export default function BookingReceipt() {
  const { id } = useParams();
  const { data: b, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => (await api.get(`/bookings/${id}`)).data,
  });

  if (isLoading) return <Loading />;
  if (!b) return null;

  const carPhotos = b.attachments.filter((a) => a.kind === 'CAR_PHOTO');
  const damagePhotos = b.attachments.filter((a) => a.kind === 'DAMAGE_PHOTO');
  const videos = b.attachments.filter((a) => a.kind === 'CAR_VIDEO');

  return (
    <div>
      <div className="no-print">
        <PageHeader title="Booking Receipt" back="/bookings"
          action={<button className="btn-primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print / Save PDF</button>} />
      </div>

      <div className="card p-8 print-area max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white"><Car className="w-6 h-6" /></div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">{b.business?.business_name || 'Rent A Car'}</h2>
              <p className="text-xs text-gray-400">{b.business?.address} {b.business?.phone ? `· ${b.business.phone}` : ''}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Booking Receipt</p>
            <p className="text-sm font-bold text-gray-700">#{String(b.id).padStart(4, '0')}</p>
            <div className="mt-1"><StatusBadge map={BOOKING_STATUS} value={b.status} /></div>
          </div>
        </div>

        {/* Vehicle + period */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="flex gap-3">
            {b.vehicle_image && <img src={b.vehicle_image} alt="" className="w-24 h-20 object-cover rounded-lg" />}
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Vehicle</p>
              <p className="font-bold text-gray-900">{b.make} {b.model}</p>
              <p className="text-sm text-gray-500">{b.registration_no} · {b.year || ''} {b.color || ''}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Rental Period</p>
            <p className="font-bold text-gray-900">{fmtDate(b.start_date)} {fmtTime(b.start_time)} → {fmtDate(b.end_date)} {fmtTime(b.end_time)}</p>
            <p className="text-sm text-gray-500">{b.rate_units} {RATE_TYPE[b.rate_type]?.unit}(s) × {money(b.rate_amount)} ({RATE_TYPE[b.rate_type]?.label})</p>
          </div>
        </div>

        {/* Client + referrers */}
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Client</p>
            <p className="font-bold text-gray-900">{b.client_name}</p>
            <p className="text-sm text-gray-500">{b.client_phone || '—'}</p>
            <p className="text-sm text-gray-500">CNIC: {b.client_cnic || '—'}</p>
            {b.client_license && <p className="text-sm text-gray-500">License: {b.client_license}</p>}
            {b.client_address && <p className="text-sm text-gray-500">{b.client_address}</p>}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Img src={b.client_photo} label="Photo" />
              <Img src={b.client_cnic_front} label="CNIC Front" />
              <Img src={b.client_cnic_back} label="CNIC Back" />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Referred / Guaranteed by</p>
            {b.referrers.length === 0 ? <p className="text-sm text-gray-400">—</p> : b.referrers.map((r) => (
              <div key={r.id} className="mb-3">
                <p className="font-semibold text-gray-800 text-sm">{r.name}</p>
                <p className="text-xs text-gray-500">{r.phone || ''} {r.cnic ? `· CNIC ${r.cnic}` : ''}</p>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <Img src={r.cnic_front} label="CNIC Front" />
                  <Img src={r.cnic_back} label="CNIC Back" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charges */}
        <div className="rounded-xl border border-gray-100 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <Row label={`Rental (${b.rate_units} ${RATE_TYPE[b.rate_type]?.unit}s × ${money(b.rate_amount)})`} value={money(b.rental_amount)} />
              {Number(b.driver_charge) > 0 && <Row label="Driver charge" value={money(b.driver_charge)} />}
              {Number(b.discount) > 0 && <Row label="Discount" value={`− ${money(b.discount)}`} />}
              {Number(b.damage_charge) > 0 && <Row label="Damage charge" value={money(b.damage_charge)} />}
              {Number(b.security_deposit) > 0 && <Row label="Security deposit (refundable)" value={money(b.security_deposit)} muted />}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold text-gray-900"><td className="px-4 py-2.5">Total</td><td className="px-4 py-2.5 text-right">{money(b.total_amount)}</td></tr>
              <tr className="text-emerald-700"><td className="px-4 py-2">Received</td><td className="px-4 py-2 text-right">{money(b.amount_received)}</td></tr>
              <tr className={Number(b.balance) > 0 ? 'text-red-600 font-bold' : 'text-gray-500'}><td className="px-4 py-2">Balance due</td><td className="px-4 py-2 text-right">{money(b.balance)}</td></tr>
            </tfoot>
          </table>
        </div>

        {/* Payments */}
        {b.payments.length > 0 && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Payments</p>
            <div className="space-y-2">
              {b.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
                  <span className="text-gray-600">
                    {fmtDate(p.paid_on)} · {p.method} · {PAYMENT_CATEGORY[p.category] || p.category}
                    {p.recorded_by ? ` · by ${p.recorded_by}` : ''}
                  </span>
                  <div className="flex items-center gap-3">
                    {p.receipt_path && <a href={p.receipt_path} target="_blank" rel="noreferrer" className="text-brand-600"><FileText className="w-4 h-4" /></a>}
                    <span className="font-semibold">{money(p.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Car condition */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Car Condition at Handover</p>
          {(b.damage_markers?.length > 0) && (
            <div className="max-w-md mb-3"><DamageDiagram value={b.damage_markers} readOnly /></div>
          )}
          {b.damage_notes && <p className="text-sm text-gray-600 mb-3">Notes: {b.damage_notes}</p>}
          {(carPhotos.length > 0 || damagePhotos.length > 0) && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {carPhotos.map((a) => <Img key={a.id} src={a.file_path} label="Car" />)}
              {damagePhotos.map((a) => <Img key={a.id} src={a.file_path} label="Damage" />)}
            </div>
          )}
          {videos.map((a) => (
            <a key={a.id} href={a.file_path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-600 mt-2 no-print">
              <Video className="w-4 h-4" /> Handover video
            </a>
          ))}
          {!b.damage_markers?.length && !b.damage_notes && !carPhotos.length && !damagePhotos.length && (
            <p className="text-sm text-gray-400">No condition media recorded.</p>
          )}
        </div>

        {b.notes && <p className="text-sm text-gray-500 mb-6">Note: {b.notes}</p>}

        <div className="flex justify-between mt-12 pt-8 text-sm text-gray-400">
          <div className="text-center"><div className="w-40 border-t border-gray-300 pt-1">Client Signature</div></div>
          <div className="text-center"><div className="w-40 border-t border-gray-300 pt-1">Authorized Signature</div></div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }) {
  return (
    <tr className={muted ? 'text-gray-400' : 'text-gray-700'}>
      <td className="px-4 py-2.5">{label}</td>
      <td className="px-4 py-2.5 text-right font-medium">{value}</td>
    </tr>
  );
}
