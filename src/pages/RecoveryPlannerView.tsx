import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  GitCompare,
  Check,
  ShieldAlert,
  ArrowLeftRight,
  Clock,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  Disruption,
  ImpactAnalysisResult,
  Project,
  RecoveryPlan,
  RecoveryStrategy,
  Staff,
  Task,
} from '../types';

interface RecoveryPlannerViewProps {
  disruption: Disruption | null;
  impactResult: ImpactAnalysisResult | null;
  recoveryPlans: RecoveryPlan[];
  tasks: Task[];
  staff: Staff[];
  onApprovePlan: (plan: RecoveryPlan, reason: string) => void;
  onNavigateToComparison: () => void;
  onSelectDifferentDisruption: () => void;
}

export const RecoveryPlannerView: React.FC<RecoveryPlannerViewProps> = ({
  disruption,
  impactResult,
  recoveryPlans,
  tasks,
  staff,
  onApprovePlan,
  onNavigateToComparison,
  onSelectDifferentDisruption,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<RecoveryStrategy>('fast_track');
  const [approvalReason, setApprovalReason] = useState('Authorized operational schedule realignment.');
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  if (!disruption || !impactResult || recoveryPlans.length === 0) {
    return (
      <div className="p-12 text-center rounded-lg border border-slate-800 bg-slate-900/30 space-y-3">
        <RefreshCw className="w-8 h-8 text-slate-600 mx-auto" />
        <h2 className="text-sm font-semibold text-slate-200">No Active Recovery Plans</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Please simulate a disruption first to calculate impact and generate recovery strategies.
        </p>
        <button
          onClick={onSelectDifferentDisruption}
          className="mt-2 px-3.5 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors"
        >
          Open Disruption Simulator
        </button>
      </div>
    );
  }

  const currentPlan =
    recoveryPlans.find((p) => p.strategy === selectedStrategy) || recoveryPlans[0];

  const handleConfirmApproval = () => {
    onApprovePlan(currentPlan, approvalReason);
    setIsApproveDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-5 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold">
              Algorithmic Recovery Engine
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">Target Disruption:</span>
            <span className="text-xs font-semibold text-slate-200">{disruption.title}</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100 mt-1">{currentPlan.name}</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Deterministic rescheduling based on topological constraint propagation, blackout windows, and skill leveling.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onNavigateToComparison}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <GitCompare className="w-3.5 h-3.5 text-teal-400" />
            <span>Compare 3 Strategies</span>
          </button>
          <button
            onClick={() => setIsApproveDialogOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/10"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve & Apply Plan</span>
          </button>
        </div>
      </div>

      {/* Strategy Selector Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
        {[
          { key: 'fast_track' as RecoveryStrategy, label: 'Plan Alpha: Fast-Track & Reallocation' },
          { key: 'scope_triage' as RecoveryStrategy, label: 'Plan Beta: Scope Triage & Protection' },
          { key: 'schedule_extension' as RecoveryStrategy, label: 'Plan Gamma: Smooth Extension' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStrategy(tab.key)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              selectedStrategy === tab.key
                ? 'bg-slate-800 text-teal-300 border border-slate-700/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feasibility Alert / Card */}
      <div
        className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          currentPlan.isFeasible
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-950/20 border-amber-500/40 text-amber-300'
        }`}
      >
        <div className="flex items-start gap-3">
          {currentPlan.isFeasible ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold font-mono tracking-wider">
                {currentPlan.isFeasible ? 'MATHEMATICALLY FEASIBLE' : 'CONSTRAINED / CONFLICT DETECTED'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {currentPlan.isFeasible
                ? 'All task dependency links, personnel availability blackouts, and critical path constraints are satisfied without schedule violations.'
                : 'Hard contractual constraints cannot be met without trade-offs. Review actionable alternatives below.'}
            </p>
          </div>
        </div>

        {/* Quick Plan KPI Strip */}
        <div className="flex items-center gap-4 shrink-0 text-right font-mono text-xs border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Projected Finish</div>
            <div className="text-slate-100 font-bold">
              {currentPlan.summaryMetrics.projectedCompletionDate}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Delay</div>
            <div className="text-amber-400 font-bold">
              +{currentPlan.summaryMetrics.totalDelayDays}d
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Est. Loss</div>
            <div className="text-slate-100 font-bold">
              ${currentPlan.summaryMetrics.weightedBusinessLoss.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Infeasibility Explanations & Actionable Alternatives (If constrained) */}
      {!currentPlan.isFeasible && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-900/60 border border-rose-500/30 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Violated Operational Constraints ({currentPlan.infeasibilityReasons.length})</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {currentPlan.infeasibilityReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-rose-400 font-mono text-[11px] mt-0.5">✕</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/60 border border-teal-500/30 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Recommended Actionable Alternatives</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {currentPlan.actionableAlternatives.map((alt, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-teal-400 font-mono text-[11px] mt-0.5">→</span>
                  <span>{alt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Side-by-Side Original vs Proposed Schedule */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <ArrowLeftRight className="w-3.5 h-3.5 text-teal-400" />
            <span>Side-by-Side Schedule Comparison (Original vs Proposed)</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {currentPlan.revisedTasks.length} tasks scheduled
          </span>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Task ID / Title</th>
                  <th className="py-2.5 px-3">Original Window</th>
                  <th className="py-2.5 px-3 text-teal-300">Proposed Recovery Window</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Assigned Personnel</th>
                  <th className="py-2.5 px-3">Adjustment Status</th>
                  <th className="py-2.5 px-3">Rationale & Optimization Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {currentPlan.revisedTasks.map((rev) => {
                  const origTask = tasks.find((t) => t.id === rev.taskId);
                  const assignedNames = rev.assignedStaffIds
                    .map((id) => staff.find((s) => s.id === id)?.name)
                    .filter(Boolean);

                  return (
                    <tr key={rev.taskId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-teal-400 font-medium">
                          {origTask?.code || rev.taskId}
                        </div>
                        <div className="text-slate-200 font-medium">{origTask?.title || rev.taskId}</div>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-500 line-through text-[11px]">
                        {rev.originalStart} → {rev.originalEnd}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-teal-300 font-semibold text-[11px]">
                        {rev.proposedStart} → {rev.proposedEnd}
                      </td>

                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                        {rev.durationDays}d
                      </td>

                      <td className="py-2.5 px-3 text-slate-300">
                        {assignedNames.join(', ') || <span className="text-slate-600">Unassigned</span>}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-mono uppercase font-semibold px-1.5 py-0.5 rounded ${
                            rev.status === 'kept'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : rev.status === 'reassigned'
                              ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                              : rev.status === 'shifted'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              : rev.status === 'crashed'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {rev.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs leading-relaxed">
                        {rev.changeNotes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approval Confirmation Dialog */}
      {isApproveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-400" />
              <span>Approve & Apply Operational Plan</span>
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Applying this plan will commit the proposed start and end dates to active tasks, log an audit decision, and update the schedule.
            </p>

            <div className="mt-4 p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-slate-400">Strategy: <strong className="text-slate-200">{currentPlan.name}</strong></div>
              <div className="text-slate-400">Projected Finish: <strong className="text-teal-400">{currentPlan.summaryMetrics.projectedCompletionDate}</strong></div>
              <div className="text-slate-400">Total Delay: <strong className="text-amber-400">+{currentPlan.summaryMetrics.totalDelayDays} days</strong></div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Authorization Note / Justification
              </label>
              <textarea
                rows={2}
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Reason for approving this plan..."
                className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsApproveDialogOpen(false)}
                className="px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors"
              >
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
