import Link from 'next/link';
import { Zap, Trophy, Users, Gavel, ArrowRight, Activity, BookOpen, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#040407] text-white overflow-x-hidden">

      {/* ── Navigation ── */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-cyan-500/15 rounded-lg flex items-center justify-center border border-cyan-500/20">
              <Zap className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="font-black tracking-widest text-sm text-white">ELECTROBID</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'About', href: '#about' },
              { label: 'Levels', href: '#difficulty' },
              { label: 'Rules', href: '/rules' },
              { label: 'Leaderboard', href: '/leaderboard' },
            ].map((item) => (
              <Link key={item.label} href={item.href}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white font-medium tracking-wide rounded-lg hover:bg-white/5 transition-all">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/team/login"
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-bold rounded-lg transition-all">
            <Gavel className="h-4 w-4" /> Enter Portal
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-28 lg:pt-48 lg:pb-36 flex-1 flex flex-col justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, rgba(255,0,234,0.04) 40%, transparent 70%)' }} />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.025]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
          {/* Floating orbs */}
          <div className="absolute top-20 right-20 w-80 h-80 bg-fuchsia-500/5 blur-[100px] rounded-full" />
          <div className="absolute bottom-20 left-20 w-60 h-60 bg-cyan-500/5 blur-[80px] rounded-full" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-10 text-sm">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
            </span>
            <span className="text-cyan-400 font-mono tracking-widest uppercase text-xs">THE EEE AUCTION CHALLENGE</span>
          </div>

          {/* Main headline */}
          <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter uppercase mb-6 leading-none"
            style={{ background: 'linear-gradient(135deg, #ffffff 0%, #00e5ff 40%, #ff00ea 70%, #f0f000 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ELECTRO<br className="md:hidden" />BID
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 font-light mb-14 max-w-2xl mx-auto leading-relaxed">
            Bid your points. Win the question. Master the circuit.<br />
            <span className="text-gray-500 text-lg italic">"Bid Smart. Answer Fast. Win Big."</span>
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register"
              className="group relative px-8 py-4 bg-cyan-500 text-black font-black text-sm uppercase tracking-widest rounded-xl hover:bg-white transition-all duration-300 w-full sm:w-auto overflow-hidden shadow-[0_0_40px_rgba(0,229,255,0.3)] hover:shadow-[0_0_60px_rgba(0,229,255,0.5)]">
              <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500 skew-x-12" />
              <span className="relative flex items-center gap-2 justify-center">
                <Users className="h-4 w-4" /> Register Team
              </span>
            </Link>
            <Link href="/team/login"
              className="group flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-cyan-500/50 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-all w-full sm:w-auto justify-center">
              <Gavel className="h-4 w-4" /> Enter Bidding
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/live"
              className="group flex items-center gap-2 px-8 py-4 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 font-bold text-sm uppercase tracking-widest rounded-xl transition-all w-full sm:w-auto justify-center">
              <Activity className="h-4 w-4" /> Live Auction
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div className="border-y border-white/5 bg-white/[0.02] py-8">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '4', label: 'Difficulty Levels' },
              { value: '5,000', label: 'Starting Points' },
              { value: 'REAL-TIME', label: 'Live Bidding' },
              { value: '∞', label: 'Strategy Depth' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-black font-mono text-cyan-400 mb-1">{stat.value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-widest font-mono">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Difficulty Levels ── */}
      <section id="difficulty" className="py-28 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-xs font-mono text-cyan-400/70 tracking-[0.3em] uppercase mb-3">Question Categories</div>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">Difficulty Levels</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Higher difficulty means higher base points — but greater risk when bidding.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { level: 'EASY',           pts: 100,  color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',  desc: 'Basic EEE concepts. Great for building your score safely.' },
              { level: 'MEDIUM',         pts: 300,  color: '#eab308', bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)',  desc: 'Core engineering principles with moderate risk.' },
              { level: 'HARD',           pts: 500,  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',  desc: 'Complex problems requiring deep technical knowledge.' },
              { level: 'SUPER CHALLENGE',pts: 1000, color: '#a855f7', bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.2)', desc: 'Maximum risk. Maximum reward. For the brave.' },
            ].map((item) => (
              <div key={item.level}
                className="group relative p-8 rounded-2xl border hover:-translate-y-2 transition-all duration-300"
                style={{ background: item.bg, borderColor: item.border, boxShadow: `0 0 30px ${item.bg}` }}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: item.bg, border: `1px solid ${item.border}` }}>
                  <div className="h-3 w-3 rounded-full" style={{ background: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                </div>
                <h3 className="font-black text-lg uppercase tracking-widest mb-2" style={{ color: item.color }}>{item.level}</h3>
                <div className="text-4xl font-black font-mono text-white mb-3">{item.pts.toLocaleString()}<span className="text-lg text-gray-500 ml-1">pts</span></div>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="about" className="py-28 border-t border-white/5 bg-white/[0.01]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-xs font-mono text-fuchsia-400/70 tracking-[0.3em] uppercase mb-3">Game Flow</div>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight">How It Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: '01', icon: Users, color: '#00e5ff', title: 'Register & Receive Points', desc: 'Each team starts with 5,000 points. This is your bidding currency. Spend it wisely throughout the event.' },
              { step: '02', icon: Gavel, color: '#ff00ea', title: 'Bid on Questions', desc: 'The host reveals a question. Teams compete by bidding points. The highest bid when time runs out wins the right to answer.' },
              { step: '03', icon: Trophy, color: '#f0f000', title: 'Answer & Score', desc: 'Correct answer adds your winning bid to your score. Wrong answer deducts the bid. Strategy and knowledge both win.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="relative p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                  <div className="text-6xl font-black font-mono mb-6 leading-none" style={{ color: item.color, opacity: 0.15 }}>{item.step}</div>
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-5 -mt-12"
                    style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}>
                    <Icon className="h-6 w-6" style={{ color: item.color }} />
                  </div>
                  <h3 className="text-xl font-black mb-3 tracking-wide">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-24 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/5 blur-[100px] rounded-full" />
        </div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6">Ready to Compete?</h2>
          <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">Register your team and prepare to outsmart, outbid, and outperform every rival.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register"
              className="px-10 py-4 bg-cyan-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all shadow-[0_0_40px_rgba(0,229,255,0.25)] text-sm">
              Register Now
            </Link>
            <Link href="/rules"
              className="flex items-center gap-2 px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold uppercase tracking-widest rounded-xl transition-all text-sm justify-center">
              <BookOpen className="h-4 w-4" /> Read Rules
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10 bg-black/40">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="font-black tracking-widest text-sm">ELECTROBID</span>
            <span className="text-gray-600 text-xs font-mono ml-2">© 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/rules" className="hover:text-white transition-colors flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Rules
            </Link>
            <Link href="/leaderboard" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> Leaderboard
            </Link>
            <Link href="/admin/login" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
