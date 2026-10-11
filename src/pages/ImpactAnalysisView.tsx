import React from 'react';
import {
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Clock,
  DollarSign,
  Activity,
  Layers,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';
import { Disruption, ImpactAnalysisResult, Project, Staff, Task } from '../types';
import { formatDate } from '../domain/graph';

interface ImpactAnalysisViewProps {
  activeDisruption: Disruption | null;
  impactResult: ImpactAnalysisResult | null;
  projects: Project[];
  tasks: Task[];
  staff: Staff[];
  onProceedToRecovery: () => void;
  onSelectDifferentDisruption: () => void;
}

export const ImpactAnalysisView: React.FC<ImpactAnalysisViewProps> = ({
  activeDisruption,
  impactResult,
  projects,
  tasks,
  staff,
  onProceedToRecovery,
  onSelectDifferentDisruption,
}) => {
  if (!activeDisruption || !impactResult) {
    return (
      <div className="p-12 text-center rounded-lg border border-slate-800 bg-slate-900/30 space-y-3">
        <TrendingDown className="w-8 h-8 text-slate-600 mx-auto" />
        <h2 className="text-sm font-semibold text-slate-200">No Disruption Selected for Analysis</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Please run a simulation first to evaluate operational ripple effects.
        </p>
        <button
          onClick={onSelectDifferentDisruption}
          className="mt-2 px-3.5 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors"
        >
          Go to Simulator
        </button>
      </div>
    );
  }

  const directTasks = impactResult.affectedTasks.filter((t) => t.isDirect);
  const indirectTasks = impactResult.affectedTasks.filter((t) => !t.isDirect);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-5 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
              Disruption Ripple Analysis
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono uppercase text-slate-400">
              {activeDisruption.type.replace('_', ' ')}
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-100 mt-0.5">
            {activeDisruption.title}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {impactResult.summaryText}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onSelectDifferentDisruption}
            className="px-3 py-1.5 text-xs font-medium rounded border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Change Scenario
          </button>
          <button
            onClick={onProceedToRecovery}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/10"
          >
            <span>Proceed to Recovery Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
            Schedule Slip
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400 tabular-nums">
            +{impactResult.totalDaysDelayed} Days
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Maximum ripple delay</span>
        </div>

        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
            Affected Tasks
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {impactResult.affectedTasks.length}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {directTasks.length} direct · {indirectTasks.length} downstream
          </span>
        </div>

        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
            Critical Path
          </span>
          <div
            className={`mt-2 text-2xl font-bold font-mono ${
              impactResult.criticalPathImpacted ? 'text-rose-400' : 'text-teal-400'
            }`}
          >
            {impactResult.criticalPathImpacted ? 'BREACHED' : 'SECURE'}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {impactResult.criticalPathImpacted
              ? 'Zero-float milestones delayed'
              : 'Float absorbed schedule shock'}
          </span>
        </div>

        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
            Cost Exposure
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-400 tabular-nums">
            ${impactResult.totalCostImpact.toLocaleString()}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Late penalties & overtime</span>
        </div>
      </div>

      {/* Project Impact Cards */}
      {impactResult.affectedProjects.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Project-Level Deadline & Milestone Breaches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {impactResult.affectedProjects.map((p) => (
              <div
                key={p.projectId}
                className={`p-4 rounded-lg border ${
                  p.isDeadlineBreached
                    ? 'bg-rose-950/15 border-rose-500/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{p.projectName}</h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Target Deadline:{' '}
                      <strong className="text-slate-200 font-mono">{p.originalDeadline}</strong>
                    </div>
                  </div>
                  {p.isDeadlineBreached && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-semibold">
                      Deadline Breach
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs pt-3 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Projected Finish</span>
                    <span
                      className={`font-mono font-medium ${
                        p.isDeadlineBreached ? 'text-rose-400' : 'text-slate-200'
                      }`}
                    >
                      {p.projectedEnd}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Delay Variance</span>
                    <span className="font-mono text-amber-400 font-medium">+{p.delayDays} days</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Project Loss</span>
                    <span className="font-mono text-slate-200">${p.budgetOverrun.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Affected Tasks Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Task Impact Log & Root Cause Attribution
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {impactResult.affectedTasks.length} affected
          </span>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Task Title</th>
                  <th className="py-2.5 px-3">Original Dates</th>
                  <th className="py-2.5 px-3">Projected Dates</th>
                  <th className="py-2.5 px-3">Delay</th>
                  <th className="py-2.5 px-3">Conflict & Root Cause Explanation</th>
                  <th className="py-2.5 px-3 text-right">Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {impactResult.affectedTasks.map((t) => (
                  <tr key={t.taskId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-mono uppercase font-semibold px-1.5 py-0.5 rounded ${
                          t.isDirect
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {t.isDirect ? 'Direct' : 'Downstream'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-200">{t.taskTitle}</span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {t.originalStart} → {t.originalEnd}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-amber-300 text-[11px] font-medium">
                      {t.newEstimatedStart} → {t.newEstimatedEnd}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-rose-400 font-medium">
                      +{t.delayDays}d
                    </td>

                    <td className="py-2.5 px-3 text-slate-300 text-[11px] max-w-md leading-relaxed">
                      {t.reason}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-rose-400">
                      {t.riskScore}/100
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};
