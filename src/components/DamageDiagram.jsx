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
        className={`relative w-full mx-auto rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden ${readOnly ? '' : 'cursor-crosshair'}`}
        style={{ aspectRatio: '3 / 4', maxWidth: 340 }}
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

// Recognizable top-view car (front at top, rear at bottom).
function CarTopView() {
  return (
    <svg viewBox="0 0 200 310" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* wheels (drawn under the body) */}
      {[
        [28, 56], [158, 56], [28, 214], [158, 214],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="14" height="40" rx="6" fill="#8b97a8" />
      ))}

      {/* body */}
      <rect x="40" y="22" width="120" height="266" rx="48" fill="#e9edf2" stroke="#c3ccd8" strokeWidth="2.5" />

      {/* headlights (front) */}
      <rect x="56" y="30" width="30" height="11" rx="5" fill="#fde68a" />
      <rect x="114" y="30" width="30" height="11" rx="5" fill="#fde68a" />
      {/* taillights (rear) */}
      <rect x="56" y="268" width="30" height="11" rx="5" fill="#fca5a5" />
      <rect x="114" y="268" width="30" height="11" rx="5" fill="#fca5a5" />

      {/* windshield (front) */}
      <path d="M70 86 H130 L150 124 H50 Z" fill="#cfd8e3" />
      {/* roof / cabin */}
      <rect x="52" y="124" width="96" height="66" rx="12" fill="#dde3ea" />
      {/* rear window */}
      <path d="M50 190 H150 L130 226 H70 Z" fill="#cfd8e3" />

      {/* side mirrors */}
      <rect x="28" y="120" width="14" height="13" rx="4" fill="#c3ccd8" />
      <rect x="158" y="120" width="14" height="13" rx="4" fill="#c3ccd8" />

      {/* labels */}
      <text x="100" y="14" textAnchor="middle" fontSize="13" fontWeight="600" fill="#9aa6b5">FRONT</text>
      <text x="100" y="305" textAnchor="middle" fontSize="13" fontWeight="600" fill="#9aa6b5">REAR</text>
    </svg>
  );
}
