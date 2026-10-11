export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';
export type ProjectStatus = 'active' | 'at_risk' | 'delayed' | 'completed' | 'archived';

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  owner: string;
  deadline: string; // YYYY-MM-DD
  budget: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskResourceRequirement {
  resourceId: string;
  quantity: number;
}

export interface Task {
  id: string;
  projectId: string;
  code: string;
  title: string;
  description: string;
  priority: Priority;
  durationDays: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dependencies: string[]; // task IDs that must complete before this starts
  assignedStaffIds: string[];
  requiredResources: TaskResourceRequirement[];
  status: TaskStatus;
  costEstimate: number;
  extractionSource: 'manual' | 'ai_extracted' | 'local_fallback';
  extractionJobId?: string;
  extractionFields?: {
    title?: string;
    description?: string;
    deadline?: string;
    priority?: Priority;
    estimatedEffort?: number;
    dependencies?: string[];
    tags?: string[];
  };
  originalInput?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface UnavailablePeriod {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  hourlyRate: number;
  maxHoursPerWeek: number;
  dailyCapacityHours: number;
  skills: string[];
  unavailablePeriods: UnavailablePeriod[];
}

export type ResourceType = 'inventory' | 'equipment' | 'software_seat' | 'facility';

export interface Resource {
  id: string;
  name: string;
  code: string;
  type: ResourceType;
  totalQuantity: number;
  availableQuantity: number;
  unit: string;
  unitCost: number;
  reorderPoint: number;
  status: 'operational' | 'degraded' | 'offline';
  location?: string;
}

export type DisruptionType = 
  | 'staff_absence' 
  | 'inventory_shortage' 
  | 'resource_failure' 
  | 'budget_cut' 
  | 'scope_surge' 
  | 'deadline_compression';

export type DisruptionSeverity = 'minor' | 'moderate' | 'severe' | 'critical';

export interface DisruptionParams {
  staffAbsence?: {
    staffId: string;
    startDate: string;
    endDate: string;
    reason: string;
  };
  inventoryShortage?: {
    resourceId: string;
    reductionQuantity: number;
    delayDays: number;
  };
  resourceFailure?: {
    resourceId: string;
    outageDays: number;
  };
  budgetCut?: {
    projectId: string;
    cutAmount: number;
    cutPercentage: number;
  };
  scopeSurge?: {
    projectId: string;
    urgentTaskTitle: string;
    durationDays: number;
    priority: Priority;
    assignedStaffIds: string[];
    deadline: string;
  };
  deadlineCompression?: {
    projectId: string;
    daysCompressed: number;
    newDeadline: string;
  };
}

export interface Disruption {
  id: string;
  type: DisruptionType;
  title: string;
  description: string;
  severity: DisruptionSeverity;
  projectId?: string;
  status: 'simulated' | 'analyzed' | 'resolved' | 'dismissed';
  createdAt: string;
  parameters: DisruptionParams;
}

export interface AffectedTask {
  taskId: string;
  taskTitle: string;
  projectId: string;
  isDirect: boolean;
  delayDays: number;
  originalStart: string;
  originalEnd: string;
  newEstimatedStart: string;
  newEstimatedEnd: string;
  reason: string;
  conflictType: 'dependency_slip' | 'staff_unavailable' | 'resource_depleted' | 'deadline_breach' | 'budget_overflow';
  riskScore: number; // 0 - 100
  affectedStaff: string[];
}

export interface AffectedProject {
  projectId: string;
  projectName: string;
  originalDeadline: string;
  projectedEnd: string;
  isDeadlineBreached: boolean;
  delayDays: number;
  budgetOverrun: number;
  riskScore: number;
}

export interface ImpactAnalysisResult {
  disruptionId: string;
  calculatedAt: string;
  affectedTasks: AffectedTask[];
  affectedProjects: AffectedProject[];
  totalCostImpact: number;
  totalDaysDelayed: number;
  criticalPathImpacted: boolean;
  unassignedHours: number;
  summaryText: string;
}

export type RecoveryStrategy = 'fast_track' | 'scope_triage' | 'schedule_extension';

export interface RevisedTaskPlan {
  taskId: string;
  originalStart: string;
  originalEnd: string;
  proposedStart: string;
  proposedEnd: string;
  durationDays: number;
  assignedStaffIds: string[];
  status: 'kept' | 'shifted' | 'reassigned' | 'deferred' | 'crashed';
  changeNotes: string;
}

export interface RecoveryPlan {
  id: string;
  disruptionId: string;
  name: string;
  strategy: RecoveryStrategy;
  createdAt: string;
  isFeasible: boolean;
  infeasibilityReasons: string[];
  actionableAlternatives: string[];
  revisedTasks: RevisedTaskPlan[];
  summaryMetrics: {
    projectedCompletionDate: string;
    totalDelayDays: number;
    overdueTasksCount: number;
    budgetCostDelta: number;
    resourceLoadPercent: number;
    weightedBusinessLoss: number; // calculated loss index ($)
  };
}

export interface DecisionLogEntry {
  id: string;
  timestamp: string;
  disruptionId: string;
  disruptionTitle: string;
  disruptionType: DisruptionType;
  chosenPlanId: string;
  chosenPlanName: string;
  strategy: RecoveryStrategy;
  action: 'approved' | 'rejected' | 'rolled_back';
  reason: string;
  authorizedBy: string;
  snapshotBefore: {
    tasks: Task[];
    projects: Project[];
  };
  snapshotAfter: {
    tasks: Task[];
    projects: Project[];
  };
}

export interface SystemSettings {
  businessHoursPerDay: number;
  workingDaysOfWeek: number[]; // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri
  overtimeCostMultiplier: number;
  dailyLatePenalty: number;
  riskWeights: {
    deadlineSlip: number;
    budgetDeviation: number;
    resourceStrain: number;
  };
}

export interface AppState {
  projects: Project[];
  tasks: Task[];
  staff: Staff[];
  resources: Resource[];
  disruptions: Disruption[];
  decisionLogs: DecisionLogEntry[];
  settings: SystemSettings;
  activeDisruptionId: string | null;
}
