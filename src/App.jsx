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
import Maintenance from './pages/Maintenance';
import Expenses from './pages/Expenses';
import Settlements from './pages/Settlements';
import SettlementStatement from './pages/SettlementStatement';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';

function Protected({ children }) {
  const { isAuthed } = useAuth();
  return isAuthed ? children : <Navigate to="/login" replace />;
}

// Owner-only routes; staff are redirected to their operational landing page.
function OwnerOnly({ children }) {
  const { user } = useAuth();
  return user?.role === 'OWNER' ? children : <Navigate to="/vehicles" replace />;
}

// Owner lands on the finance dashboard; staff land on Vehicles.
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
        <Route path="/vehicles/:id" element={<VehicleDetail />} />
        <Route path="/investors" element={<OwnerOnly><Investors /></OwnerOnly>} />
        <Route path="/investors/:id" element={<OwnerOnly><InvestorDetail /></OwnerOnly>} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/settlements" element={<OwnerOnly><Settlements /></OwnerOnly>} />
        <Route path="/settlements/:id" element={<OwnerOnly><SettlementStatement /></OwnerOnly>} />
        <Route path="/reports" element={<OwnerOnly><Reports /></OwnerOnly>} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
