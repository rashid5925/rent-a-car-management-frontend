import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import Investors from './pages/Investors';
import InvestorDetail from './pages/InvestorDetail';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Bookings from './pages/Bookings';
import BookingReceipt from './pages/BookingReceipt';
import Payments from './pages/Payments';
import Maintenance from './pages/Maintenance';
import Expenses from './pages/Expenses';
import Settlements from './pages/Settlements';
import SettlementStatement from './pages/SettlementStatement';
import Reports from './pages/Reports';
import Staff from './pages/Staff';
import StaffDetail from './pages/StaffDetail';
import SettingsPage from './pages/Settings';
import BusinessBookings from './pages/BusinessBookings';
import BusinessVehicleDetail from './pages/BusinessVehicleDetail';

function Protected({ children }) {
  const { isAuthed } = useAuth();
  return isAuthed ? children : <Navigate to="/login" replace />;
}

// Owner-only routes; everyone else is redirected to their landing page.
function OwnerOnly({ children }) {
  const { user } = useAuth();
  return user?.role === 'OWNER' ? children : <Navigate to="/vehicles" replace />;
}

// Owner + staff operational pages; business admins are kept out.
function StaffArea({ children }) {
  const { user } = useAuth();
  return user?.role === 'BUSINESS_ADMIN' ? <Navigate to="/vehicles" replace /> : children;
}

// Pages only the business administrator can see.
function BusinessAdminOnly({ children }) {
  const { user } = useAuth();
  return user?.role === 'BUSINESS_ADMIN' ? children : <Navigate to="/" replace />;
}

// Business admins get a simplified, finance-free vehicle page.
function VehicleDetailRoute() {
  const { user } = useAuth();
  return user?.role === 'BUSINESS_ADMIN' ? <BusinessVehicleDetail /> : <VehicleDetail />;
}

// Owner lands on the finance dashboard; staff & business admins land on Vehicles.
function Home() {
  const { user } = useAuth();
  return user?.role === 'OWNER' ? <Dashboard /> : <Navigate to="/vehicles" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/vehicles/:id" element={<VehicleDetailRoute />} />
        <Route path="/my-bookings" element={<BusinessAdminOnly><BusinessBookings /></BusinessAdminOnly>} />
        <Route path="/investors" element={<OwnerOnly><Investors /></OwnerOnly>} />
        <Route path="/investors/:id" element={<OwnerOnly><InvestorDetail /></OwnerOnly>} />
        <Route path="/clients" element={<StaffArea><Clients /></StaffArea>} />
        <Route path="/clients/:id" element={<StaffArea><ClientDetail /></StaffArea>} />
        <Route path="/bookings" element={<StaffArea><Bookings /></StaffArea>} />
        <Route path="/bookings/:id/receipt" element={<StaffArea><BookingReceipt /></StaffArea>} />
        <Route path="/payments" element={<StaffArea><Payments /></StaffArea>} />
        <Route path="/maintenance" element={<StaffArea><Maintenance /></StaffArea>} />
        <Route path="/expenses" element={<StaffArea><Expenses /></StaffArea>} />
        <Route path="/settlements" element={<OwnerOnly><Settlements /></OwnerOnly>} />
        <Route path="/settlements/:id" element={<OwnerOnly><SettlementStatement /></OwnerOnly>} />
        <Route path="/reports" element={<OwnerOnly><Reports /></OwnerOnly>} />
        <Route path="/staff" element={<OwnerOnly><Staff /></OwnerOnly>} />
        <Route path="/staff/:id" element={<OwnerOnly><StaffDetail /></OwnerOnly>} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
