import React, { useState } from 'react';
import {
  History,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { DecisionLogEntry } from '../types';
import { useToast } from '../context/ToastContext';

interface DecisionHistoryViewProps {
  logs: DecisionLogEntry[];
  onRollback: (logEntry: DecisionLogEntry) => void;
  onClearHistory: () => void;
}

export const DecisionHistoryView: React.FC<DecisionHistoryViewProps> = ({
  logs,
  onRollback,
  onClearHistory,
}) => {
  const { showToast } = useToast();
  const [selectedLogForRollback, setSelectedLogForRollback] = useState<DecisionLogEntry | null>(null);

  const handleConfirmRollback = () => {
    if (selectedLogForRollback) {
      onRollback(selectedLogForRollback);
      setSelectedLogForRollback(null);
      showToast(
        'info',
        'Schedule Restored',
        `Previous schedule snapshot before "${selectedLogForRollback.disruptionTitle}" has been re-applied.`
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-teal-400" />
            <span>Decision Audit Log & Rollback Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of recovery plan approvals, parameter overrides, and reversible schedule rollbacks.
          </p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors self-start sm:self-auto"
          >
            Clear Audit History
          </button>
        )}
      </div>

      {/* Log Entries */}
      {logs.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-slate-800 bg-slate-900/30 space-y-3">
          <History className="w-8 h-8 text-slate-600 mx-auto" />
          <h2 className="text-sm font-semibold text-slate-300">No Decision Logs Recorded</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When you approve or resolve recovery plans, your actions and snapshot baselines will be preserved here for compliance auditing and instant rollback.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((entry) => {
            const isApproved = entry.action === 'approved';
            const isRolledBack = entry.action === 'rolled_back';

            return (
              <div
                key={entry.id}
                className="p-5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : isRolledBack
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {entry.action.replace('_', ' ')}
                    </span>
                    <span className="text-slate-600">·</span>
                    <h3 className="text-sm font-semibold text-slate-100">
                      {entry.disruptionTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{entry.authorizedBy}</span>
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded border border-slate-800/80 leading-relaxed">
                  <strong className="text-teal-400 font-medium">Selected Strategy:</strong>{' '}
                  {entry.chosenPlanName}
                  <div className="mt-1 text-slate-400">
                    <strong className="text-slate-300 font-medium">Justification / Reason:</strong>{' '}
                    {entry.reason || 'Standard operational alignment.'}
                  </div>
                </div>

                {/* Snapshot state & rollback trigger */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-slate-500 font-mono text-[11px]">
                    Preserved Baseline: {entry.snapshotBefore.tasks.length} tasks ·{' '}
                    {entry.snapshotBefore.projects.length} projects
                  </div>

                  {isApproved && (
                    <button
                      onClick={() => setSelectedLogForRollback(entry)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors self-start sm:self-auto font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
                      <span>Rollback to Pre-Disruption Schedule</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rollback Confirmation Modal */}
      {selectedLogForRollback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Confirm Schedule Rollback</span>
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              This will restore all task start and end dates back to the exact snapshot recorded prior to the approval of &quot;{selectedLogForRollback.disruptionTitle}&quot;.
            </p>

            <div className="mt-4 p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              Restoring {selectedLogForRollback.snapshotBefore.tasks.length} tasks to their pre-disruption timeline.
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLogForRollback(null)}
                className="px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRollback}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
              >
                Execute Rollback
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
