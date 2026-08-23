'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Gavel, 
  Trophy, 
  MonitorPlay,
  LogOut,
  Mic2
} from 'lucide-react';

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  if (pathname === '/host/login') {
    return <>{children}</>;
  }

  const navItems = [
    { name: 'Auction Control', href: '/host/auction', icon: Gavel },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy, external: true },
    { name: 'Live Screen', href: '/live', icon: MonitorPlay, external: true },
  ];

  const handleLogout = async () => {
    document.cookie = 'admin_token=; Max-Age=0; path=/';
    window.location.href = '/host/login';
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      {/* Sidebar */}
      <aside className="w-64 bg-black border-r border-white/5 flex flex-col h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <Mic2 className="h-6 w-6 text-purple-500" />
          <span className="font-black tracking-widest text-lg">HOST</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                target={item.external ? '_blank' : '_self'}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium text-sm tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium text-sm tracking-wide">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-black/50 border-b border-white/5 flex items-center px-8 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-xl font-bold tracking-wider capitalize text-gray-200">
            {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
          </h1>
        </header>
        <div className="flex-1 overflow-y-auto p-8 relative">
           <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 opacity-[0.02] blur-[100px] rounded-full pointer-events-none"></div>
          {children}
        </div>
      </main>
    </div>
  );
}
