/**
 * IndexedDB Storage Service for Durable Task Persistence
 * Provides offline-first storage for tasks and extraction queue
 */

const DB_NAME = 'PivotOS_DB';
const DB_VERSION = 1;

const STORES = {
  TASKS: 'tasks',
  EXTRACTION_QUEUE: 'extraction_queue',
  RECOVERY_LOG: 'recovery_log',
} as const;

export type ExtractionJobState =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'retry_scheduled'
  | 'needs_review'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExtractionJob {
  id: string;
  taskId: string;
  operationId: string;
  originalInput: string;
  extractedFields?: {
    title?: string;
    description?: string;
    deadline?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    estimatedEffort?: number;
    dependencies?: string[];
    tags?: string[];
    projectId?: string;
  };
  currentUserEdits?: any;
  state: ExtractionJobState;
  retryCount: number;
  nextRetryTime?: string;
  lastError?: string;
  processingTimestamps: {
    created: string;
    queued?: string;
    processingStarted?: string;
    completed?: string;
    lastRetry?: string;
  };
  revision: number;
  recoveryEvents: RecoveryEvent[];
}

export interface RecoveryEvent {
  timestamp: string;
  previousState: ExtractionJobState;
  newState: ExtractionJobState;
  retryAttempt?: number;
  outcome: string;
  error?: string;
}

export interface StoredTask {
  id: string;
  projectId: string;
  code: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  durationDays: number;
  startDate: string;
  endDate: string;
  dependencies: string[];
  assignedStaffIds: string[];
  requiredResources: any[];
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  costEstimate: number;
  extractionSource: 'manual' | 'ai_extracted' | 'local_fallback';
  extractionJobId?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Tasks store
        if (!db.objectStoreNames.contains(STORES.TASKS)) {
          const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
          taskStore.createIndex('projectId', 'projectId', { unique: false });
          taskStore.createIndex('createdAt', 'createdAt', { unique: false });
          taskStore.createIndex('extractionJobId', 'extractionJobId', { unique: false });
        }

        // Extraction queue store
        if (!db.objectStoreNames.contains(STORES.EXTRACTION_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.EXTRACTION_QUEUE, { keyPath: 'id' });
          queueStore.createIndex('taskId', 'taskId', { unique: false });
          queueStore.createIndex('state', 'state', { unique: false });
          queueStore.createIndex('nextRetryTime', 'nextRetryTime', { unique: false });
        }

        // Recovery log store
        if (!db.objectStoreNames.contains(STORES.RECOVERY_LOG)) {
          const logStore = db.createObjectStore(STORES.RECOVERY_LOG, { keyPath: 'id' });
          logStore.createIndex('taskId', 'taskId', { unique: false });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) await this.init();
    const transaction = this.db!.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Task Operations
  async saveTask(task: StoredTask): Promise<void> {
    const store = await this.getStore(STORES.TASKS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(task);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save task'));
    });
  }

  async getTask(taskId: string): Promise<StoredTask | null> {
    const store = await this.getStore(STORES.TASKS);
    return new Promise((resolve, reject) => {
      const request = store.get(taskId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get task'));
    });
  }

  async getAllTasks(): Promise<StoredTask[]> {
    const store = await this.getStore(STORES.TASKS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get all tasks'));
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    const store = await this.getStore(STORES.TASKS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(taskId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete task'));
    });
  }

  // Extraction Queue Operations
  async addExtractionJob(job: ExtractionJob): Promise<void> {
    const store = await this.getStore(STORES.EXTRACTION_QUEUE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(job);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to add extraction job'));
    });
  }

  async updateExtractionJob(job: ExtractionJob): Promise<void> {
    const store = await this.getStore(STORES.EXTRACTION_QUEUE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(job);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to update extraction job'));
    });
  }

  async getExtractionJob(jobId: string): Promise<ExtractionJob | null> {
    const store = await this.getStore(STORES.EXTRACTION_QUEUE);
    return new Promise((resolve, reject) => {
      const request = store.get(jobId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get extraction job'));
    });
  }

  async getPendingJobs(): Promise<ExtractionJob[]> {
    const store = await this.getStore(STORES.EXTRACTION_QUEUE);
    const index = store.index('state');
    return new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get pending jobs'));
    });
  }

  async getRetryEligibleJobs(): Promise<ExtractionJob[]> {
    const store = await this.getStore(STORES.EXTRACTION_QUEUE);
    const index = store.index('state');
    return new Promise((resolve, reject) => {
      const request = index.getAll('retry_scheduled');
      request.onsuccess = () => {
        const now = new Date().toISOString();
        const eligible = (request.result || []).filter(
          (job) => job.nextRetryTime && job.nextRetryTime <= now
        );
        resolve(eligible);
      };
      request.onerror = () => reject(new Error('Failed to get retry eligible jobs'));
    });
  }

  async getAllExtractionJobs(): Promise<ExtractionJob[]> {
    const store = await this.getStore(STORES.EXTRACTION_QUEUE);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get all extraction jobs'));
    });
  }

  async deleteExtractionJob(jobId: string): Promise<void> {
    const store = await this.getStore(STORES.EXTRACTION_QUEUE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(jobId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete extraction job'));
    });
  }

  // Recovery Log Operations
  async addRecoveryEvent(event: any): Promise<void> {
    const store = await this.getStore(STORES.RECOVERY_LOG, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(event);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to add recovery event'));
    });
  }

  async getRecoveryEvents(taskId?: string): Promise<any[]> {
    const store = await this.getStore(STORES.RECOVERY_LOG);
    if (taskId) {
      const index = store.index('taskId');
      return new Promise((resolve, reject) => {
        const request = index.getAll(taskId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error('Failed to get recovery events'));
      });
    } else {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error('Failed to get all recovery events'));
      });
    }
  }

  async clearAll(): Promise<void> {
    const stores = Object.values(STORES);
    for (const storeName of stores) {
      const store = await this.getStore(storeName, 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
      });
    }
  }
}

export const indexedDB = new IndexedDBService();
