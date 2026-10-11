import {
  Disruption,
  Priority,
  Project,
  Resource,
  ResourceType,
  Staff,
  Task,
  UnavailablePeriod,
} from '../types';
import { detectCycles } from './graph';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate email format using RFC 5322 regex approximation
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate ISO date string format (YYYY-MM-DD)
 */
export function isValidDateStr(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return !isNaN(d.getTime());
}

/**
 * Project Validator
 */
export function validateProject(project: Partial<Project>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!project.code || !project.code.trim()) {
    errors.code = 'Project code is required.';
  } else if (!/^[A-Z0-9_-]{2,16}$/i.test(project.code.trim())) {
    errors.code = 'Project code must be 2-16 alphanumeric characters (hyphens and underscores allowed).';
  }

  if (!project.name || !project.name.trim()) {
    errors.name = 'Project name is required.';
  } else if (project.name.trim().length < 3) {
    errors.name = 'Project name must be at least 3 characters.';
  } else if (project.name.trim().length > 100) {
    errors.name = 'Project name cannot exceed 100 characters.';
  }

  if (!project.owner || !project.owner.trim()) {
    errors.owner = 'Project owner / operational lead is required.';
  }

  if (!project.deadline) {
    errors.deadline = 'Target deadline is required.';
  } else if (!isValidDateStr(project.deadline)) {
    errors.deadline = 'Target deadline must be a valid date in YYYY-MM-DD format.';
  }

  if (project.budget === undefined || project.budget === null) {
    errors.budget = 'Project budget is required.';
  } else if (isNaN(project.budget) || project.budget < 0) {
    errors.budget = 'Project budget must be a non-negative number.';
  } else if (project.budget > 1000000000) {
    errors.budget = 'Project budget exceeds maximum permitted limit ($1B).';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Task Validator
 */
export function validateTask(
  task: Partial<Task>,
  existingTasks: Task[] = []
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!task.projectId || !task.projectId.trim()) {
    errors.projectId = 'Project assignment is required.';
  }

  if (!task.code || !task.code.trim()) {
    errors.code = 'Task code is required.';
  } else if (!/^[A-Z0-9_-]{2,16}$/i.test(task.code.trim())) {
    errors.code = 'Task code must be 2-16 alphanumeric characters.';
  }

  if (!task.title || !task.title.trim()) {
    errors.title = 'Task title is required.';
  } else if (task.title.trim().length < 3) {
    errors.title = 'Task title must be at least 3 characters.';
  } else if (task.title.trim().length > 120) {
    errors.title = 'Task title cannot exceed 120 characters.';
  }

  if (!task.durationDays || isNaN(task.durationDays) || task.durationDays < 1) {
    errors.durationDays = 'Task duration must be at least 1 day.';
  } else if (task.durationDays > 365) {
    errors.durationDays = 'Task duration cannot exceed 365 days.';
  }

  if (!task.startDate) {
    errors.startDate = 'Start date is required.';
  } else if (!isValidDateStr(task.startDate)) {
    errors.startDate = 'Start date must be a valid YYYY-MM-DD date.';
  }

  if (!task.endDate) {
    errors.endDate = 'End date is required.';
  } else if (!isValidDateStr(task.endDate)) {
    errors.endDate = 'End date must be a valid YYYY-MM-DD date.';
  } else if (task.startDate && task.endDate < task.startDate) {
    errors.endDate = 'End date cannot be prior to the start date.';
  }

  if (task.costEstimate !== undefined && task.costEstimate !== null) {
    if (isNaN(task.costEstimate) || task.costEstimate < 0) {
      errors.costEstimate = 'Cost estimate cannot be negative.';
    }
  }

  // Prevent self-dependency
  if (task.id && task.dependencies && task.dependencies.includes(task.id)) {
    errors.dependencies = 'A task cannot depend on itself.';
  }

  // Validate dependencies exist and do not cause cycles
  if (task.dependencies && task.dependencies.length > 0) {
    const candidateId = task.id || 'temp-task-validation-id';
    
    // Construct simulated task list to run cycle check
    const otherTasks = existingTasks.filter((t) => t.id !== candidateId);
    const candidateTask: Task = {
      id: candidateId,
      projectId: task.projectId || 'proj-1',
      code: task.code || 'TSK-VAL',
      title: task.title || 'Validation Task',
      description: task.description || '',
      priority: task.priority || 'medium',
      durationDays: task.durationDays || 1,
      startDate: task.startDate || '2026-10-12',
      endDate: task.endDate || '2026-10-13',
      dependencies: task.dependencies,
      assignedStaffIds: task.assignedStaffIds || [],
      requiredResources: task.requiredResources || [],
      status: task.status || 'not_started',
      costEstimate: task.costEstimate || 0,
      extractionSource: 'manual',
      createdAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z',
      revision: 1,
    };

    const simulatedGraph = [...otherTasks, candidateTask];
    const cycleCheck = detectCycles(simulatedGraph);
    if (cycleCheck.hasCycle) {
      errors.dependencies = `Circular dependency detected: ${cycleCheck.cyclePath?.join(' → ') || 'Loop found'}.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Staff Validator
 */
export function validateStaff(staff: Partial<Staff>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!staff.name || !staff.name.trim()) {
    errors.name = 'Personnel name is required.';
  } else if (staff.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!staff.role || !staff.role.trim()) {
    errors.role = 'Role / position title is required.';
  }

  if (staff.email && !isValidEmail(staff.email)) {
    errors.email = 'Please provide a valid email address format.';
  }

  if (staff.hourlyRate === undefined || staff.hourlyRate === null || isNaN(staff.hourlyRate)) {
    errors.hourlyRate = 'Hourly billing rate is required.';
  } else if (staff.hourlyRate < 0) {
    errors.hourlyRate = 'Hourly rate cannot be negative.';
  } else if (staff.hourlyRate > 5000) {
    errors.hourlyRate = 'Hourly rate exceeds reasonable operational threshold ($5000/hr).';
  }

  if (staff.maxHoursPerWeek === undefined || staff.maxHoursPerWeek === null || isNaN(staff.maxHoursPerWeek)) {
    errors.maxHoursPerWeek = 'Maximum weekly capacity is required.';
  } else if (staff.maxHoursPerWeek < 1 || staff.maxHoursPerWeek > 168) {
    errors.maxHoursPerWeek = 'Weekly capacity must be between 1 and 168 hours.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Unavailable Period Validator
 */
export function validateUnavailablePeriod(period: Partial<UnavailablePeriod>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!period.startDate || !isValidDateStr(period.startDate)) {
    errors.startDate = 'Valid start date is required.';
  }

  if (!period.endDate || !isValidDateStr(period.endDate)) {
    errors.endDate = 'Valid end date is required.';
  } else if (period.startDate && period.endDate < period.startDate) {
    errors.endDate = 'End date cannot be prior to start date.';
  }

  if (!period.reason || !period.reason.trim()) {
    errors.reason = 'Reason for unavailability is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Resource Validator
 */
export function validateResource(res: Partial<Resource>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!res.code || !res.code.trim()) {
    errors.code = 'Resource code/SKU is required.';
  }

  if (!res.name || !res.name.trim()) {
    errors.name = 'Resource name is required.';
  } else if (res.name.trim().length < 2) {
    errors.name = 'Resource name must be at least 2 characters.';
  }

  if (res.totalQuantity === undefined || isNaN(res.totalQuantity) || res.totalQuantity < 0) {
    errors.totalQuantity = 'Total quantity must be a non-negative number.';
  }

  if (res.availableQuantity === undefined || isNaN(res.availableQuantity) || res.availableQuantity < 0) {
    errors.availableQuantity = 'Available quantity must be non-negative.';
  } else if (res.totalQuantity !== undefined && res.availableQuantity > res.totalQuantity) {
    errors.availableQuantity = 'Available quantity cannot exceed total quantity.';
  }

  if (res.reorderPoint !== undefined && (isNaN(res.reorderPoint) || res.reorderPoint < 0)) {
    errors.reorderPoint = 'Reorder threshold cannot be negative.';
  }

  if (res.unitCost !== undefined && (isNaN(res.unitCost) || res.unitCost < 0)) {
    errors.unitCost = 'Unit cost cannot be negative.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Disruption Validator
 */
export function validateDisruption(disruption: Partial<Disruption>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!disruption.title || !disruption.title.trim()) {
    errors.title = 'Disruption scenario title is required.';
  } else if (disruption.title.trim().length < 4) {
    errors.title = 'Title must be at least 4 characters.';
  }

  if (!disruption.type) {
    errors.type = 'Disruption type must be specified.';
  }

  const params = disruption.parameters;
  if (!params) {
    errors.parameters = 'Operational parameters must be provided.';
    return { isValid: false, errors };
  }

  switch (disruption.type) {
    case 'staff_absence': {
      const sa = params.staffAbsence;
      if (!sa?.staffId) errors.staffId = 'Staff member must be selected.';
      if (!sa?.startDate || !isValidDateStr(sa.startDate)) errors.startDate = 'Valid start date required.';
      if (!sa?.endDate || !isValidDateStr(sa.endDate)) {
        errors.endDate = 'Valid end date required.';
      } else if (sa?.startDate && sa.endDate < sa.startDate) {
        errors.endDate = 'Absence end date cannot precede start date.';
      }
      break;
    }
    case 'inventory_shortage': {
      const is = params.inventoryShortage;
      if (!is?.resourceId) errors.resourceId = 'Target inventory resource must be selected.';
      if (!is?.reductionQuantity || is.reductionQuantity <= 0) {
        errors.reductionQuantity = 'Reduction deficit must be greater than 0.';
      }
      if (!is?.delayDays || is.delayDays <= 0) {
        errors.delayDays = 'Delivery delay must be at least 1 day.';
      }
      break;
    }
    case 'resource_failure': {
      const rf = params.resourceFailure;
      if (!rf?.resourceId) errors.resourceId = 'Equipment/facility must be selected.';
      if (!rf?.outageDays || rf.outageDays <= 0) {
        errors.outageDays = 'Outage duration must be at least 1 day.';
      }
      break;
    }
    case 'budget_cut': {
      const bc = params.budgetCut;
      if (!bc?.cutPercentage || bc.cutPercentage <= 0 || bc.cutPercentage > 100) {
        errors.cutPercentage = 'Budget cut percentage must be between 1% and 100%.';
      }
      if (!bc?.cutAmount || bc.cutAmount <= 0) {
        errors.cutAmount = 'Dollar cut amount must be greater than 0.';
      }
      break;
    }
    case 'scope_surge': {
      const ss = params.scopeSurge;
      if (!ss?.urgentTaskTitle || !ss.urgentTaskTitle.trim()) {
        errors.urgentTaskTitle = 'Urgent blocker task title is required.';
      }
      if (!ss?.durationDays || ss.durationDays <= 0) {
        errors.durationDays = 'Effort duration must be at least 1 day.';
      }
      break;
    }
    case 'deadline_compression': {
      const dc = params.deadlineCompression;
      if (!dc?.newDeadline || !isValidDateStr(dc.newDeadline)) {
        errors.newDeadline = 'Compressed target deadline must be a valid date.';
      }
      if (!dc?.daysCompressed || dc.daysCompressed <= 0) {
        errors.daysCompressed = 'Days compressed must be greater than 0.';
      }
      break;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
