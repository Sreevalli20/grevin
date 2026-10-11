import React, { useState } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingDown,
  Layers,
  ArrowRight,
  Calculator,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Disruption, RecoveryPlan, SystemSettings } from '../types';

interface ScenarioComparisonViewProps {
  disruption: Disruption | null;
  recoveryPlans: RecoveryPlan[];
  settings: SystemSettings;
  onApprovePlan: (plan: RecoveryPlan, reason: string) => void;
  onNavigateToSimulator: () => void;
}

export const ScenarioComparisonView: React.FC<ScenarioComparisonViewProps> = ({
  disruption,
  recoveryPlans,
  settings,
  onApprovePlan,
  onNavigateToSimulator,
}) => {
  const [selectedPlanForApproval, setSelectedPlanForApproval] = useState<RecoveryPlan | null>(null);
  const [approvalReason, setApprovalReason] = useState('Selected optimal trade-off scenario after comparison.');

  if (!disruption || recoveryPlans.length === 0) {
    return (
      <div className="p-12 text-center rounded-lg border border-slate-800 bg-slate-900/30 space-y-3">
        <GitCompare className="w-8 h-8 text-slate-600 mx-auto" />
        <h2 className="text-sm font-semibold text-slate-200">No Recovery Scenarios to Compare</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Please simulate a disruption first to generate algorithmic recovery options.
        </p>
        <button
          onClick={onNavigateToSimulator}
          className="mt-2 px-3.5 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors"
        >
          Open Disruption Simulator
        </button>
      </div>
    );
  }

  const handleConfirmApproval = () => {
    if (selectedPlanForApproval) {
      onApprovePlan(selectedPlanForApproval, approvalReason);
      setSelectedPlanForApproval(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold">
            Comparative Decision Matrix
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-xs text-slate-400">Target Disruption:</span>
          <span className="text-xs font-semibold text-slate-200">{disruption.title}</span>
        </div>
        <h1 className="text-lg font-bold text-slate-100 mt-1">
          Multi-Scenario Recovery Evaluation
        </h1>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
          Quantitative trade-off analysis across schedule velocity, contractual penalties, scope integrity, and business loss.
        </p>
      </div>

      {/* Side-by-Side 3-Card Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recoveryPlans.map((plan) => {
          const isAlpha = plan.strategy === 'fast_track';
          const isBeta = plan.strategy === 'scope_triage';
          const isGamma = plan.strategy === 'schedule_extension';

          return (
            <div
              key={plan.id}
              className={`p-5 rounded-lg bg-slate-900/70 border flex flex-col justify-between transition-all ${
                plan.isFeasible ? 'border-slate-800 hover:border-teal-500/40' : 'border-amber-500/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-teal-400">
                    {isAlpha ? 'Strategy Alpha' : isBeta ? 'Strategy Beta' : 'Strategy Gamma'}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                      plan.isFeasible
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {plan.isFeasible ? 'FEASIBLE' : 'CONSTRAINED'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100 mt-2">{plan.name}</h3>
                
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {isAlpha
                    ? 'Reassigns cross-trained staff, fast-tracks tasks via overtime to protect hard deadlines.'
                    : isBeta
                    ? 'Protects critical milestones by deferring low-priority scope to post-launch sprint.'
                    : 'Sequentially shifts schedule along dependency chains to eliminate employee stress & rush.'}
                </p>

                {/* Metric Strip */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">Projected Finish:</span>
                    <span className="text-slate-200 font-semibold">
                      {plan.summaryMetrics.projectedCompletionDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">Schedule Delay:</span>
                    <span className="text-amber-400 font-semibold">
                      +{plan.summaryMetrics.totalDelayDays} Days
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">Overdue Tasks:</span>
                    <span
                      className={plan.summaryMetrics.overdueTasksCount > 0 ? 'text-rose-400' : 'text-emerald-400'}
                    >
                      {plan.summaryMetrics.overdueTasksCount} tasks
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">Budget Cost Delta:</span>
                    <span
                      className={plan.summaryMetrics.budgetCostDelta > 0 ? 'text-rose-400' : 'text-emerald-400'}
                    >
                      {plan.summaryMetrics.budgetCostDelta > 0 ? '+' : ''}$
                      {plan.summaryMetrics.budgetCostDelta.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">Resource Load:</span>
                    <span className="text-slate-300">
                      {plan.summaryMetrics.resourceLoadPercent}%
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 font-sans font-semibold">Business Loss Index:</span>
                    <span className="text-rose-400 font-bold text-sm">
                      ${plan.summaryMetrics.weightedBusinessLoss.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setSelectedPlanForApproval(plan)}
                  className={`w-full py-2 px-3 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 ${
                    isAlpha
                      ? 'bg-teal-500 text-slate-950 hover:bg-teal-400'
                      : 'border border-slate-700 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Choose This Strategy</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formula Transparency Box */}
      <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400">
          <Calculator className="w-4 h-4" />
          <span>Transparent Mathematical Formulation & Weighting Constants</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          PivotOS calculates the <strong className="text-white">Weighted Business Loss Index</strong> using explicit, auditable formula constraints:
        </p>
        <div className="p-3 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-teal-300">
          Loss = (Total Delay Days × ${settings.dailyLatePenalty || 1200}/day) + (Overdue Contract Tasks × $850) + Budget Cost Delta
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1">
          <div>• Contractual Late Penalty: ${settings.dailyLatePenalty}/day</div>
          <div>• Task SLA Breach Impact: $850/task</div>
          <div>• Overtime Rate Multiplier: {settings.overtimeCostMultiplier}x baseline</div>
        </div>
      </div>

      {/* Plan Approval Dialog */}
      {selectedPlanForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-400" />
              <span>Confirm Strategy Approval</span>
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Applying &quot;{selectedPlanForApproval.name}&quot; will commit all revised task start and end dates to active schedules.
            </p>

            <div className="mt-4 p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
              <div>Projected Finish: <strong className="text-teal-400">{selectedPlanForApproval.summaryMetrics.projectedCompletionDate}</strong></div>
              <div>Estimated Total Loss: <strong className="text-rose-400">${selectedPlanForApproval.summaryMetrics.weightedBusinessLoss.toLocaleString()}</strong></div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Decision Log Notes
              </label>
              <textarea
                rows={2}
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPlanForApproval(null)}
                className="px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors"
              >
                Approve & Commit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
