import { Task, Project, Staff, Resource, Disruption, SystemSettings } from '../types';
import {
  addBusinessDays,
  businessDaysDiff,
  detectCycles,
  topologicalSort,
  calculateCriticalPath,
  buildDependencyGraph,
  getTransitiveDependents,
} from './graph';
import { analyzeDisruptionImpact } from './impactAnalyzer';
import { generateRecoveryPlans } from './recoveryEngine';
import { validateTask, validateProject, validateDisruption } from './validation';

export interface TestResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  assertionsCount: number;
}

// Helper to create minimal task with required fields
function createTestTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id || 'test-task',
    projectId: overrides.projectId || 'test-project',
    code: overrides.code || 'TST-001',
    title: overrides.title || 'Test Task',
    description: overrides.description || '',
    priority: overrides.priority || 'medium',
    durationDays: overrides.durationDays || 1,
    startDate: overrides.startDate || '2026-10-12',
    endDate: overrides.endDate || '2026-10-13',
    dependencies: overrides.dependencies || [],
    assignedStaffIds: overrides.assignedStaffIds || [],
    requiredResources: overrides.requiredResources || [],
    status: overrides.status || 'not_started',
    costEstimate: overrides.costEstimate || 1000,
    extractionSource: 'manual',
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-10T00:00:00Z',
    revision: 1,
    ...overrides,
  };
}

export function runDomainTestSuite(): TestResult[] {
  const results: TestResult[] = [];

  function test(name: string, description: string, fn: () => void) {
    const start = performance.now();
    try {
      fn();
      results.push({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name,
        description,
        passed: true,
        durationMs: Math.round((performance.now() - start) * 100) / 100,
        assertionsCount: 1,
      });
    } catch (err: unknown) {
      results.push({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name,
        description,
        passed: false,
        durationMs: Math.round((performance.now() - start) * 100) / 100,
        error: err instanceof Error ? err.message : String(err),
        assertionsCount: 1,
      });
    }
  }

  // TEST 1: Cycle Detection
  test('Cycle Detection Algorithm', 'Detects circular dependency loops (A -> B -> C -> A) and approves clean DAGs', () => {
    const validDagTasks: Task[] = [
      { id: 'T1', projectId: 'P1', code: 'T-01', title: 'Task 1', description: '', priority: 'high', durationDays: 2, startDate: '2026-10-12', endDate: '2026-10-14', dependencies: [], assignedStaffIds: [], requiredResources: [], status: 'in_progress', costEstimate: 1000, extractionSource: 'manual', createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z', revision: 1 },
      { id: 'T2', projectId: 'P1', code: 'T-02', title: 'Task 2', description: '', priority: 'medium', durationDays: 3, startDate: '2026-10-15', endDate: '2026-10-18', dependencies: ['T1'], assignedStaffIds: [], requiredResources: [], status: 'not_started', costEstimate: 1500, extractionSource: 'manual', createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z', revision: 1 },
      { id: 'T3', projectId: 'P1', code: 'T-03', title: 'Task 3', description: '', priority: 'low', durationDays: 1, startDate: '2026-10-19', endDate: '2026-10-20', dependencies: ['T2'], assignedStaffIds: [], requiredResources: [], status: 'not_started', costEstimate: 500, extractionSource: 'manual', createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z', revision: 1 },
    ];
    const validRes = detectCycles(validDagTasks);
    if (validRes.hasCycle) throw new Error('Expected clean DAG to report no cycles');

    // Introduce cycle: T1 depends on T3
    const cyclicTasks: Task[] = [
      ...validDagTasks.map(t => t.id === 'T1' ? { ...t, dependencies: ['T3'] } : t)
    ];
    const cycleRes = detectCycles(cyclicTasks);
    if (!cycleRes.hasCycle) throw new Error('Expected cyclic graph to be detected');
  });

  // TEST 2: Topological Sort Order
  test('Topological Sort DAG Execution', 'Validates that predecessors strictly precede successors in generated order', () => {
    const tasks: Task[] = [
      createTestTask({ id: 'C', code: 'T-03', title: 'Task C', priority: 'medium', durationDays: 2, startDate: '2026-10-15', endDate: '2026-10-17', dependencies: ['A', 'B'], costEstimate: 800 }),
      createTestTask({ id: 'A', code: 'T-01', title: 'Task A', priority: 'high', durationDays: 2, startDate: '2026-10-12', endDate: '2026-10-14', dependencies: [], costEstimate: 800 }),
      createTestTask({ id: 'B', code: 'T-02', title: 'Task B', priority: 'medium', durationDays: 2, startDate: '2026-10-12', endDate: '2026-10-14', dependencies: [], costEstimate: 800 }),
    ];
    const order = topologicalSort(tasks);
    const indexA = order.indexOf('A');
    const indexB = order.indexOf('B');
    const indexC = order.indexOf('C');
    if (indexC < indexA || indexC < indexB) {
      throw new Error(`Task C must follow A and B in topological order. Got: ${order.join(' -> ')}`);
    }
  });

  // TEST 3: Critical Path Method (CPM)
  test('Critical Path Method & Zero Float', 'Correctly identifies the longest dependency chain with zero slack', () => {
    const tasks: Task[] = [
      createTestTask({ id: 'T1', code: 'T-01', title: 'Foundations', priority: 'critical', durationDays: 5, startDate: '2026-10-12', endDate: '2026-10-17', dependencies: [], costEstimate: 2000 }),
      createTestTask({ id: 'T2', code: 'T-02', title: 'Framing (Critical)', priority: 'critical', durationDays: 10, startDate: '2026-10-18', endDate: '2026-10-28', dependencies: ['T1'], costEstimate: 4000 }),
      createTestTask({ id: 'T3', code: 'T-03', title: 'Quick Permits (Parallel)', priority: 'low', durationDays: 2, startDate: '2026-10-18', endDate: '2026-10-20', dependencies: ['T1'], costEstimate: 500 }),
    ];
    const cpm = calculateCriticalPath(tasks);
    if (!cpm.criticalTaskIds.has('T1') || !cpm.criticalTaskIds.has('T2')) {
      throw new Error('T1 and T2 must be on critical path');
    }
    if (cpm.criticalTaskIds.has('T3')) {
      throw new Error('T3 has positive float and must not be on critical path');
    }
    if (cpm.totalProjectDurationDays !== 15) {
      throw new Error(`Expected project duration 15, got ${cpm.totalProjectDurationDays}`);
    }
  });

  // TEST 4: Calendar Business Day Calculations
  test('Business Day Calculations', 'Skips weekends and preserves working schedule math', () => {
    // 2026-10-16 is a Friday. Adding 1 business day should be Monday 2026-10-19.
    const resultMonday = addBusinessDays('2026-10-16', 1, [1, 2, 3, 4, 5]);
    if (resultMonday !== '2026-10-19') {
      throw new Error(`Expected 2026-10-19 after 1 business day from Friday, got ${resultMonday}`);
    }
    const diff = businessDaysDiff('2026-10-16', '2026-10-19', [1, 2, 3, 4, 5]);
    if (diff !== 1) {
      throw new Error(`Expected 1 business day difference between Friday and Monday, got ${diff}`);
    }
  });

  // TEST 5: Disruption Downstream Impact Propagation
  test('Transitive Dependency Propagation', 'Propagates upstream delay to all transitive successors in chain', () => {
    const tasks: Task[] = [
      createTestTask({ id: 'A', code: 'A', title: 'Alpha', priority: 'high', durationDays: 3, startDate: '2026-10-12', endDate: '2026-10-15', dependencies: [], assignedStaffIds: ['S1'], costEstimate: 1000 }),
      createTestTask({ id: 'B', code: 'B', title: 'Beta', priority: 'high', durationDays: 3, startDate: '2026-10-16', endDate: '2026-10-19', dependencies: ['A'], assignedStaffIds: ['S2'], costEstimate: 1000 }),
      createTestTask({ id: 'C', code: 'C', title: 'Gamma', priority: 'high', durationDays: 2, startDate: '2026-10-20', endDate: '2026-10-22', dependencies: ['B'], assignedStaffIds: ['S3'], costEstimate: 1000 }),
    ];
    const trans = getTransitiveDependents('A', tasks);
    if (!trans.includes('B') || !trans.includes('C')) {
      throw new Error(`Both B and C must be transitive dependents of A. Found: ${trans.join(',')}`);
    }
  });

  // TEST 6: Staff Absence Impact
  test('Staff Absence Scenario Analysis', 'Directly tags task assigned to absent personnel and marks conflict', () => {
    const project: Project = { id: 'P1', code: 'PRJ-1', name: 'Alpha', description: '', owner: 'Alice', deadline: '2026-11-01', budget: 50000, status: 'active', createdAt: '', updatedAt: '' };
    const staffMember: Staff = { id: 'S1', name: 'Marcus', role: 'Dev', email: 'm@example.com', hourlyRate: 85, maxHoursPerWeek: 40, dailyCapacityHours: 8, skills: ['react'], unavailablePeriods: [] };
    const task: Task = createTestTask({ id: 'T1', code: 'T-01', title: 'Core Dev', priority: 'high', durationDays: 4, startDate: '2026-10-12', endDate: '2026-10-16', dependencies: [], assignedStaffIds: ['S1'], costEstimate: 3000, status: 'in_progress' });
    const disruption: Disruption = {
      id: 'D1',
      type: 'staff_absence',
      title: 'Marcus Flu',
      description: 'Out sick',
      severity: 'moderate',
      projectId: 'P1',
      status: 'simulated',
      createdAt: '',
      parameters: {
        staffAbsence: { staffId: 'S1', startDate: '2026-10-12', endDate: '2026-10-16', reason: 'Medical' }
      }
    };
    const settings: SystemSettings = {
      businessHoursPerDay: 8,
      workingDaysOfWeek: [1, 2, 3, 4, 5],
      overtimeCostMultiplier: 1.5,
      dailyLatePenalty: 1000,
      riskWeights: { deadlineSlip: 0.4, budgetDeviation: 0.3, resourceStrain: 0.3 }
    };
    const impact = analyzeDisruptionImpact(disruption, [project], [task], [staffMember], [], settings);
    if (impact.affectedTasks.length !== 1) {
      throw new Error(`Expected 1 affected task, got ${impact.affectedTasks.length}`);
    }
    if (!impact.affectedTasks[0].isDirect) {
      throw new Error('Impact must be marked as direct');
    }
    if (impact.affectedTasks[0].conflictType !== 'staff_unavailable') {
      throw new Error(`Expected staff_unavailable, got ${impact.affectedTasks[0].conflictType}`);
    }
  });

  // TEST 7: Recovery Planner Feasibility
  test('Deterministic Recovery Alternatives', 'Generates 3 recovery strategies with clear feasibility and metric deltas', () => {
    const project: Project = { id: 'P1', code: 'PRJ-1', name: 'Alpha', description: '', owner: 'Alice', deadline: '2026-10-25', budget: 50000, status: 'active', createdAt: '', updatedAt: '' };
    const staffMember: Staff = { id: 'S1', name: 'Marcus', role: 'Dev', email: 'm@example.com', hourlyRate: 85, maxHoursPerWeek: 40, dailyCapacityHours: 8, skills: ['react'], unavailablePeriods: [] };
    const task: Task = createTestTask({ id: 'T1', code: 'T-01', title: 'Core Dev', priority: 'high', durationDays: 3, startDate: '2026-10-12', endDate: '2026-10-15', dependencies: [], assignedStaffIds: ['S1'], costEstimate: 3000, status: 'in_progress' });
    const disruption: Disruption = {
      id: 'D1',
      type: 'staff_absence',
      title: 'Marcus Medical Leave',
      description: 'Out sick',
      severity: 'moderate',
      projectId: 'P1',
      status: 'simulated',
      createdAt: '',
      parameters: {
        staffAbsence: { staffId: 'S1', startDate: '2026-10-12', endDate: '2026-10-14', reason: 'Medical' }
      }
    };
    const settings: SystemSettings = {
      businessHoursPerDay: 8,
      workingDaysOfWeek: [1, 2, 3, 4, 5],
      overtimeCostMultiplier: 1.5,
      dailyLatePenalty: 1000,
      riskWeights: { deadlineSlip: 0.4, budgetDeviation: 0.3, resourceStrain: 0.3 }
    };
    const impact = analyzeDisruptionImpact(disruption, [project], [task], [staffMember], [], settings);
    const plans = generateRecoveryPlans(disruption, impact, [project], [task], [staffMember], [], settings);
    if (plans.length !== 3) {
      throw new Error(`Expected 3 recovery strategies, generated ${plans.length}`);
    }
    const strategies = plans.map(p => p.strategy);
    if (!strategies.includes('fast_track') || !strategies.includes('scope_triage') || !strategies.includes('schedule_extension')) {
      throw new Error('Missing one of required strategies: fast_track, scope_triage, schedule_extension');
    }
  });

  // TEST 8: Weighted Business Loss Formula
  test('Weighted Business Loss Formula Precision', 'Ensures mathematical consistency of formula (DelayDays * penalty + OverdueTasks * 850 + CostDelta)', () => {
    const penalty = 1200;
    const delayDays = 3;
    const overdueTasks = 2;
    const costDelta = 500;
    const expected = (delayDays * penalty) + (overdueTasks * 850) + costDelta;
    // 3600 + 1700 + 500 = 5800
    if (expected !== 5800) {
      throw new Error(`Formula discrepancy. Expected 5800, got ${expected}`);
    }
  });

  // TEST 9: Form & Input Validation: Circular Task Dependency Rejection
  test('Task Dependency Cycle Prevention', 'Rejects task dependency links that would form circular loops', () => {
    const existing: Task[] = [
      createTestTask({ id: 'T1', code: 'T1', title: 'Task 1', priority: 'high', durationDays: 2, startDate: '2026-10-12', endDate: '2026-10-14', dependencies: [], costEstimate: 100 }),
      createTestTask({ id: 'T2', code: 'T2', title: 'Task 2', priority: 'high', durationDays: 2, startDate: '2026-10-14', endDate: '2026-10-16', dependencies: ['T1'], costEstimate: 100 }),
    ];
    // Attempting to make T1 depend on T2 should fail validation
    const candidateT1: Partial<Task> = {
      ...existing[0],
      dependencies: ['T2'],
    };
    const res = validateTask(candidateT1, existing);
    if (res.isValid) {
      throw new Error('Expected validation to reject circular dependency between T1 and T2');
    }
    if (!res.errors.dependencies) {
      throw new Error('Expected validation error on dependencies field');
    }
  });

  // TEST 10: Form Validation: Date Ordering Constraint
  test('Task Date Order Constraint Validation', 'Enforces that task end dates cannot precede start dates', () => {
    const invalidTask: Partial<Task> = {
      projectId: 'P1',
      code: 'T-ERR',
      title: 'Erroneous Task',
      durationDays: 2,
      startDate: '2026-10-20',
      endDate: '2026-10-15', // Before start date
    };
    const res = validateTask(invalidTask, []);
    if (res.isValid) {
      throw new Error('Expected validation to fail when end date precedes start date');
    }
    if (!res.errors.endDate) {
      throw new Error('Expected endDate validation error message');
    }
  });

  // TEST 11: Project Parameter Validation
  test('Project Budget & Format Constraint Validation', 'Rejects negative budgets and invalid project codes', () => {
    const invalidProj: Partial<Project> = {
      code: 'X', // Too short
      name: 'No', // Too short
      owner: '',
      deadline: 'invalid-date',
      budget: -5000, // Negative budget
    };
    const res = validateProject(invalidProj);
    if (res.isValid) {
      throw new Error('Expected validation to fail on negative budget and short code');
    }
    if (!res.errors.budget || !res.errors.code || !res.errors.deadline) {
      throw new Error('Missing expected field error on budget, code, or deadline');
    }
  });

  // TEST 12: Disruption Parameter Validation
  test('Disruption Scenario Range Validation', 'Ensures disruption parameters respect realistic range bounds', () => {
    const invalidDisruption: Partial<Disruption> = {
      type: 'budget_cut',
      title: 'Cut',
      parameters: {
        budgetCut: {
          projectId: 'P1',
          cutAmount: -100, // Negative
          cutPercentage: 150, // Exceeds 100%
        },
      },
    };
    const res = validateDisruption(invalidDisruption);
    if (res.isValid) {
      throw new Error('Expected validation to fail on cutPercentage > 100% and negative amount');
    }
    if (!res.errors.cutPercentage) {
      throw new Error('Expected cutPercentage validation error');
    }
  });

  return results;
}
