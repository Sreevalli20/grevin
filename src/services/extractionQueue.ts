/**
 * Extraction Queue Service
 * Manages durable queue for AI task extraction with retry logic and backoff
 */

import { indexedDB, ExtractionJob, ExtractionJobState, RecoveryEvent } from './indexedDB';

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 60000; // 1 minute

class ExtractionQueueService {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateRetryDelay(retryCount: number): number {
    const exponentialDelay = Math.min(
      BASE_RETRY_DELAY_MS * Math.pow(2, retryCount),
      MAX_RETRY_DELAY_MS
    );
    // Add jitter: ±25% random variation
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Add a new extraction job to the queue
   */
  async addJob(
    taskId: string,
    originalInput: string,
    projectId?: string
  ): Promise<ExtractionJob> {
    const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const job: ExtractionJob = {
      id: `job-${operationId}`,
      taskId,
      operationId,
      originalInput,
      state: 'pending',
      retryCount: 0,
      processingTimestamps: {
        created: now,
      },
      revision: 1,
      recoveryEvents: [],
    };

    await indexedDB.addExtractionJob(job);
    return job;
  }

  /**
   * Update job state and log recovery event
   */
  async updateJobState(
    job: ExtractionJob,
    newState: ExtractionJobState,
    outcome: string,
    error?: string
  ): Promise<void> {
    const previousState = job.state;
    job.state = newState;
    job.revision += 1;

    const event: RecoveryEvent = {
      timestamp: new Date().toISOString(),
      previousState,
      newState,
      retryAttempt: job.retryCount,
      outcome,
      error,
    };

    job.recoveryEvents.push(event);

    if (newState === 'retry_scheduled') {
      job.nextRetryTime = new Date(
        Date.now() + this.calculateRetryDelay(job.retryCount)
      ).toISOString();
      job.processingTimestamps.lastRetry = job.nextRetryTime;
    } else if (newState === 'completed') {
      job.processingTimestamps.completed = new Date().toISOString();
    } else if (newState === 'processing') {
      job.processingTimestamps.processingStarted = new Date().toISOString();
    } else if (newState === 'queued') {
      job.processingTimestamps.queued = new Date().toISOString();
    }

    await indexedDB.updateExtractionJob(job);
  }

  /**
   * Mark job for retry with backoff
   */
  async scheduleRetry(job: ExtractionJob, error: string): Promise<void> {
    if (job.retryCount >= MAX_RETRIES) {
      await this.updateJobState(job, 'failed', 'Max retries exceeded', error);
      return;
    }

    job.retryCount += 1;
    await this.updateJobState(job, 'retry_scheduled', 'Scheduled for retry', error);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await indexedDB.getExtractionJob(jobId);
    if (!job) return;

    await this.updateJobState(job, 'cancelled', 'Job cancelled by user');
  }

  /**
   * Manually retry a failed job
   */
  async manualRetry(jobId: string): Promise<void> {
    const job = await indexedDB.getExtractionJob(jobId);
    if (!job) return;

    job.retryCount = 0;
    job.lastError = undefined;
    await this.updateJobState(job, 'pending', 'Manual retry initiated');
  }

  /**
   * Process pending and retry-eligible jobs
   * This should be called periodically or when connectivity changes
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingJobs = await indexedDB.getPendingJobs();
      const retryJobs = await indexedDB.getRetryEligibleJobs();
      const jobsToProcess = [...pendingJobs, ...retryJobs];

      for (const job of jobsToProcess) {
        await this.updateJobState(job, 'queued', 'Job queued for processing');

        // Call the AI extraction service
        // This will be implemented in the AI service layer
        // For now, we'll mark it as processing
        await this.updateJobState(job, 'processing', 'Processing started');

        // TODO: Integrate with actual AI extraction service
        // const result = await aiService.extractTask(job.originalInput);
        // await this.handleExtractionResult(job, result);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle extraction result from AI service
   */
  async handleExtractionResult(
    job: ExtractionJob,
    result: { success: boolean; data?: any; error?: string }
  ): Promise<void> {
    if (result.success && result.data) {
      job.extractedFields = result.data;
      await this.updateJobState(job, 'completed', 'Extraction successful');
    } else {
      await this.scheduleRetry(job, result.error || 'Unknown error');
    }
  }

  /**
   * Start automatic queue processing
   */
  startProcessing(intervalMs: number = 30000): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, intervalMs);

    // Process immediately on start
    this.processQueue();
  }

  /**
   * Stop automatic queue processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    queued: number;
    processing: number;
    retryScheduled: number;
    needsReview: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const allJobs = await indexedDB.getAllExtractionJobs();

    const stats = {
      pending: 0,
      queued: 0,
      processing: 0,
      retryScheduled: 0,
      needsReview: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const job of allJobs) {
      stats[job.state as keyof typeof stats]++;
    }

    return stats;
  }
}

export const extractionQueue = new ExtractionQueueService();
