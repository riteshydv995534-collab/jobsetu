import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileCheck2,
  UserCheck,
  Sparkles,
  ShieldCheck,
  Scale,
  Scroll,
  Calendar,
  BarChart3,
  Database,
  ClipboardList,
  Server,
  Settings,
  LogOut,
  Menu,
  X,
  Info,
  Shield,
  Briefcase,
  Building2,
  Users,
  Home,
  Clock
} from 'lucide-react';
import LiveBackground from '../components/LiveBackground';

const DashboardLayout = () => {
  const { user, logout, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Section 20: Standard Navigation for JanSetu Authorised Government Officers
  const allNavItems = [
    { label: 'Command Centre', path: '/', icon: LayoutDashboard },
    { label: 'Imported Applications', path: '/applications', icon: FileCheck2 },
    { label: 'Applicant Stage Tracker', path: '/applicant-tracker', icon: Clock, badge: 'Stage 1-6', badgeColor: 'bg-indigo-600' },
    { label: 'Individual & Household Verification', path: '/lookup', icon: UserCheck, badge: 'Live Roster', badgeColor: 'bg-teal-600' },
    { label: 'Eligibility Assessment', path: '/potential-benefits', icon: Sparkles, badge: 'Deterministic', badgeColor: 'bg-emerald-600' },
    { label: 'Duplicate Review', path: '/duplicate-review', icon: ShieldCheck, badge: 'De-Dup Engine', badgeColor: 'bg-amber-500' },
    { label: 'Household Allocation Review', path: '/household-allocations', icon: Scale, badge: 'Fair Policy', badgeColor: 'bg-blue-600' },
    { label: 'Scheme Directory', path: '/schemes', icon: Scroll },
    { label: 'Activity Calendar', path: '/calendar', icon: Calendar, badge: 'Interactive', badgeColor: 'bg-teal-600' },
    { label: 'Analytics & Reports', path: '/reports', icon: BarChart3 },
    { label: 'Benefit Records', path: '/records-explorer', icon: Database },
    {
      label: 'Audit History',
      path: '/audit-logs',
      icon: ClipboardList,
      roles: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'RECORDS_ADMIN', 'SCHEME_SUPERVISOR']
    },
    {
      label: 'Data Integrations',
      path: '/api-integrations',
      icon: Server,
      badge: 'Bridges',
      badgeColor: 'bg-purple-600',
      roles: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'RECORDS_ADMIN']
    },
    {
      label: 'Account & Permissions',
      path: '/settings',
      icon: Settings,
      roles: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'RECORDS_ADMIN']
    }
  ];

  // Filter navigation items by assigned officer permissions
  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  });

  const handleRoleToggle = async (accountEmail) => {
    try {
      await demoLogin(accountEmail);
      navigate('/');
    } catch (err) {
      console.error('Role switch failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col relative font-sans">
      <LiveBackground />

      {/* Synthetic Demonstration Header Notice */}
      <div className="bg-amber-50/95 backdrop-blur-xs border-b border-amber-200/80 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="font-medium text-[11px] sm:text-xs">
            <strong>GovTech Hackathon Demonstration Environment:</strong> All citizen records, NFSA rosters, and DBT accounts are synthetic demonstration data (<span className="font-mono text-amber-950 font-bold">DEMO-ID-XXXXXX</span>).
          </span>
          <span className="hidden md:inline-block ml-auto text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
            PFMS / DBT MOCK ACTIVE
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Persistent Officer Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex-shrink-0 relative z-20 shadow-xl">
          {/* Official GovTech Branding */}
          <div className="p-4 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-white text-base tracking-tight flex items-center gap-1.5">
                JANSETU <span className="text-[10px] bg-teal-500/30 text-teal-300 border border-teal-500/40 px-1.5 py-0.2 rounded font-mono font-bold">v2.5</span>
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">Verification & Allocation Support</div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Authorised Modules
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded text-white ${item.badgeColor || 'bg-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Rapid Persona Switcher for Hackathon Evaluation */}
          <div className="p-3 m-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs shadow-inner space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>Evaluation Role Switcher</span>
              <span className="text-teal-400 font-mono text-[9px]">Live RBAC</span>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => handleRoleToggle('admin@jansetu.gov.demo')}
                className={`px-2 py-1.5 rounded-lg font-bold text-center transition-colors col-span-2 ${
                  user?.email === 'admin@jansetu.gov.demo'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Super Admin (All Schemes)
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('dept.admin@jansetu.gov.demo')}
                className={`px-1.5 py-1 rounded-md font-bold text-center truncate ${
                  user?.email?.includes('dept')
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Dept Admin
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('supervisor@jansetu.gov.demo')}
                className={`px-1.5 py-1 rounded-md font-bold text-center truncate ${
                  user?.email?.includes('supervisor')
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Supervisor
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('officer.education@jansetu.gov.demo')}
                className={`px-1.5 py-1 rounded-md font-bold text-center truncate ${
                  user?.email?.includes('education')
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Edu Officer
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('officer.housing@jansetu.gov.demo')}
                className={`px-1.5 py-1 rounded-md font-bold text-center truncate ${
                  user?.email?.includes('housing')
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Housing Officer
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('officer.verification@jansetu.gov.demo')}
                className={`px-2 py-1.5 rounded-lg font-bold text-center transition-colors col-span-2 ${
                  user?.email?.includes('verification')
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Verification Officer
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="truncate">Officer: <strong className="text-teal-300 font-semibold">{user?.name}</strong></span>
              <button onClick={logout} className="text-rose-400 hover:text-rose-300 font-bold p-0.5" title="Sign Out">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden bg-slate-950/80 backdrop-blur-xs flex">
            <div className="w-72 bg-slate-900 text-slate-200 h-full flex flex-col p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="font-bold text-white text-base">JanSetu Command Centre</div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                          isActive ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>

              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full py-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-bold mt-auto"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Pane */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Operational Bar */}
          <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between relative z-10 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <div className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Authorised Officer Workspace</span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200">
                    {user?.role || 'GOV_OFFICER'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 hidden sm:block">
                  {user?.department || 'Department of Public Distribution & Social Welfare'}
                </div>
              </div>
            </div>

            {/* Officer Details & Quick Actions */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900">{user?.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {user?.badgeNumber || 'JS-OFFICER-01'} • {user?.assignedDistrict || 'All Districts'}
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user?.name ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2) : 'JS'}
              </div>

              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Secure Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Sub-View Canvas */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;