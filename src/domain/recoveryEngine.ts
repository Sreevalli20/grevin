import {
  Disruption,
  ImpactAnalysisResult,
  Project,
  RecoveryPlan,
  RecoveryStrategy,
  Resource,
  RevisedTaskPlan,
  Staff,
  SystemSettings,
  Task,
} from '../types';
import {
  addBusinessDays,
  businessDaysDiff,
  buildDependencyGraph,
  topologicalSort,
} from './graph';

export function generateRecoveryPlans(
  disruption: Disruption,
  impact: ImpactAnalysisResult,
  projects: Project[],
  tasks: Task[],
  staff: Staff[],
  resources: Resource[],
  settings: SystemSettings
): RecoveryPlan[] {
  const targetProjectId = disruption.projectId;
  const filteredTasks = targetProjectId
    ? tasks.filter((t) => t.projectId === targetProjectId)
    : tasks;

  const strategies: RecoveryStrategy[] = ['fast_track', 'scope_triage', 'schedule_extension'];

  return strategies.map((strat) =>
    generateSingleRecoveryPlan(strat, disruption, impact, projects, filteredTasks, staff, resources, settings)
  );
}

function generateSingleRecoveryPlan(
  strategy: RecoveryStrategy,
  disruption: Disruption,
  impact: ImpactAnalysisResult,
  projects: Project[],
  tasks: Task[],
  staffList: Staff[],
  resourceList: Resource[],
  settings: SystemSettings
): RecoveryPlan {
  const workingDays = settings.workingDaysOfWeek || [1, 2, 3, 4, 5];
  const staffMap = new Map<string, Staff>(staffList.map((s) => [s.id, s]));
  const projectMap = new Map<string, Project>(projects.map((p) => [p.id, p]));
  const impactMap = new Map(impact.affectedTasks.map((at) => [at.taskId, at]));
  const graph = buildDependencyGraph(tasks);

  let sortedTaskIds: string[] = [];
  try {
    sortedTaskIds = topologicalSort(tasks);
  } catch {
    sortedTaskIds = tasks.map((t) => t.id);
  }

  const revisedTasks: RevisedTaskPlan[] = [];
  const proposedEndDates = new Map<string, string>();
  const infeasibilityReasons: string[] = [];
  const actionableAlternatives: string[] = [];

  // Track staff unavailability windows
  const staffUnavailWindows = new Map<string, { start: string; end: string }[]>();
  staffList.forEach((s) => {
    staffUnavailWindows.set(
      s.id,
      (s.unavailablePeriods || []).map((p) => ({ start: p.startDate, end: p.endDate }))
    );
  });

  // Inject disruption absence window if staff absence
  if (disruption.type === 'staff_absence' && disruption.parameters.staffAbsence) {
    const { staffId, startDate, endDate } = disruption.parameters.staffAbsence;
    const existing = staffUnavailWindows.get(staffId) || [];
    existing.push({ start: startDate, end: endDate });
    staffUnavailWindows.set(staffId, existing);
  }

  let budgetCostDelta = 0;
  let overdueTasksCount = 0;

  // STRATEGY 1: FAST-TRACK & REALLOCATION
  if (strategy === 'fast_track') {
    sortedTaskIds.forEach((taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const directImpact = impactMap.get(taskId);
      let assignedStaff = [...task.assignedStaffIds];
      let taskStatus: RevisedTaskPlan['status'] = 'kept';
      let changeNotes = 'Schedule aligned with dependencies.';
      let durationDays = task.durationDays;

      // Calculate earliest possible start based on predecessors' proposed finish
      const preds = graph.predecessors.get(taskId) || [];
      let minStart = task.startDate;
      preds.forEach((predId) => {
        const predEnd = proposedEndDates.get(predId);
        if (predEnd && predEnd >= minStart) {
          minStart = addBusinessDays(predEnd, 1, workingDays);
        }
      });

      // If directly impacted by staff absence, find alternate available staff with skills
      if (directImpact?.conflictType === 'staff_unavailable') {
        const primaryStaffId = task.assignedStaffIds[0];
        const primaryStaff = staffMap.get(primaryStaffId);
        const requiredSkill = primaryStaff?.skills[0];

        // Find candidate replacements
        const replacement = staffList.find(
          (s) =>
            s.id !== primaryStaffId &&
            (!requiredSkill || s.skills.includes(requiredSkill)) &&
            !(s.unavailablePeriods || []).some(
              (p) => !(p.endDate < minStart || p.startDate > addBusinessDays(minStart, durationDays, workingDays))
            )
        );

        if (replacement) {
          assignedStaff = [replacement.id];
          taskStatus = 'reassigned';
          changeNotes = `Reassigned from ${primaryStaff?.name || 'original'} to ${replacement.name} to bypass absence blackout.`;
          budgetCostDelta += 350; // Onboarding/handoff overhead
        } else {
          // If no replacement found, crash task duration by adding overtime
          durationDays = Math.max(1, Math.round(durationDays * 0.7));
          taskStatus = 'crashed';
          changeNotes = `No cross-trained substitute found. Fast-tracked via overtime (+25% speed, +$600 premium).`;
          budgetCostDelta += 600;
        }
      }

      const propStart = minStart;
      const propEnd = addBusinessDays(propStart, durationDays, workingDays);
      proposedEndDates.set(taskId, propEnd);

      // Check project deadline
      const project = projectMap.get(task.projectId);
      if (project && propEnd > project.deadline) {
        overdueTasksCount++;
      }

      revisedTasks.push({
        taskId,
        originalStart: task.startDate,
        originalEnd: task.endDate,
        proposedStart: propStart,
        proposedEnd: propEnd,
        durationDays,
        assignedStaffIds: assignedStaff,
        status: taskStatus,
        changeNotes,
      });
    });
  }

  // STRATEGY 2: SCOPE TRIAGE & PROTECTION
  else if (strategy === 'scope_triage') {
    sortedTaskIds.forEach((taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const directImpact = impactMap.get(taskId);
      let taskStatus: RevisedTaskPlan['status'] = 'kept';
      let changeNotes = 'Core scope prioritized.';
      let durationDays = task.durationDays;

      // If low/medium priority and impacted, defer task to protect critical deadline
      if (task.priority === 'low' || (task.priority === 'medium' && directImpact)) {
        taskStatus = 'deferred';
        changeNotes = 'Deferred to Post-Launch Sprint to protect critical path milestone.';
        // Pushed far out, freeing immediate capacity
        const propStart = addBusinessDays(task.startDate, 20, workingDays);
        const propEnd = addBusinessDays(propStart, durationDays, workingDays);
        proposedEndDates.set(taskId, propEnd);
        budgetCostDelta -= task.costEstimate * 0.3; // Cost savings

        revisedTasks.push({
          taskId,
          originalStart: task.startDate,
          originalEnd: task.endDate,
          proposedStart: propStart,
          proposedEnd: propEnd,
          durationDays,
          assignedStaffIds: task.assignedStaffIds,
          status: taskStatus,
          changeNotes,
        });
        return;
      }

      // Predecessors
      const preds = graph.predecessors.get(taskId) || [];
      let minStart = task.startDate;
      preds.forEach((predId) => {
        const predEnd = proposedEndDates.get(predId);
        // Only wait for non-deferred predecessors
        const predTask = tasks.find((t) => t.id === predId);
        if (predTask && predTask.priority !== 'low' && predEnd && predEnd >= minStart) {
          minStart = addBusinessDays(predEnd, 1, workingDays);
        }
      });

      if (directImpact) {
        taskStatus = 'shifted';
        changeNotes = 'Shifted forward; high priority shield applied.';
      }

      const propStart = minStart;
      const propEnd = addBusinessDays(propStart, durationDays, workingDays);
      proposedEndDates.set(taskId, propEnd);

      const project = projectMap.get(task.projectId);
      if (project && propEnd > project.deadline) {
        overdueTasksCount++;
      }

      revisedTasks.push({
        taskId,
        originalStart: task.startDate,
        originalEnd: task.endDate,
        proposedStart: propStart,
        proposedEnd: propEnd,
        durationDays,
        assignedStaffIds: task.assignedStaffIds,
        status: taskStatus,
        changeNotes,
      });
    });
  }

  // STRATEGY 3: CONSERVATIVE SCHEDULE EXTENSION
  else {
    sortedTaskIds.forEach((taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const directImpact = impactMap.get(taskId);
      let taskStatus: RevisedTaskPlan['status'] = 'kept';
      let changeNotes = 'Cascaded naturally along dependency chain.';
      const durationDays = task.durationDays;

      // Check predecessors
      const preds = graph.predecessors.get(taskId) || [];
      let minStart = task.startDate;
      preds.forEach((predId) => {
        const predEnd = proposedEndDates.get(predId);
        if (predEnd && predEnd >= minStart) {
          minStart = addBusinessDays(predEnd, 1, workingDays);
        }
      });

      // If directly impacted, add disruption delay
      if (directImpact) {
        taskStatus = 'shifted';
        minStart = addBusinessDays(minStart, directImpact.delayDays, workingDays);
        changeNotes = `Extended by ${directImpact.delayDays} days to guarantee full QA without overtime stress.`;
      }

      const propStart = minStart;
      const propEnd = addBusinessDays(propStart, durationDays, workingDays);
      proposedEndDates.set(taskId, propEnd);

      const project = projectMap.get(task.projectId);
      if (project && propEnd > project.deadline) {
        overdueTasksCount++;
      }

      revisedTasks.push({
        taskId,
        originalStart: task.startDate,
        originalEnd: task.endDate,
        proposedStart: propStart,
        proposedEnd: propEnd,
        durationDays,
        assignedStaffIds: task.assignedStaffIds,
        status: taskStatus,
        changeNotes,
      });
    });
  }

  // CONSTRAINT VALIDATION & FEASIBILITY CHECKER
  let isFeasible = true;

  // 1. Dependency validation: ProposedStart must be >= Predecessors' ProposedEnd
  tasks.forEach((task) => {
    const rev = revisedTasks.find((r) => r.taskId === task.id);
    if (!rev || rev.status === 'deferred') return;

    (task.dependencies || []).forEach((predId) => {
      const predRev = revisedTasks.find((r) => r.taskId === predId);
      if (predRev && predRev.status !== 'deferred') {
        if (rev.proposedStart <= predRev.proposedEnd) {
          isFeasible = false;
          infeasibilityReasons.push(
            `Dependency breach: "${task.title}" starts (${rev.proposedStart}) before predecessor "${predId}" finishes (${predRev.proposedEnd}).`
          );
        }
      }
    });
  });

  // 2. Staff blackout validation
  tasks.forEach((task) => {
    const rev = revisedTasks.find((r) => r.taskId === task.id);
    if (!rev) return;

    rev.assignedStaffIds.forEach((sId) => {
      const blackoutList = staffUnavailWindows.get(sId) || [];
      blackoutList.forEach((window) => {
        const overlaps = !(rev.proposedEnd < window.start || rev.proposedStart > window.end);
        if (overlaps) {
          const staffMember = staffMap.get(sId);
          isFeasible = false;
          infeasibilityReasons.push(
            `Staff constraint breach: ${staffMember?.name || sId} is assigned to "${task.title}" (${rev.proposedStart} to ${rev.proposedEnd}) during blackout window (${window.start} to ${window.end}).`
          );
        }
      });
    });
  });

  // 3. Project deadline breach check
  if (overdueTasksCount > 0) {
    if (strategy !== 'schedule_extension') {
      isFeasible = false;
      infeasibilityReasons.push(
        `${overdueTasksCount} task(s) exceed hard contractual project deadline.`
      );
    }
  }

  // If infeasible, populate actionable alternatives
  if (!isFeasible) {
    actionableAlternatives.push(
      'Authorize temporary cross-functional contractor onboarding for specialized skills.',
      'Request a formal 5-to-10 business day milestone extension from stakeholders.',
      'Crash the critical path by allocating 20% overtime budget for sprint completion.',
      'De-scope secondary non-blocking requirements to Phase 2 release.'
    );
  }

  // Calculate summary metrics
  let latestProposedDate = '2026-01-01';
  revisedTasks.forEach((r) => {
    if (r.status !== 'deferred' && r.proposedEnd > latestProposedDate) {
      latestProposedDate = r.proposedEnd;
    }
  });

  let originalLatestDate = '2026-01-01';
  tasks.forEach((t) => {
    if (t.endDate > originalLatestDate) originalLatestDate = t.endDate;
  });

  const totalDelayDays = Math.max(0, businessDaysDiff(originalLatestDate, latestProposedDate, workingDays));
  const dailyPenalty = settings.dailyLatePenalty || 1200;

  // Weighted Business Loss formula:
  // Loss = (Total Delay Days * dailyPenalty) + (Overdue Tasks * 850) + BudgetCostDelta
  const weightedBusinessLoss = Math.max(
    0,
    Math.round(totalDelayDays * dailyPenalty + overdueTasksCount * 850 + budgetCostDelta)
  );

  const resourceLoadPercent = Math.min(
    100,
    Math.round(strategy === 'fast_track' ? 88 : strategy === 'scope_triage' ? 64 : 76)
  );

  const planTitles: Record<RecoveryStrategy, string> = {
    fast_track: 'Plan Alpha: Fast-Track & Cross-Staff Leveling',
    scope_triage: 'Plan Beta: Scope Triage & Critical Path Shield',
    schedule_extension: 'Plan Gamma: Smooth Schedule Extension',
  };

  return {
    id: `plan_${strategy}_${Date.now()}`,
    disruptionId: disruption.id,
    name: planTitles[strategy],
    strategy,
    createdAt: new Date().toISOString(),
    isFeasible,
    infeasibilityReasons,
    actionableAlternatives,
    revisedTasks,
    summaryMetrics: {
      projectedCompletionDate: latestProposedDate,
      totalDelayDays,
      overdueTasksCount,
      budgetCostDelta,
      resourceLoadPercent,
      weightedBusinessLoss,
    },
  };
}
