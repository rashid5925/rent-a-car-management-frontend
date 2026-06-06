import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Car, Users, UserSquare2, CalendarDays, Wrench,
  Receipt, HandCoins, BarChart3, Settings, LogOut, Menu, X, Wallet, UserCog,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// `owner: true` items are hidden from STAFF (finance & admin areas).
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, owner: true },
  { to: '/vehicles', label: 'Vehicles', icon: Car },
  { to: '/investors', label: 'Investors', icon: Users, owner: true },
  { to: '/clients', label: 'Clients', icon: UserSquare2 },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/settlements', label: 'Investor Payouts', icon: HandCoins, owner: true },
  { to: '/staff', label: 'Staff', icon: UserCog, owner: true },
  { to: '/reports', label: 'Reports', icon: BarChart3, owner: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isOwner = user?.role === 'OWNER';
  const navItems = NAV.filter((item) => isOwner || !item.owner);

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white">
          <Car className="w-5 h-5" />
        </div>
        <div className="leading-tight">
          <p className="font-extrabold text-gray-900 text-[15px]">RentFlow</p>
          <p className="text-[11px] text-gray-400">Fleet & Investor Manager</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
            {user?.name?.slice(0, 1)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer" title="Log out">
            <LogOut className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-gray-100 fixed inset-y-0 no-print">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 no-print">
          <div className="fixed inset-0 bg-gray-900/40" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 lg:ml-64 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-white border-b border-gray-100 no-print">
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-gray-100">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold">RentFlow</span>
        </div>

        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
