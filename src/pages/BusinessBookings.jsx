import { PageHeader } from '../components/common';
import BusinessBookingsPanel from '../components/BusinessBookingsPanel';

// A business administrator's full booking ledger across every vehicle.
export default function BusinessBookings() {
  return (
    <div>
      <PageHeader title="My Bookings" subtitle="Your booking records across all cars" />
      <BusinessBookingsPanel />
    </div>
  );
}
