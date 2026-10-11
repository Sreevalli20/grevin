import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Link,
  Users,
  Box,
  Layers,
  Table,
  BarChart3,
  Network,
  X,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import {
  AffectedTask,
  Priority,
  Project,
  Resource,
  Staff,
  Task,
  TaskResourceRequirement,
  TaskStatus,
} from '../types';
import {
  addBusinessDays,
  calculateCriticalPath,
  detectCycles,
  formatDate,
  wouldCauseCycle,
} from '../domain/graph';
import { validateTask } from '../domain/validation';
import { TaskDependencyGraph } from '../components/TaskDependencyGraph';
import { useToast } from '../context/ToastContext';
import { indexedDB, ExtractionJobState } from '../services/indexedDB';
import { extractionQueue } from '../services/extractionQueue';
import { aiExtraction } from '../services/aiExtraction';

interface TasksViewProps {
  tasks: Task[];
  projects: Project[];
  staff: Staff[];
  resources: Resource[];
  affectedTasks?: AffectedTask[];
  initialProjectId?: string | null;
  onSaveTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onBulkUpdateTasks: (tasks: Task[]) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  projects,
  staff,
  resources,
  affectedTasks = [],
  initialProjectId,
  onSaveTask,
  onDeleteTask,
}) => {
  const { showToast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || (projects[0]?.id || 'all')
  );
  const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'graph'>('table');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Offline-first extraction state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSaving, setIsSaving] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<Record<string, ExtractionJobState>>({});
  const [useNaturalLanguageInput, setUseNaturalLanguageInput] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');

  // Initialize IndexedDB and load extraction status
  useEffect(() => {
    indexedDB.init().catch((err) => {
      console.error('Failed to initialize IndexedDB:', err);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load extraction jobs on mount
  useEffect(() => {
    const loadExtractionJobs = async () => {
      try {
        const jobs = await indexedDB.getAllExtractionJobs();
        const statusMap: Record<string, ExtractionJobState> = {};
        jobs.forEach((job) => {
          statusMap[job.taskId] = job.state;
        });
        setExtractionStatus(statusMap);
      } catch (err) {
        console.error('Failed to load extraction jobs:', err);
      }
    };
    loadExtractionJobs();
  }, [tasks]);

  // Form states
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || '');
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('medium');
  const [formDuration, setFormDuration] = useState(4);
  const [formStartDate, setFormStartDate] = useState('2026-10-12');
  const [formDependencies, setFormDependencies] = useState<string[]>([]);
  const [formStaffIds, setFormStaffIds] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<TaskStatus>('not_started');
  const [formCost, setFormCost] = useState(3000);
  const [formRequiredResources, setFormRequiredResources] = useState<TaskResourceRequirement[]>([]);

  // Calculate critical path for currently filtered project
  const currentProjectTasks = selectedProjectId === 'all'
    ? tasks
    : tasks.filter((t) => t.projectId === selectedProjectId);

  const cpm = calculateCriticalPath(currentProjectTasks);

  // Open create modal
  const openCreateModal = () => {
    setEditingTask(null);
    setFormErrors({});
    setFormProjectId(selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id || '');
    setFormCode(`TSK-${Math.floor(100 + Math.random() * 900)}`);
    setFormTitle('');
    setFormDesc('');
    setFormPriority('medium');
    setFormDuration(3);
    setFormStartDate('2026-10-12');
    setFormDependencies([]);
    setFormStaffIds([]);
    setFormStatus('not_started');
    setFormCost(2500);
    setFormRequiredResources([]);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormErrors({});
    setFormProjectId(task.projectId);
    setFormCode(task.code);
    setFormTitle(task.title);
    setFormDesc(task.description);
    setFormPriority(task.priority);
    setFormDuration(task.durationDays);
    setFormStartDate(task.startDate);
    setFormDependencies(task.dependencies || []);
    setFormStaffIds(task.assignedStaffIds || []);
    setFormStatus(task.status);
    setFormCost(task.costEstimate);
    setFormRequiredResources(task.requiredResources || []);
    setIsModalOpen(true);
  };

  const handleDependencyToggle = (depTaskId: string) => {
    const isAdding = !formDependencies.includes(depTaskId);
    if (isAdding) {
      // Validate cycle prevention
      const candidateTaskId = editingTask ? editingTask.id : 'temp-new-task';
      const simulatedTasks: Task[] = editingTask
        ? tasks.map((t) =>
            t.id === candidateTaskId ? { ...t, dependencies: [...formDependencies, depTaskId] } : t
          )
        : [
            ...tasks,
            {
              id: candidateTaskId,
              projectId: formProjectId,
              code: formCode,
              title: formTitle,
              description: formDesc,
              priority: formPriority,
              durationDays: formDuration,
              startDate: formStartDate,
              endDate: addBusinessDays(formStartDate, formDuration),
              dependencies: [...formDependencies, depTaskId],
              assignedStaffIds: formStaffIds,
              requiredResources: formRequiredResources,
              status: formStatus,
              costEstimate: formCost,
              extractionSource: 'manual',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              revision: 1,
            },
          ];

      const { hasCycle, cyclePath } = detectCycles(simulatedTasks);
      if (hasCycle) {
        showToast(
          'error',
          'Cycle Detected',
          `Cannot link dependency: creates a closed loop (${cyclePath?.join(' → ') || 'cycle'}).`
        );
        return;
      }
      setFormDependencies([...formDependencies, depTaskId]);
    } else {
      setFormDependencies(formDependencies.filter((id) => id !== depTaskId));
    }
  };

  const handleStaffToggle = (staffId: string) => {
    if (formStaffIds.includes(staffId)) {
      setFormStaffIds(formStaffIds.filter((id) => id !== staffId));
    } else {
      setFormStaffIds([...formStaffIds, staffId]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // If using natural language input, extract fields first
      if (useNaturalLanguageInput && naturalLanguageInput.trim()) {
        const originalInput = naturalLanguageInput.trim();
        const extractionResult = await aiExtraction.extractTask(originalInput);

        // Update form with extracted fields
        if (extractionResult.data) {
          if (extractionResult.data.title) setFormTitle(extractionResult.data.title);
          if (extractionResult.data.description) setFormDesc(extractionResult.data.description);
          if (extractionResult.data.priority) setFormPriority(extractionResult.data.priority);
          if (extractionResult.data.estimatedEffort) setFormDuration(extractionResult.data.estimatedEffort);
          if (extractionResult.data.deadline) setFormStartDate(extractionResult.data.deadline);
          if (extractionResult.data.dependencies) {
            // Convert task codes to IDs
            const depIds = extractionResult.data.dependencies
              .map((code) => tasks.find((t) => t.code === code)?.id)
              .filter(Boolean) as string[];
            setFormDependencies(depIds);
          }
        }

        // Save original input for tracking
        // Continue with form submission below
      }

      const calculatedEndDate = addBusinessDays(formStartDate, Math.max(1, formDuration));
      const now = new Date().toISOString();
      const taskId = editingTask ? editingTask.id : `task-${Date.now()}`;

      const taskToSave: Task = {
        id: taskId,
        projectId: formProjectId,
        code: formCode.trim().toUpperCase(),
        title: formTitle.trim(),
        description: formDesc.trim(),
        priority: formPriority,
        durationDays: Math.max(1, Number(formDuration)),
        startDate: formStartDate,
        endDate: calculatedEndDate,
        dependencies: formDependencies,
        assignedStaffIds: formStaffIds,
        requiredResources: formRequiredResources,
        status: formStatus,
        costEstimate: Math.max(0, Number(formCost)),
        extractionSource: useNaturalLanguageInput ? 'local_fallback' : 'manual',
        originalInput: useNaturalLanguageInput ? naturalLanguageInput.trim() : undefined,
        createdAt: editingTask?.createdAt || now,
        updatedAt: now,
        revision: editingTask?.revision ? editingTask.revision + 1 : 1,
      };

      // Client-side and Simulated Server-side validation
      const validation = validateTask(taskToSave, tasks);
      if (!validation.isValid) {
        setFormErrors(validation.errors);
        showToast('error', 'Validation Failed', Object.values(validation.errors)[0]);
        setIsSaving(false);
        return;
      }

      setFormErrors({});

      // Save to IndexedDB first (durable storage)
      await indexedDB.saveTask({
        ...taskToSave,
        requiredResources: taskToSave.requiredResources || [],
      });

      // If natural language input was used, queue for AI extraction
      if (useNaturalLanguageInput && naturalLanguageInput.trim()) {
        const job = await extractionQueue.addJob(taskId, naturalLanguageInput.trim(), formProjectId);
        taskToSave.extractionJobId = job.id;
        setExtractionStatus((prev) => ({ ...prev, [taskId]: job.state }));

        // Process queue if online
        if (isOnline) {
          extractionQueue.processQueue().catch((err) => {
            console.error('Queue processing error:', err);
          });
        }
      }

      // Save to main application state
      onSaveTask(taskToSave);
      setIsModalOpen(false);

      const message = useNaturalLanguageInput
        ? `"${taskToSave.title}" saved locally. ${isOnline ? 'AI extraction queued.' : 'Will process when online.'}`
        : `"${taskToSave.title}" scheduled from ${taskToSave.startDate} to ${taskToSave.endDate}.`;

      showToast(
        'success',
        editingTask ? 'Task Updated' : 'Task Created',
        message
      );

      // Reset natural language input
      setNaturalLanguageInput('');
      setUseNaturalLanguageInput(false);
    } catch (error) {
      console.error('Task save error:', error);
      showToast('error', 'Save Failed', 'Failed to save task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-400" />
            <span>Task Planner & Dependency Graph</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Topological scheduling, cycle-proof dependency links, and critical path analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table' ? 'bg-slate-800 text-teal-300' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table Grid"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'timeline' ? 'bg-slate-800 text-teal-300' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Timeline / Gantt"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'graph' ? 'bg-slate-800 text-teal-300' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visual Dependency Graph"
            >
              <Network className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Project selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Projects ({tasks.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
            >
              <option value="all">All</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-8 pr-2.5 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main View: Table or Timeline */}
      {viewMode === 'table' ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Code / Task</th>
                  <th className="py-2.5 px-3">Extraction</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Schedule Window</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Predecessors</th>
                  <th className="py-2.5 px-3">Staff</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No tasks found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const isCritical = cpm.criticalTaskIds.has(task.id);
                    const assignedNames = task.assignedStaffIds
                      .map((id) => staff.find((s) => s.id === id)?.name)
                      .filter(Boolean);

                    const predCodes = task.dependencies
                      .map((depId) => tasks.find((t) => t.id === depId)?.code || depId)
                      .join(', ');

                    return (
                      <tr key={task.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-teal-400 font-medium">{task.code}</span>
                            {isCritical && (
                              <span className="text-[10px] font-mono px-1 py-0.2 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded" title="On Critical Path (0 float)">
                                CPM
                              </span>
                            )}
                          </div>
                          <div className="font-medium text-slate-200 mt-0.5">{task.title}</div>
                        </td>

                        <td className="py-2.5 px-3">
                          {task.extractionSource === 'ai_extracted' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded flex items-center gap-1">
                              AI
                            </span>
                          )}
                          {task.extractionSource === 'local_fallback' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded flex items-center gap-1">
                              Local
                            </span>
                          )}
                          {extractionStatus[task.id] && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 rounded ml-1">
                              {extractionStatus[task.id]}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={`capitalize font-medium ${
                              task.priority === 'critical'
                                ? 'text-rose-400'
                                : task.priority === 'high'
                                ? 'text-amber-400'
                                : task.priority === 'medium'
                                ? 'text-teal-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300 text-[11px]">
                          {task.startDate} → {task.endDate}
                        </td>

                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                          {task.durationDays}d
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                          {predCodes || <span className="text-slate-600">—</span>}
                        </td>

                        <td className="py-2.5 px-3 text-slate-300">
                          {assignedNames.length > 0 ? (
                            assignedNames.join(', ')
                          ) : (
                            <span className="text-slate-600">Unassigned</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[11px] font-medium capitalize ${
                              task.status === 'completed'
                                ? 'text-emerald-400'
                                : task.status === 'in_progress'
                                ? 'text-teal-400'
                                : task.status === 'blocked'
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(task)}
                              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                              title="Edit Task"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTask(task.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'timeline' ? (
        /* Interactive Timeline / Gantt View */
        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Operational Timeline (Oct 10 – Dec 15, 2026)</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                <span>Critical Path</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-teal-500" />
                <span>Standard Task</span>
              </span>
            </div>
          </div>

          {/* Timeline chart canvas */}
          <div className="space-y-3 pt-2">
            {filteredTasks.map((task) => {
              const isCritical = cpm.criticalTaskIds.has(task.id);
              // Normalize start and duration onto a 60-day window (Oct 10 to Dec 10)
              const baseDate = new Date('2026-10-10T00:00:00');
              const taskStart = new Date(task.startDate + 'T00:00:00');
              const daysFromBase = Math.max(0, (taskStart.getTime() - baseDate.getTime()) / (1000 * 3600 * 24));
              const leftPercent = Math.min(90, Math.max(2, (daysFromBase / 50) * 100));
              const widthPercent = Math.max(4, (task.durationDays / 50) * 100);

              return (
                <div key={task.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300 truncate max-w-sm">
                      <strong className="text-teal-400 font-normal">{task.code}</strong> · {task.title}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px] tabular-nums">
                      {task.startDate} ({task.durationDays}d)
                    </span>
                  </div>

                  <div className="w-full h-6 bg-slate-900 rounded border border-slate-800 relative overflow-hidden">
                    <div
                      className={`h-full rounded flex items-center px-2 text-[10px] font-mono text-white truncate transition-all duration-300 ${
                        isCritical ? 'bg-rose-500/80 border-r-2 border-rose-400' : 'bg-teal-600/80 border-r-2 border-teal-400'
                      }`}
                      style={{
                        marginLeft: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                      title={`${task.title} (${task.startDate} to ${task.endDate})`}
                    >
                      {task.durationDays}d
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Visual Directed Dependency Graph View */
        <TaskDependencyGraph
          tasks={filteredTasks}
          cpm={cpm}
          affectedTasks={affectedTasks}
          onSelectTask={openEditModal}
        />
      )}

      {/* Task Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span>{editingTask ? 'Edit Task Schedule' : 'Create Task'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              {/* Natural Language Input Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-xs text-slate-300">
                    {isOnline ? 'Online - AI extraction available' : 'Offline - Local fallback only'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUseNaturalLanguageInput(!useNaturalLanguageInput)}
                  className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${
                    useNaturalLanguageInput
                      ? 'bg-teal-500/20 border border-teal-500/50 text-teal-300'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {useNaturalLanguageInput ? 'Switch to Manual' : 'Use Natural Language'}
                </button>
              </div>

              {/* Natural Language Input */}
              {useNaturalLanguageInput && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Describe your task in plain English
                  </label>
                  <textarea
                    value={naturalLanguageInput}
                    onChange={(e) => setNaturalLanguageInput(e.target.value)}
                    placeholder="e.g. Create a critical task for ASIC silicon testing, 5 days, depends on TSK-101, due by Oct 20"
                    rows={3}
                    className="w-full px-3 py-2 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    AI will extract title, deadline, priority, dependencies, and effort automatically.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Project</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Task Code</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => {
                      setFormCode(e.target.value);
                      if (formErrors.code) setFormErrors((prev) => ({ ...prev, code: '' }));
                    }}
                    placeholder="TSK-101"
                    className={`w-full px-2.5 py-1.5 text-xs rounded bg-slate-900 border font-mono focus:outline-none ${
                      formErrors.code ? 'border-rose-500 text-rose-200' : 'border-slate-700 text-slate-100 focus:border-teal-500'
                    }`}
                  />
                  {formErrors.code && (
                    <div className="text-[10px] text-rose-400 mt-0.5">{formErrors.code}</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as Priority)}
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  placeholder="e.g. ASIC Silicon Characterization"
                  className={`w-full px-3 py-1.5 text-xs rounded bg-slate-900 border focus:outline-none ${
                    formErrors.title ? 'border-rose-500 text-rose-200' : 'border-slate-700 text-slate-100 focus:border-teal-500'
                  }`}
                />
                {formErrors.title && (
                  <div className="text-[10px] text-rose-400 mt-0.5">{formErrors.title}</div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (formErrors.startDate) setFormErrors((prev) => ({ ...prev, startDate: '' }));
                    }}
                    className={`w-full px-2.5 py-1.5 text-xs rounded bg-slate-900 border font-mono focus:outline-none ${
                      formErrors.startDate ? 'border-rose-500 text-rose-200' : 'border-slate-700 text-slate-100 focus:border-teal-500'
                    }`}
                  />
                  {formErrors.startDate && (
                    <div className="text-[10px] text-rose-400 mt-0.5">{formErrors.startDate}</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={formDuration}
                    onChange={(e) => {
                      setFormDuration(Number(e.target.value));
                      if (formErrors.durationDays) setFormErrors((prev) => ({ ...prev, durationDays: '' }));
                    }}
                    className={`w-full px-2.5 py-1.5 text-xs rounded bg-slate-900 border font-mono focus:outline-none ${
                      formErrors.durationDays ? 'border-rose-500 text-rose-200' : 'border-slate-700 text-slate-100 focus:border-teal-500'
                    }`}
                  />
                  {formErrors.durationDays && (
                    <div className="text-[10px] text-rose-400 mt-0.5">{formErrors.durationDays}</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TaskStatus)}
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              {/* Dependencies selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Predecessor Dependencies (Cycle-Protected)
                </label>
                {formErrors.dependencies && (
                  <div className="text-[10px] text-rose-400 mb-1">{formErrors.dependencies}</div>
                )}
                <div className="p-2.5 rounded bg-slate-900 border border-slate-700 max-h-32 overflow-y-auto space-y-1.5 text-xs">
                  {tasks
                    .filter((t) => !editingTask || t.id !== editingTask.id)
                    .map((t) => {
                      const isChecked = formDependencies.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleDependencyToggle(t.id)}
                            className="rounded bg-slate-800 border-slate-600 text-teal-500 focus:ring-0"
                          />
                          <span className="font-mono text-teal-400 font-medium">{t.code}</span>
                          <span className="truncate">{t.title}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Staff Assignment */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assigned Personnel
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {staff.map((s) => {
                    const isAssigned = formStaffIds.includes(s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => handleStaffToggle(s.id)}
                        className={`p-2 rounded border text-left transition-colors flex items-center justify-between ${
                          isAssigned
                            ? 'bg-teal-500/10 border-teal-500/40 text-teal-300'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-medium text-slate-200">{s.name}</div>
                          <div className="text-[11px] text-slate-500">{s.role}</div>
                        </div>
                        {isAssigned && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors"
                >
                  {editingTask ? 'Save Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
