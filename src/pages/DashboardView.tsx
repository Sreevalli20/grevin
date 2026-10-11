import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  Plus,
  Users,
  Zap,
  Flame,
  Shield,
  TrendingUp,
  Target,
} from 'lucide-react';
import { AppState } from '../types';
import { formatDate } from '../domain/graph';
import { NavTab } from '../components/Navbar';

interface DashboardViewProps {
  state: AppState;
  onNavigate: (tab: NavTab) => void;
  onOpenNewProject: () => void;
  onOpenNewTask: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  onNavigate,
  onOpenNewProject,
  onOpenNewTask,
}) => {
  const { projects, tasks, staff, disruptions } = state;
  const [animateMetrics, setAnimateMetrics] = useState(false);

  // Trigger animation on mount
  React.useEffect(() => {
    setTimeout(() => setAnimateMetrics(true), 100);
  }, []);

  // Real metric calculations from stored state
  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'at_risk');
  const openTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');

  const todayStr = '2026-10-10'; // Anchor date
  const overdueTasks = tasks.filter((t) => t.status !== 'completed' && t.endDate < todayStr);

  const activeDisruptions = disruptions.filter(
    (d) => d.status === 'simulated' || d.status === 'analyzed'
  );

  // Total budget & cost exposure
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
  const totalTaskCost = tasks.reduce((acc, t) => acc + t.costEstimate, 0);

  // Staff utilization calculation: count tasks currently assigned to each staff
  const staffLoad = staff.map((s) => {
    const assignedTasks = tasks.filter(
      (t) => t.assignedStaffIds.includes(s.id) && t.status !== 'completed'
    );
    const assignedHours = assignedTasks.reduce((acc, t) => acc + t.durationDays * s.dailyCapacityHours, 0);
    // Rough weekly load based on 40 hrs
    const loadPercent = Math.min(100, Math.round((assignedHours / (s.maxHoursPerWeek || 40)) * 100));
    return {
      staff: s,
      assignedCount: assignedTasks.length,
      loadPercent,
    };
  });

  const avgUtilization =
    staffLoad.length > 0
      ? Math.round(staffLoad.reduce((acc, s) => acc + s.loadPercent, 0) / staffLoad.length)
      : 0;

  // Task priorities count
  const criticalCount = tasks.filter((t) => t.priority === 'critical').length;
  const highCount = tasks.filter((t) => t.priority === 'high').length;
  const mediumCount = tasks.filter((t) => t.priority === 'medium').length;
  const lowCount = tasks.filter((t) => t.priority === 'low').length;

  // Empty state check
  const hasData = projects.length > 0 || tasks.length > 0 || staff.length > 0;

  return (
    <div className="space-y-6">

      {/* Empty State */}
      {!hasData && (
        <div className="p-8 rounded-lg bg-slate-900/60 border border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-teal-500/10 flex items-center justify-center">
            <Layers className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Welcome to PivotOS</h2>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
              Start by creating a project, adding team members, or load a sample workspace to explore the features.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onOpenNewProject}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <span>Load Sample Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Banner / Disruption Alert if active */}
      {hasData && activeDisruptions.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-amber-500/10 text-amber-400 mt-0.5 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-semibold text-amber-400 tracking-wider">
                  Attention Needed
                </span>
                <span className="text-xs text-amber-500/80">·</span>
                <span className="text-xs text-slate-400 font-mono">
                  {activeDisruptions[0].type.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-slate-100 mt-0.5">
                {activeDisruptions[0].title}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                {activeDisruptions[0].description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              onClick={() => onNavigate('impact')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>See What Changed</span>
            </button>
            <button
              onClick={() => onNavigate('recovery')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-colors whitespace-nowrap"
            >
              <span>View Recovery Plans</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Only show if has data */}
      {hasData && (
        <>
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">

        {/* Active Projects */}
        <div className={`p-4 rounded-lg bg-slate-900/60 border border-slate-800 transition-all hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/5 ${animateMetrics ? 'animate-in fade-in slide-in-from-bottom-2 duration-500' : ''}`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Active Projects</span>
            <div className="p-1.5 rounded bg-teal-500/10">
              <Layers className="w-4 h-4 text-teal-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
              {activeProjects.length}
            </span>
            <span className="text-xs text-slate-400">
              of {projects.length} total
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <span className="text-teal-400 font-mono tabular-nums font-medium">
              ${totalBudget.toLocaleString()}
            </span>
            <span>total budget</span>
          </div>
        </div>

        {/* Open Tasks */}
        <div className={`p-4 rounded-lg bg-slate-900/60 border border-slate-800 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 ${animateMetrics ? 'animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100' : ''}`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Open Tasks</span>
            <div className="p-1.5 rounded bg-blue-500/10">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
              {openTasks.length}
            </span>
            <span className="text-xs text-slate-400">
              ({inProgressTasks.length} in flight)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
            <span className="text-emerald-400 font-mono tabular-nums">{completedTasks.length} done</span>
            <span>·</span>
            <span className="text-amber-400 font-mono tabular-nums">{blockedTasks.length} blocked</span>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className={`p-4 rounded-lg bg-slate-900/60 border ${overdueTasks.length > 0 ? 'border-rose-500/30 hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/5' : 'border-slate-800 hover:border-slate-700'} transition-all ${animateMetrics ? 'animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200' : ''}`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Overdue Tasks</span>
            <div className={`p-1.5 rounded ${overdueTasks.length > 0 ? 'bg-rose-500/10' : 'bg-slate-800'}`}>
              <Clock className={`w-4 h-4 ${overdueTasks.length > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tabular-nums ${overdueTasks.length > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
              {overdueTasks.length}
            </span>
            <span className="text-xs text-slate-400">
              past deadline
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {overdueTasks.length > 0 ? (
              <span className="text-rose-400 flex items-center gap-1">
                <Flame className="w-3 h-3" />
                Critical recovery required
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                All current milestones intact
              </span>
            )}
          </div>
        </div>

        {/* Resource Utilization */}
        <div className={`p-4 rounded-lg bg-slate-900/60 border border-slate-800 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 ${animateMetrics ? 'animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300' : ''}`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Avg Staff Load</span>
            <div className="p-1.5 rounded bg-purple-500/10">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-teal-400 tabular-nums">
              {avgUtilization}%
            </span>
            <span className="text-xs text-slate-400">
              across {staff.length} staff
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <span>Capacity threshold: nominal</span>
          </div>
        </div>

      </div>

      {/* Quick Actions */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-teal-950/30 to-blue-950/30 border border-teal-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-400" />
              Quick Actions
            </h3>
            <p className="text-xs text-slate-400 mt-1">Fast-track common operations</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('simulator')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Simulate Disruption</span>
            </button>
            <button
              onClick={onOpenNewTask}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Projects Status & Resource Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Active Projects Column (2 cols wide) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Your Projects
              </h2>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-400">{projects.length} Total</span>
            </div>
            <button
              onClick={onOpenNewProject}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>+ New Project</span>
            </button>
          </div>

          <div className="space-y-3">
            {projects.map((proj) => {
              const projTasks = tasks.filter((t) => t.projectId === proj.id);
              const projDone = projTasks.filter((t) => t.status === 'completed').length;
              const progressPct = projTasks.length > 0 ? Math.round((projDone / projTasks.length) * 100) : 0;
              const isOverdue = proj.deadline < todayStr && proj.status !== 'completed';

              return (
                <div
                  key={proj.id}
                  className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-teal-400 font-medium">{proj.code}</span>
                        <span className="text-slate-500 text-xs">·</span>
                        <h3 className="text-sm font-semibold text-slate-100">{proj.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{proj.description}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Deadline</div>
                        <div className={`text-xs font-mono tabular-nums font-medium ${isOverdue ? 'text-rose-400' : 'text-slate-200'}`}>
                          {formatDate(proj.deadline)}
                        </div>
                      </div>
                      <div className="text-right pl-3 border-l border-slate-800">
                        <div className="text-xs text-slate-400">Budget</div>
                        <div className="text-xs font-mono tabular-nums text-slate-200">
                          ${proj.budget.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & Sub-stats */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-4">
                    <div className="flex-1 max-w-md">
                      <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                        <span>Task Completion</span>
                        <span className="tabular-nums">{progressPct}% ({projDone}/{projTasks.length})</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigate('tasks')}
                        className="px-2.5 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                      >
                        Tasks ({projTasks.length})
                      </button>
                      <button
                        onClick={() => onNavigate('projects')}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        aria-label="View project details"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Staff Allocation & Priority Mix */}
        <div className="space-y-6">
          
          {/* Priority Distribution */}
          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Task Priorities
            </h3>
            
            <div className="space-y-2 pt-1 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-rose-400">Critical Priority</span>
                <span className="text-slate-200 tabular-nums">{criticalCount} tasks</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${tasks.length ? (criticalCount / tasks.length) * 100 : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-amber-400">High Priority</span>
                <span className="text-slate-200 tabular-nums">{highCount} tasks</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${tasks.length ? (highCount / tasks.length) * 100 : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-teal-400">Medium Priority</span>
                <span className="text-slate-200 tabular-nums">{mediumCount} tasks</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500"
                  style={{ width: `${tasks.length ? (mediumCount / tasks.length) * 100 : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Low Priority</span>
                <span className="text-slate-200 tabular-nums">{lowCount} tasks</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-600"
                  style={{ width: `${tasks.length ? (lowCount / tasks.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Staff Allocation Meter */}
          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Who Is Available?
              </h3>
              <button
                onClick={() => onNavigate('resources')}
                className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
              >
                Manage
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {staffLoad.slice(0, 4).map((item) => (
                <div key={item.staff.id} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-200 font-medium truncate max-w-[140px]">
                      {item.staff.name}
                    </span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {item.assignedCount} tasks · {item.loadPercent}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.loadPercent > 90
                          ? 'bg-rose-500'
                          : item.loadPercent > 70
                          ? 'bg-amber-400'
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${item.loadPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Operations Launchpad */}
          <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Quick Actions
            </h3>

            <button
              onClick={() => onNavigate('simulator')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-teal-400" />
                Test a Disruption Scenario
              </span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenNewTask}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded bg-slate-800/80 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Add a New Task
              </span>
              <span className="text-slate-400 font-mono text-[11px]">+</span>
            </button>

            <button
              onClick={() => onNavigate('settings')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded bg-slate-800/80 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                Open Settings
              </span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
      </>
      )}

    </div>
  );
};
