import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  Printer,
  ShieldCheck,
  Clock,
  Layers,
  Compass,
  MessageSquare,
} from 'lucide-react';
import { FeedbackForm } from '../components/FeedbackForm';
import { AppState, Disruption, ImpactAnalysisResult, RecoveryPlan, SystemSettings } from '../types';
import { StorageService } from '../services/storage';
import { runDomainTestSuite, TestResult } from '../domain/tests';
import { useToast } from '../context/ToastContext';

interface SettingsViewProps {
  state: AppState;
  activeDisruption: Disruption | null;
  impactResult: ImpactAnalysisResult | null;
  activeRecoveryPlan: RecoveryPlan | null;
  onUpdateSettings: (settings: SystemSettings) => void;
  onResetSampleData: () => void;
  onClearToEmpty: () => void;
  onImportState: (newState: AppState) => void;
  onLaunchTutorial?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  activeDisruption,
  impactResult,
  activeRecoveryPlan,
  onUpdateSettings,
  onResetSampleData,
  onClearToEmpty,
  onImportState,
  onLaunchTutorial,
}) => {
  const { showToast } = useToast();

  const [hoursPerDay, setHoursPerDay] = useState(state.settings.businessHoursPerDay || 8);
  const [workingDays, setWorkingDays] = useState<number[]>(
    state.settings.workingDaysOfWeek || [1, 2, 3, 4, 5]
  );
  const [dailyPenalty, setDailyPenalty] = useState(state.settings.dailyLatePenalty || 1200);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(
    state.settings.overtimeCostMultiplier || 1.5
  );

  // Test suite results
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Feedback form
  const [isFeedbackFormOpen, setIsFeedbackFormOpen] = useState(false);

  // Import file ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDayToggle = (day: number) => {
    if (workingDays.includes(day)) {
      if (workingDays.length <= 1) {
        showToast('error', 'Validation Error', 'Must keep at least 1 working day enabled.');
        return;
      }
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemSettings = {
      businessHoursPerDay: Number(hoursPerDay),
      workingDaysOfWeek: workingDays,
      dailyLatePenalty: Number(dailyPenalty),
      overtimeCostMultiplier: Number(overtimeMultiplier),
      riskWeights: state.settings.riskWeights,
    };
    onUpdateSettings(updated);
    showToast('success', 'Settings Saved', 'Business hours and parameters updated.');
  };

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const results = runDomainTestSuite();
      setTestResults(results);
      setIsRunningTests(false);
      const passedCount = results.filter((r) => r.passed).length;
      showToast(
        'success',
        'Test Suite Executed',
        `${passedCount} of ${results.length} assertions passed with 100% precision.`
      );
    }, 200);
  };

  const handleExportJson = () => {
    const jsonStr = StorageService.exportStateToJson(state);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pivot-os-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'JSON Exported', 'Full operational state exported.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importStateFromJson(content);
      if (res.success && res.state) {
        onImportState(res.state);
        showToast('success', 'Data Restored', 'Operational data imported successfully.');
      } else {
        showToast('error', 'Import Failed', res.error || 'Invalid file format.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportCsv = () => {
    if (!activeDisruption || !impactResult || !activeRecoveryPlan) {
      showToast('error', 'Export Error', 'Please simulate a disruption to generate a recovery report.');
      return;
    }
    const csvContent = StorageService.exportRecoveryReportCsv(
      activeDisruption,
      impactResult,
      activeRecoveryPlan
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pivot-os-recovery-report-${activeDisruption.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'CSV Report Downloaded', 'Audit report saved.');
  };

  const handlePrintHtml = () => {
    if (!activeDisruption || !impactResult || !activeRecoveryPlan) {
      showToast('error', 'Print Error', 'Please simulate a disruption to generate a printable report.');
      return;
    }
    const htmlContent = StorageService.exportRecoveryReportHtml(
      activeDisruption,
      impactResult,
      activeRecoveryPlan
    );
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      showToast('info', 'Popup Blocked', 'Allow popups to view printable HTML report.');
    }
  };

  const daysLabels: { day: number; label: string }[] = [
    { day: 1, label: 'Mon' },
    { day: 2, label: 'Tue' },
    { day: 3, label: 'Wed' },
    { day: 4, label: 'Thu' },
    { day: 5, label: 'Fri' },
    { day: 6, label: 'Sat' },
    { day: 7, label: 'Sun' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-teal-400" />
          <span>Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure work schedule, run tests, and manage your data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Calendar & Financial Configuration */}
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="p-5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Work Schedule
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Enabled Working Days
              </label>
              <div className="flex items-center gap-2">
                {daysLabels.map(({ day, label }) => {
                  const isChecked = workingDays.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => handleDayToggle(day)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        isChecked
                          ? 'bg-teal-500/10 text-teal-300 border border-teal-500/40'
                          : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Standard Work Hours / Day</label>
                <input
                  type="number"
                  min="4"
                  max="16"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Overtime Multiplier</label>
                <input
                  type="number"
                  min="1"
                  max="3"
                  step="0.1"
                  value={overtimeMultiplier}
                  onChange={(e) => setOvertimeMultiplier(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-300 mb-1">Late Penalty Cost ($ / Day)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={dailyPenalty}
                onChange={(e) => setDailyPenalty(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Used to calculate cost impact of delays.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Settings</span>
              </button>
            </div>
          </form>

          {/* Backup & Persistence Management */}
          <div className="p-5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Data & Backups
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              PivotOS saves your data locally on this device. Export backups to keep your work safe.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleExportJson}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>Export State JSON</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-teal-400" />
                <span>Import State JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleExportCsv}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Export CSV Report</span>
              </button>

              <button
                onClick={handlePrintHtml}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Printable HTML</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <button
                onClick={() => setIsFeedbackFormOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Share Feedback</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              {onLaunchTutorial && (
                <button
                  type="button"
                  onClick={onLaunchTutorial}
                  className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Relaunch Onboarding Guide</span>
                </button>
              )}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={onResetSampleData}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Load Sample Workspace</span>
                </button>
                <button
                  type="button"
                  onClick={onClearToEmpty}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: In-App Automated Test Suite Runner */}
        <div className="p-5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>System Tests</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Verify that calculations and scheduling logic work correctly.
              </p>
            </div>

            <button
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunningTests ? 'Running...' : 'Run Tests'}</span>
            </button>
          </div>

          {/* Test results container */}
          {testResults.length === 0 ? (
            <div className="p-8 text-center rounded border border-slate-800 bg-slate-950/40 text-xs text-slate-500 space-y-2">
              <ShieldCheck className="w-6 h-6 text-slate-600 mx-auto" />
              <div>Click &quot;Run Tests&quot; above to verify system calculations.</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {testResults.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded bg-slate-950 border border-slate-800/80 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      {t.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span>{t.name}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {t.durationMs}ms
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal pl-5">
                    {t.description}
                  </p>
                  {t.error && (
                    <div className="text-[11px] font-mono text-rose-400 pl-5 pt-1">
                      Error: {t.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <FeedbackForm isOpen={isFeedbackFormOpen} onClose={() => setIsFeedbackFormOpen(false)} />

    </div>
  );
};
