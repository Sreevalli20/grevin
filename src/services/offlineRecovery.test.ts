/**
 * Offline Recovery Workflow Tests
 * Tests for IndexedDB persistence, extraction queue, and recovery logic
 */

import { indexedDB, ExtractionJobState } from './indexedDB';
import { extractionQueue } from './extractionQueue';
import { aiExtraction } from './aiExtraction';

export interface OfflineTestResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export async function runOfflineRecoveryTests(): Promise<OfflineTestResult[]> {
  const results: OfflineTestResult[] = [];

  async function test(name: string, fn: () => Promise<void>) {
    const start = performance.now();
    try {
      await fn();
      results.push({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name,
        passed: true,
        durationMs: Math.round((performance.now() - start) * 100) / 100,
      });
    } catch (err: unknown) {
      results.push({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Math.round((performance.now() - start) * 100) / 100,
      });
    }
  }

  // TEST 1: IndexedDB Initialization
  await test('IndexedDB Initialization', async () => {
    await indexedDB.init();
    // If we got here without error, initialization succeeded
  });

  // TEST 2: Task Persistence
  await test('Task Persistence Before AI Processing', async () => {
    const task = {
      id: 'test-task-1',
      projectId: 'test-project',
      code: 'TST-001',
      title: 'Test Task',
      description: 'Test description',
      priority: 'medium' as const,
      durationDays: 3,
      startDate: '2026-10-12',
      endDate: '2026-10-15',
      dependencies: [],
      assignedStaffIds: [],
      requiredResources: [],
      status: 'not_started' as const,
      costEstimate: 1000,
      extractionSource: 'manual' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: 1,
    };

    await indexedDB.saveTask(task);
    const retrieved = await indexedDB.getTask('test-task-1');

    if (!retrieved) {
      throw new Error('Task was not persisted to IndexedDB');
    }
    if (retrieved.title !== task.title) {
      throw new Error('Retrieved task title does not match');
    }
  });

  // TEST 3: Extraction Job Creation
  await test('Extraction Job Creation', async () => {
    const job = await extractionQueue.addJob('test-task-1', 'Create a critical task for testing', 'test-project');

    if (!job.id) {
      throw new Error('Job ID was not generated');
    }
    if (job.state !== 'pending') {
      throw new Error(`Expected pending state, got ${job.state}`);
    }
    if (!job.originalInput) {
      throw new Error('Original input was not saved');
    }
  });

  // TEST 4: Local Fallback Extraction
  await test('Local Fallback Extraction', async () => {
    const result = await aiExtraction.extractTask('Create a critical task for ASIC testing, 5 days, due by Oct 20');

    if (!result.success) {
      throw new Error('Extraction failed');
    }
    if (!result.data) {
      throw new Error('No data returned from extraction');
    }
    if (result.source !== 'local_fallback') {
      throw new Error(`Expected local_fallback source, got ${result.source}`);
    }
  });

  // TEST 5: Extraction Job State Updates
  await test('Extraction Job State Updates', async () => {
    const job = await extractionQueue.addJob('test-task-2', 'Another test task', 'test-project');
    await extractionQueue.updateJobState(job, 'queued', 'Job queued for processing');

    const updated = await indexedDB.getExtractionJob(job.id);
    if (!updated) {
      throw new Error('Job was not updated');
    }
    if (updated.state !== 'queued') {
      throw new Error(`Expected queued state, got ${updated.state}`);
    }
    if (updated.recoveryEvents.length === 0) {
      throw new Error('Recovery event was not logged');
    }
  });

  // TEST 6: Retry Scheduling
  await test('Retry Scheduling with Backoff', async () => {
    const job = await extractionQueue.addJob('test-task-3', 'Task for retry test', 'test-project');
    await extractionQueue.scheduleRetry(job, 'Simulated network error');

    const updated = await indexedDB.getExtractionJob(job.id);
    if (!updated) {
      throw new Error('Job was not updated');
    }
    if (updated.state !== 'retry_scheduled') {
      throw new Error(`Expected retry_scheduled state, got ${updated.state}`);
    }
    if (!updated.nextRetryTime) {
      throw new Error('Next retry time was not set');
    }
    if (updated.retryCount !== 1) {
      throw new Error(`Expected retry count of 1, got ${updated.retryCount}`);
    }
  });

  // TEST 7: Task Retrieval After Refresh
  await test('Task Retrieval After Refresh', async () => {
    // Simulate app restart by re-initializing
    await indexedDB.init();

    const task = await indexedDB.getTask('test-task-1');
    if (!task) {
      throw new Error('Task was not recovered after "refresh"');
    }
  });

  // TEST 8: Job Retrieval After Refresh
  await test('Job Retrieval After Refresh', async () => {
    const jobs = await indexedDB.getAllExtractionJobs();
    if (jobs.length === 0) {
      throw new Error('No jobs were recovered after "refresh"');
    }
  });

  // Cleanup
  try {
    await indexedDB.deleteTask('test-task-1');
    await indexedDB.deleteTask('test-task-2');
    await indexedDB.deleteTask('test-task-3');
    const allJobs = await indexedDB.getAllExtractionJobs();
    for (const job of allJobs) {
      await indexedDB.deleteExtractionJob(job.id);
    }
  } catch (err) {
    console.warn('Cleanup failed:', err);
  }

  return results;
}
