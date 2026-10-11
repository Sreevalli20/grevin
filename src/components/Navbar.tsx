import React, { useState } from 'react';
import {
  Activity,
  Layers,
  Calendar,
  Users,
  Zap,
  TrendingDown,
  RefreshCw,
  GitCompare,
  History,
  Settings as SettingsIcon,
  Menu,
  X,
  AlertCircle,
  Compass,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'projects'
  | 'tasks'
  | 'resources'
  | 'simulator'
  | 'impact'
  | 'recovery'
  | 'scenarios'
  | 'history'
  | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeDisruptionCount: number;
  onOpenTutorial?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeDisruptionCount,
  onOpenTutorial,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'projects', label: 'Projects', icon: Layers },
    { id: 'tasks', label: 'Tasks', icon: Calendar },
    { id: 'resources', label: 'Resources', icon: Users },
    { id: 'simulator', label: 'Simulator', icon: Zap },
    { id: 'impact', label: 'Impact', icon: TrendingDown },
    { id: 'recovery', label: 'Recovery', icon: RefreshCw },
    { id: 'scenarios', label: 'Compare', icon: GitCompare },
    { id: 'history', label: 'Audit Log', icon: History },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0c1220]/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2 text-left focus:outline-none group"
            >
              <div className="w-7 h-7 rounded bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-mono font-bold text-xs tracking-wider group-hover:border-teal-400/60 transition-colors">
                PØ
              </div>
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                Pivot<span className="text-teal-400">OS</span>
              </span>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav className="hidden xl:flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-800/90 text-teal-300 shadow-sm border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.id === 'simulator' && activeDisruptionCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Medium viewports scrollable strip */}
          <nav className="hidden md:flex xl:hidden items-center gap-1 overflow-x-auto py-1">
            {navItems.slice(0, 6).map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-teal-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
            >
              More...
            </button>
          </nav>

          {/* Zone 3: Primary Action & Mobile trigger */}
          <div className="flex items-center gap-2.5 shrink-0">
            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border border-slate-700/80 text-slate-300 hover:text-teal-300 hover:border-teal-500/40 transition-colors whitespace-nowrap"
                title="Interactive Walkthrough Guide"
              >
                <Compass className="w-3.5 h-3.5 text-teal-400" />
                <span>Tour</span>
              </button>
            )}

            {activeDisruptionCount > 0 ? (
              <button
                onClick={() => onSelectTab('impact')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeDisruptionCount} Active Disruption{activeDisruptionCount > 1 ? 's' : ''}</span>
              </button>
            ) : null}

            <button
              onClick={() => onSelectTab('simulator')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Disruption</span>
            </button>

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#0c1220] border-b border-slate-800 px-4 pt-2 pb-4 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md text-left transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-teal-300 border border-slate-700/80'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
