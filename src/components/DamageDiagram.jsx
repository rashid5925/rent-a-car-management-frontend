import { useRef } from 'react';
import { X } from 'lucide-react';

// Top-view car diagram. Click to drop a numbered damage marker.
// value = [{ x, y, note }]  (x,y are 0..1 relative to the diagram box)
export default function DamageDiagram({ value = [], onChange, readOnly = false }) {
  const boxRef = useRef(null);

  const addMarker = (e) => {
    if (readOnly || !onChange) return;
    const rect = boxRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    onChange([...value, { x, y, note: '' }]);
  };

  const setNote = (i, note) => onChange(value.map((m, idx) => (idx === i ? { ...m, note } : m)));
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <div
        ref={boxRef}
        onClick={addMarker}
        className={`relative w-full rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden ${readOnly ? '' : 'cursor-crosshair'}`}
        style={{ aspectRatio: '16 / 9' }}
      >
        <CarTopView />
        {value.map((m, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center shadow ring-2 ring-white"
            style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
            title={m.note || `Damage ${i + 1}`}
          >
            {i + 1}
          </div>
        ))}
        {!readOnly && value.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 pointer-events-none">
            Tap on the car to mark a scratch / dent
          </div>
        )}
      </div>

      {/* Marker notes */}
      {value.length > 0 && (
        <div className="mt-3 space-y-2">
          {value.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 shrink-0 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
              {readOnly ? (
                <span className="text-sm text-gray-700">{m.note || `Damage ${i + 1}`}</span>
              ) : (
                <>
                  <input
                    className="input py-1.5 text-sm"
                    placeholder={`Describe damage ${i + 1}`}
                    value={m.note}
                    onChange={(e) => setNote(i, e.target.value)}
                  />
                  <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple recognizable top-view car silhouette.
function CarTopView() {
  return (
    <svg viewBox="0 0 320 180" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* body */}
      <rect x="70" y="20" width="180" height="140" rx="40" fill="#e5e7eb" stroke="#cbd5e1" strokeWidth="2" />
      {/* windshield (front = top) */}
      <path d="M95 55 q65 -22 130 0 l-12 26 q-53 -14 -106 0 z" fill="#cdd5e0" />
      {/* rear window */}
      <path d="M95 128 q65 20 130 0 l-12 -22 q-53 12 -106 0 z" fill="#cdd5e0" />
      {/* roof */}
      <rect x="103" y="84" width="114" height="34" rx="10" fill="#d7dde6" />
      {/* mirrors */}
      <rect x="58" y="70" width="14" height="10" rx="3" fill="#cbd5e1" />
      <rect x="248" y="70" width="14" height="10" rx="3" fill="#cbd5e1" />
      {/* wheels */}
      <rect x="60" y="38" width="12" height="26" rx="4" fill="#94a3b8" />
      <rect x="248" y="38" width="12" height="26" rx="4" fill="#94a3b8" />
      <rect x="60" y="116" width="12" height="26" rx="4" fill="#94a3b8" />
      <rect x="248" y="116" width="12" height="26" rx="4" fill="#94a3b8" />
      <text x="160" y="16" textAnchor="middle" fontSize="11" fill="#94a3b8">FRONT</text>
      <text x="160" y="176" textAnchor="middle" fontSize="11" fill="#94a3b8">REAR</text>
    </svg>
  );
}
