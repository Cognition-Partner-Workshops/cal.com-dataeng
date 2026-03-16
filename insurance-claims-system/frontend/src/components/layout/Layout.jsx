import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, FileText, ClipboardList, LogOut, Menu, X, User } from 'lucide-react';
import useStore from '../../store/useStore';

const roleLabels = {
  policyholder: 'Policyholder',
  claims_adjuster: 'Claims Adjuster',
  claims_manager: 'Claims Manager',
  compliance_officer: 'Compliance Officer',
  executive: 'Executive',
};

const navItems = {
  policyholder: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/claims/new', label: 'File a Claim', icon: FileText },
  ],
  claims_adjuster: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ],
  claims_manager: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ],
  compliance_officer: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ],
  executive: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ],
};

export default function Layout() {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const items = navItems[user?.role] || [];

  return (
    <div className="min-h-screen flex flex-col">
      <header role="banner" className="bg-primary-600 text-white shadow-lg z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1 rounded hover:bg-primary-700 focus:ring-2 focus:ring-accent-400"
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Shield size={28} className="text-accent-400" />
              <span className="text-xl font-bold hidden sm:inline">SafeGuard Insurance</span>
              <span className="text-xl font-bold sm:hidden">SafeGuard</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm">
              <User size={16} />
              <span>{user?.first_name} {user?.last_name}</span>
              <span className="bg-accent-400 text-primary-900 px-2 py-0.5 rounded-full text-xs font-medium">
                {roleLabels[user?.role]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm hover:text-accent-400 transition-colors focus:ring-2 focus:ring-accent-400 rounded p-1"
              aria-label="Logout"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <nav
          role="navigation"
          aria-label="Main navigation"
          className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-64 bg-white border-r border-gray-200 shadow-sm fixed lg:static top-14 bottom-0 z-20`}
        >
          <div className="p-4 space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 border-l-4 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="p-4 mt-4 lg:hidden border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User size={16} />
              <span>{user?.first_name} {user?.last_name}</span>
            </div>
            <span className="mt-1 inline-block bg-accent-400 text-primary-900 px-2 py-0.5 rounded-full text-xs font-medium">
              {roleLabels[user?.role]}
            </span>
          </div>
        </nav>

        <main id="main-content" role="main" className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
