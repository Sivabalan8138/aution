'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  HelpCircle,
  Gavel,
  Trophy,
  History,
  ListOrdered,
  MonitorPlay,
  Settings,
  LogOut,
  Zap,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard',       href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Teams',           href: '/admin/teams',     icon: Users },
  { name: 'Questions',       href: '/admin/questions', icon: HelpCircle },
  { name: 'Auction Control', href: '/admin/auction',   icon: Gavel },
  { name: 'Score History',   href: '/admin/scores',    icon: History },
  { name: 'Auction History', href: '/admin/history',   icon: ListOrdered },
  { name: 'Settings',        href: '/admin/settings',  icon: Settings },
];

const externalItems = [
  { name: 'Leaderboard',  href: '/leaderboard', icon: Trophy },
  { name: 'Live Screen',  href: '/live',         icon: MonitorPlay },
];

const pageTitles: Record<string, string> = {
  dashboard:  'Dashboard',
  teams:      'Teams',
  questions:  'Questions',
  auction:    'Auction Control',
  scores:     'Score History',
  history:    'Auction History',
  settings:   'Settings',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') return <>{children}</>;

  const lastSegment = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  const pageTitle = pageTitles[lastSegment] ?? lastSegment.replace(/-/g, ' ');

  const handleLogout = () => {
    document.cookie = 'admin_token=; Max-Age=0; path=/';
    window.location.href = '/admin/login';
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      {/* ── Sidebar ── */}
      <aside className="w-60 bg-black/80 border-r border-white/5 flex flex-col h-screen sticky top-0 backdrop-blur-xl">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
          <div className="h-9 w-9 rounded-lg bg-red-500/15 flex items-center justify-center border border-red-500/20">
            <Zap className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <div className="font-black tracking-widest text-sm text-white">ELECTROBIT</div>
            <div className="text-[10px] text-red-500/80 font-mono tracking-widest uppercase">Admin Panel</div>
          </div>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Management</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-red-500/10 text-red-400'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {/* Active left bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-red-500 rounded-r" />
                )}
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-red-400' : 'text-gray-600 group-hover:text-gray-300'}`} />
                <span className="tracking-wide">{item.name}</span>
                {isActive && <ChevronRight className="h-3 w-3 ml-auto text-red-500/50" />}
              </Link>
            );
          })}

          <div className="px-3 pt-4 pb-2 text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Live Views</div>
          {externalItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                target="_blank"
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-all duration-150"
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-gray-600 group-hover:text-gray-300" />
                <span className="tracking-wide">{item.name}</span>
                <ExternalLink className="h-3 w-3 ml-auto text-gray-700 group-hover:text-gray-500" />
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="group flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut className="h-4 w-4 text-gray-600 group-hover:text-red-400" />
            <span className="tracking-wide">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top header bar */}
        <header className="h-14 bg-black/60 border-b border-white/5 flex items-center justify-between px-8 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 font-mono text-xs uppercase tracking-widest">Admin</span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-700" />
            <span className="font-bold text-white tracking-wide capitalize">{pageTitle}</span>
          </div>

          {/* Right info */}
          <div className="flex items-center gap-3">
            <Link href="/live" target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 rounded-lg transition-all">
              <MonitorPlay className="h-3.5 w-3.5" /> Live Screen
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2 text-xs font-mono text-gray-600 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              ADMIN
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {/* Subtle bg glow */}
          <div className="pointer-events-none fixed top-0 right-0 w-[500px] h-[500px] bg-red-500/[0.025] blur-[120px] rounded-full" />
          {children}
        </div>
      </main>
    </div>
  );
}
