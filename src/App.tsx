import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppState, DecisionLogEntry, Disruption, Project, RecoveryPlan, Resource, Staff, SystemSettings, Task } from './types';
import { StorageService, DEFAULT_SETTINGS } from './services/storage';
import { analyzeDisruptionImpact } from './domain/impactAnalyzer';
import { generateRecoveryPlans } from './domain/recoveryEngine';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './pages/DashboardView';
import { ProjectsView } from './pages/ProjectsView';
import { TasksView } from './pages/TasksView';
import { ResourcesView } from './pages/ResourcesView';
import { DisruptionSimulatorView } from './pages/DisruptionSimulatorView';
import { ImpactAnalysisView } from './pages/ImpactAnalysisView';
import { RecoveryPlannerView } from './pages/RecoveryPlannerView';
import { ScenarioComparisonView } from './pages/ScenarioComparisonView';
import { DecisionHistoryView } from './pages/DecisionHistoryView';
import { SettingsView } from './pages/SettingsView';
import { OnboardingTutorial } from './components/OnboardingTutorial';

function PivotOSApp() {
  const { showToast } = useToast();
  const [state, setState] = useState<AppState>(() => StorageService.loadState());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedProjectIdForTasks, setSelectedProjectIdForTasks] = useState<string | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(() => {
    return !localStorage.getItem('pivot_os_tutorial_completed');
  });

  // Sync state to persistent storage
  useEffect(() => {
    StorageService.saveState(state);
  }, [state]);

  // Compute Active Disruption
  const activeDisruption = useMemo<Disruption | null>(() => {
    if (state.activeDisruptionId) {
      const found = state.disruptions.find((d) => d.id === state.activeDisruptionId);
      if (found) return found;
    }
    // Fallback to first non-resolved disruption
    return state.disruptions.find((d) => d.status === 'simulated' || d.status === 'analyzed') || state.disruptions[0] || null;
  }, [state.disruptions, state.activeDisruptionId]);

  // Compute Impact Analysis dynamically whenever active disruption, tasks, staff, or resources change
  const impactResult = useMemo(() => {
    if (!activeDisruption) return null;
    return analyzeDisruptionImpact(
      activeDisruption,
      state.projects,
      state.tasks,
      state.staff,
      state.resources,
      state.settings
    );
  }, [activeDisruption, state.projects, state.tasks, state.staff, state.resources, state.settings]);

  // Compute Recovery Plans dynamically
  const recoveryPlans = useMemo(() => {
    if (!activeDisruption || !impactResult) return [];
    return generateRecoveryPlans(
      activeDisruption,
      impactResult,
      state.projects,
      state.tasks,
      state.staff,
      state.resources,
      state.settings
    );
  }, [activeDisruption, impactResult, state.projects, state.tasks, state.staff, state.resources, state.settings]);

  // Active disruption count for header badge
  const activeDisruptionCount = useMemo(() => {
    return state.disruptions.filter((d) => d.status === 'simulated' || d.status === 'analyzed').length;
  }, [state.disruptions]);

  // Project handlers
  const handleSaveProject = useCallback((project: Project) => {
    setState((prev) => {
      const exists = prev.projects.some((p) => p.id === project.id);
      const updatedProjects = exists
        ? prev.projects.map((p) => (p.id === project.id ? project : p))
        : [project, ...prev.projects];
      return { ...prev, projects: updatedProjects };
    });
  }, []);

  const handleDeleteProject = useCallback((projectId: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== projectId),
      tasks: prev.tasks.filter((t) => t.projectId !== projectId),
    }));
    showToast('info', 'Project Deleted', 'Associated tasks removed.');
  }, [showToast]);

  const handleDuplicateProject = useCallback((project: Project) => {
    const newId = `proj-${Date.now()}`;
    const duplicated: Project = {
      ...project,
      id: newId,
      code: `${project.code}-CPY`,
      name: `${project.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      projects: [duplicated, ...prev.projects],
    }));
    showToast('success', 'Project Duplicated', duplicated.name);
  }, [showToast]);

  // Task handlers
  const handleSaveTask = useCallback((task: Task) => {
    setState((prev) => {
      const exists = prev.tasks.some((t) => t.id === task.id);
      const updatedTasks = exists
        ? prev.tasks.map((t) => (t.id === task.id ? task : t))
        : [...prev.tasks, task];
      return { ...prev, tasks: updatedTasks };
    });
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
    showToast('info', 'Task Deleted', 'Task removed from schedule.');
  }, [showToast]);

  const handleBulkUpdateTasks = useCallback((updatedList: Task[]) => {
    setState((prev) => ({ ...prev, tasks: updatedList }));
  }, []);

  // Staff handlers
  const handleSaveStaff = useCallback((member: Staff) => {
    setState((prev) => {
      const exists = prev.staff.some((s) => s.id === member.id);
      const updatedStaff = exists
        ? prev.staff.map((s) => (s.id === member.id ? member : s))
        : [...prev.staff, member];
      return { ...prev, staff: updatedStaff };
    });
  }, []);

  const handleDeleteStaff = useCallback((staffId: string) => {
    setState((prev) => ({
      ...prev,
      staff: prev.staff.filter((s) => s.id !== staffId),
    }));
    showToast('info', 'Staff Removed', 'Personnel removed from roster.');
  }, [showToast]);

  // Resource handlers
  const handleSaveResource = useCallback((resource: Resource) => {
    setState((prev) => {
      const exists = prev.resources.some((r) => r.id === resource.id);
      const updated = exists
        ? prev.resources.map((r) => (r.id === resource.id ? resource : r))
        : [...prev.resources, resource];
      return { ...prev, resources: updated };
    });
  }, []);

  const handleDeleteResource = useCallback((resourceId: string) => {
    setState((prev) => ({
      ...prev,
      resources: prev.resources.filter((r) => r.id !== resourceId),
    }));
    showToast('info', 'Resource Removed', 'Item removed from inventory.');
  }, [showToast]);

  // Disruption simulation handler
  const handleSimulateDisruption = useCallback((disruption: Disruption) => {
    setState((prev) => ({
      ...prev,
      disruptions: [disruption, ...prev.disruptions],
      activeDisruptionId: disruption.id,
    }));
  }, []);

  const handleDeleteDisruption = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      disruptions: prev.disruptions.filter((d) => d.id !== id),
      activeDisruptionId: prev.activeDisruptionId === id ? null : prev.activeDisruptionId,
    }));
    showToast('info', 'Disruption Dismissed', 'Simulation record deleted.');
  }, [showToast]);

  // Recovery Plan Approval: Commits schedule and creates reversible audit entry
  const handleApprovePlan = useCallback((plan: RecoveryPlan, reason: string) => {
    setState((prev) => {
      // Snapshot before change
      const snapshotBefore = {
        tasks: JSON.parse(JSON.stringify(prev.tasks)),
        projects: JSON.parse(JSON.stringify(prev.projects)),
      };

      // Apply revised task schedules
      const revisedTaskMap = new Map(plan.revisedTasks.map((rt) => [rt.taskId, rt]));
      const updatedTasks = prev.tasks.map((task) => {
        const rev = revisedTaskMap.get(task.id);
        if (rev) {
          return {
            ...task,
            startDate: rev.proposedStart,
            endDate: rev.proposedEnd,
            durationDays: rev.durationDays,
            assignedStaffIds: rev.assignedStaffIds,
          };
        }
        return task;
      });

      // Update disruption status to resolved
      const updatedDisruptions = prev.disruptions.map((d) =>
        d.id === plan.disruptionId ? { ...d, status: 'resolved' as const } : d
      );

      const disruptionObj = prev.disruptions.find((d) => d.id === plan.disruptionId);

      const logEntry: DecisionLogEntry = {
        id: `decision-${Date.now()}`,
        timestamp: new Date().toISOString(),
        disruptionId: plan.disruptionId,
        disruptionTitle: disruptionObj?.title || 'Operational Disruption',
        disruptionType: disruptionObj?.type || 'staff_absence',
        chosenPlanId: plan.id,
        chosenPlanName: plan.name,
        strategy: plan.strategy,
        action: 'approved',
        reason,
        authorizedBy: 'Operations Commander',
        snapshotBefore,
        snapshotAfter: {
          tasks: updatedTasks,
          projects: prev.projects,
        },
      };

      return {
        ...prev,
        tasks: updatedTasks,
        disruptions: updatedDisruptions,
        decisionLogs: [logEntry, ...prev.decisionLogs],
      };
    });

    showToast('success', 'Recovery Plan Approved', `Applied ${plan.name}.`);
    setCurrentTab('history');
  }, [showToast]);

  // Rollback Action: Reverts schedule from snapshot
  const handleRollback = useCallback((entry: DecisionLogEntry) => {
    setState((prev) => {
      const rollbackLog: DecisionLogEntry = {
        id: `rollback-${Date.now()}`,
        timestamp: new Date().toISOString(),
        disruptionId: entry.disruptionId,
        disruptionTitle: `Rollback: ${entry.disruptionTitle}`,
        disruptionType: entry.disruptionType,
        chosenPlanId: entry.chosenPlanId,
        chosenPlanName: `Reverted to Baseline (${entry.snapshotBefore.tasks.length} tasks)`,
        strategy: entry.strategy,
        action: 'rolled_back',
        reason: 'Authorized schedule restoration to pre-disruption baseline.',
        authorizedBy: 'Operations Commander',
        snapshotBefore: {
          tasks: JSON.parse(JSON.stringify(prev.tasks)),
          projects: JSON.parse(JSON.stringify(prev.projects)),
        },
        snapshotAfter: {
          tasks: entry.snapshotBefore.tasks,
          projects: entry.snapshotBefore.projects,
        },
      };

      return {
        ...prev,
        tasks: entry.snapshotBefore.tasks,
        projects: entry.snapshotBefore.projects,
        decisionLogs: [rollbackLog, ...prev.decisionLogs],
      };
    });
  }, []);

  const handleClearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, decisionLogs: [] }));
    showToast('info', 'Audit Log Cleared', 'Decision history reset.');
  }, [showToast]);

  const handleUpdateSettings = useCallback((newSettings: SystemSettings) => {
    setState((prev) => ({ ...prev, settings: newSettings }));
  }, []);

  const handleResetSampleData = useCallback(() => {
    const sample = StorageService.resetToSampleData();
    setState(sample);
    showToast('success', 'Sample Workspace Loaded', 'Sample data loaded for demonstration.');
    setCurrentTab('dashboard');
  }, [showToast]);

  const handleClearToEmpty = useCallback(() => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      const empty = StorageService.clearToEmptyState();
      setState(empty);
      showToast('success', 'Data Cleared', 'All data has been removed.');
      setCurrentTab('dashboard');
    }
  }, [showToast]);

  const handleImportState = useCallback((newState: AppState) => {
    setState(newState);
  }, []);

  const handleSelectProjectForTasks = useCallback((projId: string) => {
    setSelectedProjectIdForTasks(projId);
    setCurrentTab('tasks');
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeDisruptionCount={activeDisruptionCount}
        onOpenTutorial={() => setIsTutorialOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            state={state}
            onNavigate={setCurrentTab}
            onOpenNewProject={() => setCurrentTab('projects')}
            onOpenNewTask={() => setCurrentTab('tasks')}
          />
        )}

        {currentTab === 'projects' && (
          <ProjectsView
            projects={state.projects}
            tasks={state.tasks}
            onSaveProject={handleSaveProject}
            onDeleteProject={handleDeleteProject}
            onDuplicateProject={handleDuplicateProject}
            onSelectProjectForTasks={handleSelectProjectForTasks}
          />
        )}

        {currentTab === 'tasks' && (
          <TasksView
            tasks={state.tasks}
            projects={state.projects}
            staff={state.staff}
            resources={state.resources}
            affectedTasks={impactResult?.affectedTasks || []}
            initialProjectId={selectedProjectIdForTasks}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            onBulkUpdateTasks={handleBulkUpdateTasks}
          />
        )}

        {currentTab === 'resources' && (
          <ResourcesView
            staff={state.staff}
            resources={state.resources}
            tasks={state.tasks}
            onSaveStaff={handleSaveStaff}
            onDeleteStaff={handleDeleteStaff}
            onSaveResource={handleSaveResource}
            onDeleteResource={handleDeleteResource}
          />
        )}

        {currentTab === 'simulator' && (
          <DisruptionSimulatorView
            projects={state.projects}
            tasks={state.tasks}
            staff={state.staff}
            resources={state.resources}
            disruptions={state.disruptions}
            onSimulateDisruption={handleSimulateDisruption}
            onDeleteDisruption={handleDeleteDisruption}
            onProceedToImpact={(dId) => {
              setState((prev) => ({ ...prev, activeDisruptionId: dId }));
              setCurrentTab('impact');
            }}
          />
        )}

        {currentTab === 'impact' && (
          <ImpactAnalysisView
            activeDisruption={activeDisruption}
            impactResult={impactResult}
            projects={state.projects}
            tasks={state.tasks}
            staff={state.staff}
            onProceedToRecovery={() => setCurrentTab('recovery')}
            onSelectDifferentDisruption={() => setCurrentTab('simulator')}
          />
        )}

        {currentTab === 'recovery' && (
          <RecoveryPlannerView
            disruption={activeDisruption}
            impactResult={impactResult}
            recoveryPlans={recoveryPlans}
            tasks={state.tasks}
            staff={state.staff}
            onApprovePlan={handleApprovePlan}
            onNavigateToComparison={() => setCurrentTab('scenarios')}
            onSelectDifferentDisruption={() => setCurrentTab('simulator')}
          />
        )}

        {currentTab === 'scenarios' && (
          <ScenarioComparisonView
            disruption={activeDisruption}
            recoveryPlans={recoveryPlans}
            settings={state.settings}
            onApprovePlan={handleApprovePlan}
            onNavigateToSimulator={() => setCurrentTab('simulator')}
          />
        )}

        {currentTab === 'history' && (
          <DecisionHistoryView
            logs={state.decisionLogs}
            onRollback={handleRollback}
            onClearHistory={handleClearHistory}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            state={state}
            activeDisruption={activeDisruption}
            impactResult={impactResult}
            activeRecoveryPlan={recoveryPlans[0] || null}
            onUpdateSettings={handleUpdateSettings}
            onResetSampleData={handleResetSampleData}
            onClearToEmpty={handleClearToEmpty}
            onImportState={handleImportState}
            onLaunchTutorial={() => setIsTutorialOpen(true)}
          />
        )}
      </main>

      <OnboardingTutorial
        isOpen={isTutorialOpen}
        onClose={() => {
          setIsTutorialOpen(false);
          try {
            localStorage.setItem('pivot_os_tutorial_completed', 'true');
          } catch {
            // ignore localStorage disabled
          }
        }}
        onNavigateTab={setCurrentTab}
      />

      <footer className="border-t border-slate-800/60 py-4 bg-[#0a0e17] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">PivotOS</span>
            <span>·</span>
            <span>Adaptive Operations Engine</span>
            <span>·</span>
            <span className="font-mono text-[11px] text-teal-400">v1.5</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Saved on this device</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <PivotOSApp />
    </ToastProvider>
  );
}
