import dayjs from 'dayjs';

// PKR currency. Compact for large dashboard numbers when asked.
export function money(value, { compact = false } = {}) {
  const n = Number(value) || 0;
  if (compact && Math.abs(n) >= 100000) {
    return `Rs ${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} lac`;
  }
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function fmtDate(value, format = 'DD MMM YYYY') {
  if (!value) return '—';
  return dayjs(value).format(format);
}

export function daysBetween(a, b) {
  return dayjs(b).diff(dayjs(a), 'day') + 1;
}

// Resolve an uploaded file path to a usable URL (paths are stored as /uploads/...).
export function fileUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : path;
}

export const VEHICLE_STATUS = {
  AVAILABLE: { label: 'Available', cls: 'bg-emerald-50 text-emerald-700' },
  RENTED: { label: 'Rented', cls: 'bg-blue-50 text-blue-700' },
  MAINTENANCE: { label: 'In Maintenance', cls: 'bg-amber-50 text-amber-700' },
  INACTIVE: { label: 'Inactive', cls: 'bg-gray-100 text-gray-500' },
};

export const BOOKING_STATUS = {
  RESERVED: { label: 'Reserved', cls: 'bg-violet-50 text-violet-700' },
  ACTIVE: { label: 'Active', cls: 'bg-blue-50 text-blue-700' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
};

export const SETTLEMENT_STATUS = {
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  FINALIZED: { label: 'Pending Payment', cls: 'bg-amber-50 text-amber-700' },
  PAID: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700' },
};

export const PROFIT_MODEL = {
  NET_SHARE: '% of net profit',
  GROSS_COMMISSION: 'Manager commission',
  FIXED: 'Fixed payout',
};
