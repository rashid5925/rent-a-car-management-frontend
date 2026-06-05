import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Paperclip, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { money } from '../lib/format';
import { Modal, Field, Input, Textarea, Spinner } from './ui';

// Records damage discovered at return + (optionally) completes the booking.
// Damage charge is added to the booking total here — it's new damage from the rental.
export default function ReturnModal({ booking, onClose, onDone }) {
  const [damageCharge, setDamageCharge] = useState(booking?.damage_charge ? String(booking.damage_charge) : '');
  const [notes, setNotes] = useState('');
  const [endOdo, setEndOdo] = useState('');
  const [complete, setComplete] = useState(true);
  const [photos, setPhotos] = useState([]);

  const save = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('damage_charge', damageCharge || 0);
      if (notes) fd.append('damage_notes', notes);
      if (endOdo) fd.append('end_odometer', endOdo);
      fd.append('complete', complete ? '1' : '0');
      photos.forEach((p) => fd.append('damage_photos', p));
      return api.patch(`/bookings/${booking.id}/return`, fd);
    },
    onSuccess: () => { onDone?.(); onClose(); toast.success(complete ? 'Booking completed' : 'Damage recorded'); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!booking) return null;
  const newTotal = Number(booking.rental_amount) + Number(booking.driver_charge) - Number(booking.discount) + Number(damageCharge || 0);

  return (
    <Modal open onClose={onClose} title={`Return & Damage · ${booking.client_name || 'Booking'}`} size="md">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Charge here for <b>new</b> damage caused during the rental. The booking total updates and the
          balance becomes collectible — record the actual cash in the <b>Pay</b> dialog (category Damage).
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Damage Charge (Rs)"><Input type="number" value={damageCharge} onChange={(e) => setDamageCharge(e.target.value)} placeholder="0" autoFocus /></Field>
          <Field label="End Odometer (km)"><Input type="number" value={endOdo} onChange={(e) => setEndOdo(e.target.value)} /></Field>
        </div>
        <Field label="New damage notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What damage was found at return?" /></Field>
        <Field label="Damage Photos">
          <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-3 py-2 cursor-pointer hover:bg-gray-50 text-xs text-gray-500">
            <Paperclip className="w-3.5 h-3.5" /> {photos.length ? `${photos.length} photo(s)` : 'Upload damage photos'}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setPhotos(Array.from(e.target.files))} />
          </label>
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} className="w-4 h-4" />
          Mark booking as completed (car returned)
        </label>

        <div className="rounded-xl bg-gray-50 px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-gray-500">New booking total</span>
          <span className="font-bold text-gray-900">{money(newTotal)}</span>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? <Spinner className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
