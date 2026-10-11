import React, { useState, useEffect } from 'react';
import {
  Zap,
  UserX,
  PackageX,
  Wrench,
  DollarSign,
  AlertOctagon,
  CalendarClock,
  ArrowRight,
  Trash2,
  Check,
  RotateCcw,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  RefreshCw,
  Play,
  Flame,
  Shield,
  Activity,
} from 'lucide-react';
import {
  Disruption,
  DisruptionSeverity,
  DisruptionType,
  Project,
  Resource,
  Staff,
  Task,
} from '../types';
import { validateDisruption } from '../domain/validation';
import { useToast } from '../context/ToastContext';

interface DisruptionSimulatorViewProps {
  projects: Project[];
  tasks: Task[];
  staff: Staff[];
  resources: Resource[];
  disruptions: Disruption[];
  onSimulateDisruption: (disruption: Disruption) => void;
  onDeleteDisruption: (id: string) => void;
  onProceedToImpact: (disruptionId: string) => void;
}

export const DisruptionSimulatorView: React.FC<DisruptionSimulatorViewProps> = ({
  projects,
  tasks,
  staff,
  resources,
  disruptions,
  onSimulateDisruption,
  onDeleteDisruption,
  onProceedToImpact,
}) => {
  const { showToast } = useToast();

  const [selectedType, setSelectedType] = useState<DisruptionType>('staff_absence');
  const [simOfflineMode, setSimOfflineMode] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [severity, setSeverity] = useState<DisruptionSeverity>('severe');
  const [title, setTitle] = useState('Staff Emergency Leave (Marcus Vance)');
  const [description, setDescription] = useState(
    'Key engineer undergoes sudden medical absence, halting assigned critical tasks.'
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [offlineQueue, setOfflineQueue] = useState<string[]>([]);
  const [showImpactPreview, setShowImpactPreview] = useState(false);

  // Scenario 1: Staff Absence
  const [absenceStaffId, setAbsenceStaffId] = useState<string>(staff[1]?.id || staff[0]?.id || '');
  const [absenceStart, setAbsenceStart] = useState('2026-10-12');
  const [absenceEnd, setAbsenceEnd] = useState('2026-10-16');
  const [absenceReason, setAbsenceReason] = useState('Acute Medical Leave');

  // Scenario 2: Inventory Shortage
  const [shortageResourceId, setShortageResourceId] = useState<string>(resources[1]?.id || resources[0]?.id || '');
  const [shortageReduction, setShortageReduction] = useState(100);
  const [shortageDelayDays, setShortageDelayDays] = useState(5);

  // Scenario 3: Equipment Failure
  const [failureResourceId, setFailureResourceId] = useState<string>(resources[2]?.id || resources[0]?.id || '');
  const [failureOutageDays, setFailureOutageDays] = useState(4);

  // Scenario 4: Budget Cut
  const [cutPercentage, setCutPercentage] = useState(20);
  const [cutAmount, setCutAmount] = useState(15000);

  // Scenario 5: Scope Surge
  const [surgeTaskTitle, setSurgeTaskTitle] = useState('Emergency Security Vulnerability Patch');
  const [surgeDurationDays, setSurgeDurationDays] = useState(5);
  const [surgeStaffIds, setSurgeStaffIds] = useState<string[]>([staff[0]?.id || '']);

  // Scenario 6: Deadline Compression
  const [compressedDays, setCompressedDays] = useState(7);
  const [newDeadline, setNewDeadline] = useState('2026-11-10');

  // Scenario Presets
  const applyPreset = (type: DisruptionType) => {
    setSelectedType(type);
    switch (type) {
      case 'staff_absence':
        setTitle('Lead Hardware Engineer Sudden Absence');
        setDescription('Marcus Vance unavailable during ASIC Silicon RF testing window.');
        setSeverity('severe');
        setAbsenceStaffId(staff[1]?.id || staff[0]?.id || '');
        setAbsenceStart('2026-10-12');
        setAbsenceEnd('2026-10-16');
        setAbsenceReason('Medical Recovery');
        break;
      case 'inventory_shortage':
        setTitle('Custom ASIC Silicon Wafer Delivery Stalled');
        setDescription('Supplier shipment held at customs; 100 units delayed by 6 business days.');
        setSeverity('moderate');
        setShortageResourceId(resources[1]?.id || resources[0]?.id || '');
        setShortageReduction(100);
        setShortageDelayDays(6);
        break;
      case 'resource_failure':
        setTitle('50GHz RF Analyzer Calibration Laser Fault');
        setDescription('RF test bench offline for emergency technician recalibration.');
        setSeverity('severe');
        setFailureResourceId(resources[2]?.id || resources[0]?.id || '');
        setFailureOutageDays(5);
        break;
      case 'budget_cut':
        setTitle('Executive 20% Discretionary Spend Reduction');
        setDescription('Board slashes Q4 capital allocation across active hardware prototypes.');
        setSeverity('critical');
        setCutPercentage(20);
        setCutAmount(18000);
        break;
      case 'scope_surge':
        setTitle('Urgent FDA Pre-Auditing Documentation Mandate');
        setDescription('Immediate compliance sprint required, pulling senior architects off sprint.');
        setSeverity('severe');
        setSurgeTaskTitle('FDA 21-CFR Part 11 Audit Defense Dossier');
        setSurgeDurationDays(5);
        setSurgeStaffIds([staff[0]?.id || '']);
        break;
      case 'deadline_compression':
        setTitle('Investor Demo Date Pulled In by 10 Days');
        setDescription('Board meeting rescheduled early; release must ship ahead of schedule.');
        setSeverity('critical');
        setCompressedDays(10);
        setNewDeadline('2026-11-10');
        break;
    }
  };

  const handleLaunchSimulation = (e: React.FormEvent) => {
    e.preventDefault();

    setIsSimulating(true);
    setSimulationProgress(0);
    setShowImpactPreview(false);

    // Simulate progressive impact calculation
    const steps = [
      { progress: 20, msg: 'Validating disruption parameters...' },
      { progress: 40, msg: 'Identifying affected tasks...' },
      { progress: 60, msg: 'Tracing dependency chains...' },
      { progress: 80, msg: 'Calculating resource constraints...' },
      { progress: 100, msg: 'Impact analysis complete!' },
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setSimulationProgress(steps[stepIndex].progress);
        stepIndex++;
      } else {
        clearInterval(interval);
        completeSimulation();
      }
    }, 400);
  };

  const completeSimulation = () => {
    const disruptionId = `disrupt-${Date.now()}`;
    const newDisruption: Disruption = {
      id: disruptionId,
      type: selectedType,
      title: title.trim(),
      description: description.trim(),
      severity,
      projectId: selectedProjectId || undefined,
      status: 'simulated',
      createdAt: new Date().toISOString(),
      parameters: {
        staffAbsence:
          selectedType === 'staff_absence'
            ? {
                staffId: absenceStaffId,
                startDate: absenceStart,
                endDate: absenceEnd,
                reason: absenceReason,
              }
            : undefined,
        inventoryShortage:
          selectedType === 'inventory_shortage'
            ? {
                resourceId: shortageResourceId,
                reductionQuantity: Number(shortageReduction),
                delayDays: Number(shortageDelayDays),
              }
            : undefined,
        resourceFailure:
          selectedType === 'resource_failure'
            ? {
                resourceId: failureResourceId,
                outageDays: Number(failureOutageDays),
              }
            : undefined,
        budgetCut:
          selectedType === 'budget_cut'
            ? {
                projectId: selectedProjectId,
                cutAmount: Number(cutAmount),
                cutPercentage: Number(cutPercentage),
              }
            : undefined,
        scopeSurge:
          selectedType === 'scope_surge'
            ? {
                projectId: selectedProjectId,
                urgentTaskTitle: surgeTaskTitle,
                durationDays: Number(surgeDurationDays),
                priority: 'critical',
                assignedStaffIds: surgeStaffIds,
                deadline: '2026-10-25',
              }
            : undefined,
        deadlineCompression:
          selectedType === 'deadline_compression'
            ? {
                projectId: selectedProjectId,
                daysCompressed: Number(compressedDays),
                newDeadline,
              }
            : undefined,
      },
    };

    // Client-side and Simulated Server validation
    const validation = validateDisruption(newDisruption);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      showToast('error', 'Validation Failed', Object.values(validation.errors)[0]);
      setIsSimulating(false);
      return;
    }

    setFormErrors({});
    onSimulateDisruption(newDisruption);
    setIsSimulating(false);
    setShowImpactPreview(true);
    showToast('warning', 'Disruption Simulated', `"${newDisruption.title}" applied to schedule.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span>Operational Disruption Simulator</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Inject real operational anomalies, staff bottlenecks, supply delays, or scope surges to calculate ripple impacts.
        </p>
      </div>

      {/* Offline Recovery Simulator - Challenge Card 1 */}
      <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Challenge Card 01: Offline Recovery Simulator
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {simOfflineMode ? (
              <WifiOff className="w-4 h-4 text-rose-400" />
            ) : (
              <Wifi className="w-4 h-4 text-emerald-400" />
            )}
            <span className="text-xs text-slate-400">
              {simOfflineMode ? 'Simulated Offline' : 'Simulated Online'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => {
              setSimOfflineMode(!simOfflineMode);
              if (!simOfflineMode) {
                showToast('warning', 'Offline Mode Activated', 'All operations will queue locally.');
              } else {
                if (offlineQueue.length > 0) {
                  showToast('success', 'Connectivity Restored', `Processing ${offlineQueue.length} queued operations...`);
                  setOfflineQueue([]);
                } else {
                  showToast('success', 'Online Mode Active', 'All operations real-time.');
                }
              }
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded transition-colors ${
              simOfflineMode
                ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
                : 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
            }`}
          >
            {simOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{simOfflineMode ? 'Restore Connectivity' : 'Simulate Offline'}</span>
          </button>

          <button
            onClick={() => {
              const taskId = `TSK-${Math.floor(Math.random() * 900) + 100}`;
              setOfflineQueue(prev => [...prev, taskId]);
              showToast('warning', 'Simulated AI Timeout', `Task ${taskId} saved locally. AI request timed out after 30s.`);
            }}
            disabled={simOfflineMode}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Simulate Timeout</span>
          </button>

          <button
            onClick={() => {
              const taskId = `TSK-${Math.floor(Math.random() * 900) + 100}`;
              setOfflineQueue(prev => [...prev, taskId]);
              showToast('error', 'Simulated Rate Limit', `Task ${taskId} queued. HTTP 429: Too many requests.`);
            }}
            disabled={simOfflineMode}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate 429</span>
          </button>

          <button
            onClick={() => {
              if (offlineQueue.length > 0) {
                showToast('success', 'Queue Processed', `${offlineQueue.length} tasks recovered successfully.`);
                setOfflineQueue([]);
              } else {
                showToast('info', 'No Queued Tasks', 'Queue is empty.');
              }
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Process Queue</span>
          </button>
        </div>

        {offlineQueue.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-rose-950/30 border border-rose-500/30 rounded">
            <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="text-xs text-rose-300">{offlineQueue.length} operations queued for retry</span>
          </div>
        )}

        <p className="text-[10px] text-slate-500">
          Test offline-first behavior: Tasks are saved to IndexedDB before AI processing. Failed extractions queue for retry when connectivity returns.
        </p>
      </div>

      {/* Scenario Type Selection Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { type: 'staff_absence' as DisruptionType, label: 'Staff Absence', icon: UserX },
          { type: 'inventory_shortage' as DisruptionType, label: 'Supply Shortage', icon: PackageX },
          { type: 'resource_failure' as DisruptionType, label: 'Equipment Outage', icon: Wrench },
          { type: 'budget_cut' as DisruptionType, label: 'Budget Cut', icon: DollarSign },
          { type: 'scope_surge' as DisruptionType, label: 'Urgent Scope Surge', icon: AlertOctagon },
          { type: 'deadline_compression' as DisruptionType, label: 'Deadline Compression', icon: CalendarClock },
        ].map((item) => {
          const isSelected = selectedType === item.type;
          const Icon = item.icon;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => applyPreset(item.type)}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="text-xs font-semibold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Parameter Configurator */}
        <form onSubmit={handleLaunchSimulation} className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Disruption Scenario Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as DisruptionSeverity)}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Project Scope
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contextual Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* DYNAMIC SCENARIO PARAMETERS SECTION */}
            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3">
                Scenario-Specific Operational Parameters
              </h3>

              {/* Staff Absence */}
              {selectedType === 'staff_absence' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">Affected Staff Member</label>
                    <select
                      value={absenceStaffId}
                      onChange={(e) => setAbsenceStaffId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100"
                    >
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Absence Window Start</label>
                    <input
                      type="date"
                      value={absenceStart}
                      onChange={(e) => setAbsenceStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Absence Window End</label>
                    <input
                      type="date"
                      value={absenceEnd}
                      onChange={(e) => setAbsenceEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Inventory Shortage */}
              {selectedType === 'inventory_shortage' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">Deficient Resource</label>
                    <select
                      value={shortageResourceId}
                      onChange={(e) => setShortageResourceId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100"
                    >
                      {resources.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Stock Deficit (Units)</label>
                    <input
                      type="number"
                      min="1"
                      value={shortageReduction}
                      onChange={(e) => setShortageReduction(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Delivery Delay (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={shortageDelayDays}
                      onChange={(e) => setShortageDelayDays(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Resource Failure */}
              {selectedType === 'resource_failure' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">Offline Equipment / Bench</label>
                    <select
                      value={failureResourceId}
                      onChange={(e) => setFailureResourceId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100"
                    >
                      {resources.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Unplanned Outage (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={failureOutageDays}
                      onChange={(e) => setFailureOutageDays(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Budget Cut */}
              {selectedType === 'budget_cut' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">Budget Reduction (%)</label>
                    <input
                      type="number"
                      min="5"
                      max="80"
                      value={cutPercentage}
                      onChange={(e) => setCutPercentage(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Monetary Deficit ($)</label>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      value={cutAmount}
                      onChange={(e) => setCutAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Scope Surge */}
              {selectedType === 'scope_surge' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">Emergency Blocker Task Title</label>
                    <input
                      type="text"
                      value={surgeTaskTitle}
                      onChange={(e) => setSurgeTaskTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Required Effort (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={surgeDurationDays}
                      onChange={(e) => setSurgeDurationDays(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Deadline Compression */}
              {selectedType === 'deadline_compression' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">Days Pulled Forward</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={compressedDays}
                      onChange={(e) => setCompressedDays(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Compressed Hard Deadline</label>
                    <input
                      type="date"
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4 space-y-3">
              {isSimulating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-medium flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 animate-spin" />
                      Calculating Impact...
                    </span>
                    <span className="text-slate-400 font-mono">{simulationProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                      style={{ width: `${simulationProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                {showImpactPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      const latestDisruption = disruptions[0];
                      if (latestDisruption) {
                        onProceedToImpact(latestDisruption.id);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/10"
                  >
                    <Activity className="w-4 h-4" />
                    <span>View Impact Analysis</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSimulating}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSimulating ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Simulate & Calculate Impact</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </form>

        {/* Right 1 Col: Previous Disruptions History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Active & Simulated Scenarios
            </h2>
            <span className="text-xs text-slate-500 font-mono">{disruptions.length} total</span>
          </div>

          {disruptions.length === 0 ? (
            <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500">
              No simulations run yet. Select a scenario and launch above.
            </div>
          ) : (
            <div className="space-y-2.5">
              {disruptions.map((d) => {
                const severityColors = {
                  minor: 'bg-slate-500/20 border-slate-500/40 text-slate-300',
                  moderate: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
                  severe: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
                  critical: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
                };
                const typeIcons = {
                  staff_absence: UserX,
                  inventory_shortage: PackageX,
                  resource_failure: Wrench,
                  budget_cut: DollarSign,
                  scope_surge: AlertOctagon,
                  deadline_compression: CalendarClock,
                };
                const TypeIcon = typeIcons[d.type] || AlertTriangle;

                return (
                  <div
                    key={d.id}
                    className={`p-3.5 rounded-lg bg-slate-900/60 border ${severityColors[d.severity].split(' ')[1]} hover:border-slate-600 transition-all space-y-2 group`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded ${severityColors[d.severity].split(' ')[0]}`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-wider opacity-80">
                            {d.type.replace('_', ' ')}
                          </div>
                          <h4 className="text-xs font-semibold text-slate-100 mt-0.5">{d.title}</h4>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteDisruption(d.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Disruption"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 pl-7">{d.description}</p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between pl-7">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${severityColors[d.severity]}`}>
                          {d.severity}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(d.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={() => onProceedToImpact(d.id)}
                        className="text-xs font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
                      >
                        <span>Analyze Impact</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
