import {
  Disruption,
  ImpactAnalysisResult,
  Project,
  Resource,
  Staff,
  Task,
  AffectedTask,
  AffectedProject,
  SystemSettings,
} from '../types';
import {
  addBusinessDays,
  businessDaysDiff,
  buildDependencyGraph,
  calculateCriticalPath,
  topologicalSort,
} from './graph';

export function analyzeDisruptionImpact(
  disruption: Disruption,
  projects: Project[],
  tasks: Task[],
  staff: Staff[],
  resources: Resource[],
  settings: SystemSettings
): ImpactAnalysisResult {
  const workingDays = settings.workingDaysOfWeek || [1, 2, 3, 4, 5];
  const directAffectedTaskMap = new Map<
    string,
    { delayDays: number; reason: string; conflictType: AffectedTask['conflictType'] }
  >();

  const targetProjectId = disruption.projectId;
  const filteredTasks = targetProjectId
    ? tasks.filter((t) => t.projectId === targetProjectId)
    : tasks;

  const staffMap = new Map<string, Staff>(staff.map((s) => [s.id, s]));
  const resourceMap = new Map<string, Resource>(resources.map((r) => [r.id, r]));
  const projectMap = new Map<string, Project>(projects.map((p) => [p.id, p]));

  // 1. Identify DIRECTLY affected tasks based on disruption type
  switch (disruption.type) {
    case 'staff_absence': {
      const params = disruption.parameters.staffAbsence;
      if (params) {
        const { staffId, startDate, endDate, reason } = params;
        const absentStaff = staffMap.get(staffId);
        const staffName = absentStaff ? absentStaff.name : 'Assigned Staff';
        const absenceDays = Math.max(1, businessDaysDiff(startDate, endDate, workingDays) + 1);

        filteredTasks.forEach((task) => {
          if (task.assignedStaffIds.includes(staffId)) {
            // Check date overlap
            const overlaps = !(task.endDate < startDate || task.startDate > endDate);
            if (overlaps) {
              directAffectedTaskMap.set(task.id, {
                delayDays: absenceDays,
                reason: `Key personnel ${staffName} is unavailable (${reason || 'absence'}) from ${startDate} to ${endDate}.`,
                conflictType: 'staff_unavailable',
              });
            }
          }
        });
      }
      break;
    }

    case 'inventory_shortage': {
      const params = disruption.parameters.inventoryShortage;
      if (params) {
        const { resourceId, reductionQuantity, delayDays } = params;
        const res = resourceMap.get(resourceId);
        const resName = res ? res.name : 'Inventory item';
        const effectiveDelay = Math.max(1, delayDays || 4);

        filteredTasks.forEach((task) => {
          const req = task.requiredResources?.find((r) => r.resourceId === resourceId);
          if (req) {
            directAffectedTaskMap.set(task.id, {
              delayDays: effectiveDelay,
              reason: `Shortage of ${resName} (deficit of ${reductionQuantity} ${res?.unit || 'units'}). Delivery delayed by ${effectiveDelay} days.`,
              conflictType: 'resource_depleted',
            });
          }
        });
      }
      break;
    }

    case 'resource_failure': {
      const params = disruption.parameters.resourceFailure;
      if (params) {
        const { resourceId, outageDays } = params;
        const res = resourceMap.get(resourceId);
        const resName = res ? res.name : 'Critical Equipment';
        const outage = Math.max(1, outageDays || 5);

        filteredTasks.forEach((task) => {
          const req = task.requiredResources?.find((r) => r.resourceId === resourceId);
          if (req) {
            directAffectedTaskMap.set(task.id, {
              delayDays: outage,
              reason: `${resName} experienced unplanned downtime/outage for ${outage} business days.`,
              conflictType: 'resource_depleted',
            });
          }
        });
      }
      break;
    }

    case 'budget_cut': {
      const params = disruption.parameters.budgetCut;
      if (params) {
        const { cutAmount, cutPercentage } = params;
        // Low and medium priority tasks are directly strained or suspended
        filteredTasks
          .filter((t) => t.priority === 'low' || t.priority === 'medium')
          .forEach((task) => {
            directAffectedTaskMap.set(task.id, {
              delayDays: 3,
              reason: `Project budget slashed by ${cutPercentage}% ($${cutAmount?.toLocaleString()}). Task funding compromised.`,
              conflictType: 'budget_overflow',
            });
          });
      }
      break;
    }

    case 'scope_surge': {
      const params = disruption.parameters.scopeSurge;
      if (params) {
        const { urgentTaskTitle, durationDays, assignedStaffIds } = params;
        const surgeDays = Math.max(1, durationDays || 4);

        // Tasks assigned to these staff are displaced by high priority surge work
        filteredTasks.forEach((task) => {
          const sharesStaff = task.assignedStaffIds.some((sId) => assignedStaffIds?.includes(sId));
          if (sharesStaff && task.priority !== 'critical') {
            directAffectedTaskMap.set(task.id, {
              delayDays: surgeDays,
              reason: `Staff diverted to emergency priority task "${urgentTaskTitle}" (${surgeDays} days).`,
              conflictType: 'staff_unavailable',
            });
          }
        });
      }
      break;
    }

    case 'deadline_compression': {
      const params = disruption.parameters.deadlineCompression;
      if (params) {
        const { newDeadline, daysCompressed } = params;
        filteredTasks.forEach((task) => {
          if (task.endDate > newDeadline) {
            directAffectedTaskMap.set(task.id, {
              delayDays: daysCompressed || 5,
              reason: `Project deadline moved up to ${newDeadline}. Current task end date (${task.endDate}) breaches hard deadline.`,
              conflictType: 'deadline_breach',
            });
          }
        });
      }
      break;
    }
  }

  // 2. Transitive Downstream Propagation through topological ordering
  const taskMap = new Map<string, Task>(filteredTasks.map((t) => [t.id, t]));
  let topologicalOrder: string[] = [];
  try {
    topologicalOrder = topologicalSort(filteredTasks);
  } catch {
    topologicalOrder = filteredTasks.map((t) => t.id);
  }

  const calculatedDelayDays = new Map<string, number>();
  const isDirectMap = new Map<string, boolean>();
  const conflictTypeMap = new Map<string, AffectedTask['conflictType']>();
  const reasonMap = new Map<string, string>();

  // Initialize with direct impacts
  directAffectedTaskMap.forEach((val, tId) => {
    calculatedDelayDays.set(tId, val.delayDays);
    isDirectMap.set(tId, true);
    conflictTypeMap.set(tId, val.conflictType);
    reasonMap.set(tId, val.reason);
  });

  const graph = buildDependencyGraph(filteredTasks);

  // Propagate downstream
  topologicalOrder.forEach((tId) => {
    const currentDelay = calculatedDelayDays.get(tId) || 0;
    const successors = graph.successors.get(tId) || [];

    successors.forEach((succId) => {
      const existingSuccDelay = calculatedDelayDays.get(succId) || 0;
      // Successor is pushed by at least the predecessor's delay
      if (currentDelay > 0 && currentDelay > existingSuccDelay) {
        calculatedDelayDays.set(succId, currentDelay);
        if (!isDirectMap.has(succId)) {
          isDirectMap.set(succId, false);
          conflictTypeMap.set(succId, 'dependency_slip');
          const predTask = taskMap.get(tId);
          reasonMap.set(
            succId,
            `Dependency slip: Predecessor task "${predTask?.title || tId}" is delayed by ${currentDelay} business days.`
          );
        }
      }
    });
  });

  // Critical path analysis
  const criticalPathResult = calculateCriticalPath(filteredTasks);
  let criticalPathImpacted = false;

  // Build AffectedTask records
  const affectedTasks: AffectedTask[] = [];

  filteredTasks.forEach((task) => {
    const delay = calculatedDelayDays.get(task.id) || 0;
    if (delay > 0) {
      if (criticalPathResult.criticalTaskIds.has(task.id)) {
        criticalPathImpacted = true;
      }

      const newEstStart = addBusinessDays(task.startDate, delay, workingDays);
      const newEstEnd = addBusinessDays(task.endDate, delay, workingDays);

      const assignedStaffNames = task.assignedStaffIds
        .map((sId) => staffMap.get(sId)?.name || 'Unknown')
        .filter(Boolean);

      const isDirect = isDirectMap.get(task.id) ?? false;
      const conflictType = conflictTypeMap.get(task.id) ?? 'dependency_slip';
      const reason = reasonMap.get(task.id) || 'Cascade schedule delay from upstream dependency.';

      // Risk score: critical tasks & direct impact have higher base score
      let riskScore = Math.min(100, Math.round(delay * 12));
      if (task.priority === 'critical') riskScore = Math.min(100, riskScore + 25);
      if (criticalPathResult.criticalTaskIds.has(task.id)) riskScore = Math.min(100, riskScore + 20);
      if (isDirect) riskScore = Math.min(100, riskScore + 10);

      affectedTasks.push({
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
        isDirect,
        delayDays: delay,
        originalStart: task.startDate,
        originalEnd: task.endDate,
        newEstimatedStart: newEstStart,
        newEstimatedEnd: newEstEnd,
        reason,
        conflictType,
        riskScore,
        affectedStaff: assignedStaffNames,
      });
    }
  });

  // Calculate project-level impacts
  const affectedProjects: AffectedProject[] = [];
  const projectTasksGroup = new Map<string, AffectedTask[]>();
  affectedTasks.forEach((at) => {
    const group = projectTasksGroup.get(at.projectId) || [];
    group.push(at);
    projectTasksGroup.set(at.projectId, group);
  });

  let totalCostImpact = 0;
  let maxOverallDelay = 0;

  projectTasksGroup.forEach((pTasks, projId) => {
    const project = projectMap.get(projId);
    if (!project) return;

    let maxProjDelay = 0;
    let maxProjectedEnd = project.deadline;

    pTasks.forEach((pt) => {
      if (pt.delayDays > maxProjDelay) maxProjDelay = pt.delayDays;
      if (pt.newEstimatedEnd > maxProjectedEnd) {
        maxProjectedEnd = pt.newEstimatedEnd;
      }
    });

    if (maxProjDelay > maxOverallDelay) {
      maxOverallDelay = maxProjDelay;
    }

    const isBreached = maxProjectedEnd > project.deadline;
    const slipDays = isBreached
      ? businessDaysDiff(project.deadline, maxProjectedEnd, workingDays)
      : 0;

    // Cost impact: daily business penalty + additional staff labor/idle strain
    const dailyPenalty = settings.dailyLatePenalty || 1200;
    const projectPenalty = slipDays * dailyPenalty;
    const directLaborStrain = pTasks.length * 400; // estimated overtime or idling cost
    const budgetOverrun = projectPenalty + directLaborStrain;
    totalCostImpact += budgetOverrun;

    const riskScore = Math.min(
      100,
      Math.round(
        (slipDays > 0 ? 50 : 20) +
          (maxProjDelay * 5) +
          (criticalPathImpacted ? 20 : 0)
      )
    );

    affectedProjects.push({
      projectId: project.id,
      projectName: project.name,
      originalDeadline: project.deadline,
      projectedEnd: maxProjectedEnd,
      isDeadlineBreached: isBreached,
      delayDays: maxProjDelay,
      budgetOverrun,
      riskScore,
    });
  });

  const directCount = affectedTasks.filter((t) => t.isDirect).length;
  const indirectCount = affectedTasks.filter((t) => !t.isDirect).length;

  const summaryText = `Disruption impacts ${affectedTasks.length} total tasks (${directCount} direct, ${indirectCount} downstream). Maximum schedule delay is ${maxOverallDelay} business days. ${
    criticalPathImpacted ? 'Critical path is breached!' : 'Non-critical float absorbed part of the slip.'
  }`;

  return {
    disruptionId: disruption.id,
    calculatedAt: new Date().toISOString(),
    affectedTasks,
    affectedProjects,
    totalCostImpact,
    totalDaysDelayed: maxOverallDelay,
    criticalPathImpacted,
    unassignedHours: directCount * 16,
    summaryText,
  };
}
