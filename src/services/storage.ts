import {
  AppState,
  Disruption,
  DisruptionParams,
  ImpactAnalysisResult,
  Project,
  ProjectStatus,
  RecoveryPlan,
  Resource,
  ResourceType,
  Staff,
  SystemSettings,
  Task,
  TaskStatus,
  Priority,
} from '../types';
import {
  validateProject,
  validateTask,
  validateStaff,
  validateResource,
  validateDisruption,
} from '../domain/validation';
import { detectCycles } from '../domain/graph';

const STORAGE_KEY = 'pivot_os_state_v1';

export const DEFAULT_SETTINGS: SystemSettings = {
  businessHoursPerDay: 8,
  workingDaysOfWeek: [1, 2, 3, 4, 5],
  overtimeCostMultiplier: 1.5,
  dailyLatePenalty: 1200,
  riskWeights: {
    deadlineSlip: 0.45,
    budgetDeviation: 0.35,
    resourceStrain: 0.2,
  },
};

// Empty initial state - users create their own data
export const INITIAL_STAFF: Staff[] = [];
export const INITIAL_RESOURCES: Resource[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_DISRUPTIONS: Disruption[] = [];

// Sample workspace data for demonstration (loaded on demand only)
export const SAMPLE_WORKSPACE = {
  staff: [
    {
      id: 'staff-1',
      name: 'Alex Johnson',
      role: 'Project Manager',
      email: 'alex@example.com',
      hourlyRate: 75,
      maxHoursPerWeek: 40,
      dailyCapacityHours: 8,
      skills: ['Planning', 'Coordination', 'Risk Management'],
      unavailablePeriods: [],
    } as Staff,
    {
      id: 'staff-2',
      name: 'Sam Rivera',
      role: 'Developer',
      email: 'sam@example.com',
      hourlyRate: 65,
      maxHoursPerWeek: 40,
      dailyCapacityHours: 8,
      skills: ['Development', 'Testing', 'Documentation'],
      unavailablePeriods: [],
    } as Staff,
  ],
  resources: [
    {
      id: 'res-1',
      name: 'Meeting Room A',
      code: 'ROOM-A',
      type: 'facility' as const,
      totalQuantity: 1,
      availableQuantity: 1,
      unit: 'Rooms',
      unitCost: 100,
      reorderPoint: 0,
      status: 'operational' as const,
      location: 'Main Office',
    } as Resource,
  ],
  projects: [
    {
      id: 'proj-1',
      code: 'DEMO-01',
      name: 'Sample Project: Website Launch',
      description: 'A sample project to demonstrate PivotOS features.',
      owner: 'Alex Johnson',
      deadline: '2026-11-30',
      budget: 15000,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Project,
  ],
  tasks: [
    {
      id: 'task-101',
      projectId: 'proj-1',
      code: 'TSK-101',
      title: 'Design Homepage',
      description: 'Create mockups for the website homepage.',
      priority: 'high' as const,
      durationDays: 3,
      startDate: '2026-10-15',
      endDate: '2026-10-18',
      dependencies: [],
      assignedStaffIds: ['staff-2'],
      requiredResources: [],
      status: 'not_started' as const,
      costEstimate: 1500,
      extractionSource: 'manual' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: 1,
    } as Task,
    {
      id: 'task-102',
      projectId: 'proj-1',
      code: 'TSK-102',
      title: 'Develop Homepage',
      description: 'Implement the homepage design in code.',
      priority: 'high' as const,
      durationDays: 5,
      startDate: '2026-10-19',
      endDate: '2026-10-24',
      dependencies: ['task-101'],
      assignedStaffIds: ['staff-2'],
      requiredResources: [],
      status: 'not_started' as const,
      costEstimate: 2500,
      extractionSource: 'manual' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: 1,
    } as Task,
  ],
  disruptions: [] as Disruption[],
};

export class StorageService {
  static getInitialState(): AppState {
    return {
      projects: INITIAL_PROJECTS,
      tasks: INITIAL_TASKS,
      staff: INITIAL_STAFF,
      resources: INITIAL_RESOURCES,
      disruptions: INITIAL_DISRUPTIONS,
      decisionLogs: [],
      settings: DEFAULT_SETTINGS,
      activeDisruptionId: null,
    };
  }

  static loadSampleWorkspace(): AppState {
    return {
      projects: SAMPLE_WORKSPACE.projects,
      tasks: SAMPLE_WORKSPACE.tasks,
      staff: SAMPLE_WORKSPACE.staff,
      resources: SAMPLE_WORKSPACE.resources,
      disruptions: SAMPLE_WORKSPACE.disruptions,
      decisionLogs: [],
      settings: DEFAULT_SETTINGS,
      activeDisruptionId: null,
    };
  }

  static loadState(): AppState {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        const initial = this.getInitialState();
        this.saveState(initial);
        return initial;
      }
      const parsed = JSON.parse(data) as AppState;
      // Merge with defaults to guarantee schema integrity
      return {
        projects: parsed.projects || INITIAL_PROJECTS,
        tasks: parsed.tasks || INITIAL_TASKS,
        staff: parsed.staff || INITIAL_STAFF,
        resources: parsed.resources || INITIAL_RESOURCES,
        disruptions: parsed.disruptions || [],
        decisionLogs: parsed.decisionLogs || [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        activeDisruptionId: parsed.activeDisruptionId || null,
      };
    } catch (e) {
      console.error('Failed to parse local state from storage, resetting to defaults', e);
      return this.getInitialState();
    }
  }

  static saveState(state: AppState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }

  static resetToSampleData(): AppState {
    const sample = this.loadSampleWorkspace();
    this.saveState(sample);
    return sample;
  }

  static clearToEmptyState(): AppState {
    const empty = this.getInitialState();
    this.saveState(empty);
    return empty;
  }

  static exportStateToJson(state: AppState): string {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        appName: 'PivotOS',
        data: state,
      },
      null,
      2
    );
  }

  static importStateFromJson(jsonStr: string): { success: boolean; error?: string; state?: AppState } {
    try {
      const parsed = JSON.parse(jsonStr);
      const raw = parsed.data || parsed;
      if (!raw.projects || !raw.tasks || !raw.staff || !raw.resources) {
        return {
          success: false,
          error: 'Invalid schema: Imported JSON must contain projects, tasks, staff, and resources collections.',
        };
      }

      // Comprehensive Simulated Server-Side Validation: verify data before allowing persistence
      for (const p of raw.projects) {
        const v = validateProject(p);
        if (!v.isValid) {
          return {
            success: false,
            error: `Project validation failed for "${p.name || 'unnamed'}": ${Object.values(v.errors).join(', ')}`,
          };
        }
      }

      for (const t of raw.tasks) {
        const v = validateTask(t, raw.tasks);
        if (!v.isValid) {
          return {
            success: false,
            error: `Task validation failed for "${t.title || 'unnamed'}": ${Object.values(v.errors).join(', ')}`,
          };
        }
      }

      const cycleRes = detectCycles(raw.tasks);
      if (cycleRes.hasCycle) {
        return {
          success: false,
          error: `Import rejected: Dependency graph contains a cyclic loop (${cycleRes.cyclePath?.join(' → ')}).`,
        };
      }

      for (const s of raw.staff) {
        const v = validateStaff(s);
        if (!v.isValid) {
          return {
            success: false,
            error: `Staff validation failed for "${s.name || 'unnamed'}": ${Object.values(v.errors).join(', ')}`,
          };
        }
      }

      for (const r of raw.resources) {
        const v = validateResource(r);
        if (!v.isValid) {
          return {
            success: false,
            error: `Resource validation failed for "${r.name || 'unnamed'}": ${Object.values(v.errors).join(', ')}`,
          };
        }
      }

      const validated: AppState = {
        projects: raw.projects,
        tasks: raw.tasks,
        staff: raw.staff,
        resources: raw.resources,
        disruptions: raw.disruptions || [],
        decisionLogs: raw.decisionLogs || [],
        settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
        activeDisruptionId: raw.activeDisruptionId || null,
      };
      this.saveState(validated);
      return { success: true, state: validated };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'JSON parse failure',
      };
    }
  }

  static exportRecoveryReportCsv(
    disruption: Disruption,
    impact: ImpactAnalysisResult,
    plan: RecoveryPlan
  ): string {
    const rows: string[][] = [
      ['PIVOTOS RECOVERY OPERATION REPORT'],
      ['Report Generated', new Date().toISOString()],
      ['Disruption Title', disruption.title],
      ['Disruption Type', disruption.type],
      ['Severity', disruption.severity],
      ['Recommended Strategy', plan.name],
      ['Plan Feasible', plan.isFeasible ? 'YES' : 'NO'],
      ['Projected Completion', plan.summaryMetrics.projectedCompletionDate],
      ['Total Delay Days', String(plan.summaryMetrics.totalDelayDays)],
      ['Overdue Tasks Count', String(plan.summaryMetrics.overdueTasksCount)],
      ['Cost Delta ($)', String(plan.summaryMetrics.budgetCostDelta)],
      ['Weighted Business Loss ($)', String(plan.summaryMetrics.weightedBusinessLoss)],
      [],
      ['REVISED TASK SCHEDULE BREAKDOWN'],
      ['Task ID', 'Original Start', 'Original End', 'Proposed Start', 'Proposed End', 'Duration (Days)', 'Status', 'Notes'],
    ];

    plan.revisedTasks.forEach((t) => {
      rows.push([
        t.taskId,
        t.originalStart,
        t.originalEnd,
        t.proposedStart,
        t.proposedEnd,
        String(t.durationDays),
        t.status,
        `"${t.changeNotes.replace(/"/g, '""')}"`,
      ]);
    });

    return rows.map((r) => r.join(',')).join('\n');
  }

  static exportRecoveryReportHtml(
    disruption: Disruption,
    impact: ImpactAnalysisResult,
    plan: RecoveryPlan
  ): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PivotOS Recovery Report - ${disruption.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; background: #fff; }
    h1 { margin-bottom: 4px; font-size: 24px; color: #0f172a; }
    .kicker { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #0d9488; font-weight: 600; }
    .meta-bar { border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin: 16px 0 24px 0; font-size: 13px; color: #64748b; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
    .card-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .card-val { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { text-align: left; padding: 10px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .status-badge { display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase; }
    .status-kept { background: #e2e8f0; color: #334155; }
    .status-shifted { background: #fef3c7; color: #b45309; }
    .status-reassigned { background: #ccfbf1; color: #0f766e; }
    .status-deferred { background: #fee2e2; color: #b91c1c; }
    .status-crashed { background: #f3e8ff; color: #6b21a8; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="kicker">PivotOS · Operational Disruption & Recovery Plan</div>
  <h1>${disruption.title}</h1>
  <div class="meta-bar">
    Generated: <strong>${new Date().toLocaleString()}</strong> &bull;
    Disruption Type: <strong>${disruption.type}</strong> &bull;
    Severity: <strong>${disruption.severity.toUpperCase()}</strong> &bull;
    Recovery Strategy: <strong>${plan.name}</strong>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Feasibility Status</div>
      <div class="card-val" style="color: ${plan.isFeasible ? '#059669' : '#dc2626'}">
        ${plan.isFeasible ? 'FEASIBLE' : 'CONSTRAINED'}
      </div>
    </div>
    <div class="card">
      <div class="card-label">Projected Finish</div>
      <div class="card-val">${plan.summaryMetrics.projectedCompletionDate}</div>
    </div>
    <div class="card">
      <div class="card-label">Delay Impact</div>
      <div class="card-val">+${plan.summaryMetrics.totalDelayDays} Days</div>
    </div>
    <div class="card">
      <div class="card-label">Weighted Loss</div>
      <div class="card-val">$${plan.summaryMetrics.weightedBusinessLoss.toLocaleString()}</div>
    </div>
  </div>

  <h3>Revised Task Execution Schedule</h3>
  <table>
    <thead>
      <tr>
        <th>Task ID</th>
        <th>Original Window</th>
        <th>Proposed Window</th>
        <th>Duration</th>
        <th>Status</th>
        <th>Adjustment Rationale</th>
      </tr>
    </thead>
    <tbody>
      ${plan.revisedTasks
        .map(
          (t) => `
        <tr>
          <td><strong>${t.taskId}</strong></td>
          <td>${t.originalStart} &rarr; ${t.originalEnd}</td>
          <td><strong>${t.proposedStart} &rarr; ${t.proposedEnd}</strong></td>
          <td>${t.durationDays}d</td>
          <td><span class="status-badge status-${t.status}">${t.status}</span></td>
          <td>${t.changeNotes}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div style="margin-top: 32px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
    <h4 style="margin: 0 0 8px 0;">Executive Summary & Audit Trail</h4>
    <p style="margin: 0; font-size: 13px; color: #475569;">
      ${impact.summaryText} All dates calculated according to strict topological dependency ordering and configured business working days.
    </p>
  </div>
</body>
</html>`;
  }
}
