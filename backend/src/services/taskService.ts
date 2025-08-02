import { collectionQueue, getQueueStats, clearQueue, pauseQueue, resumeQueue } from '../tasks/collectionQueue';
import { JobsOptions } from 'bullmq';

export interface ScheduleOptions {
  delay?: number;              // Delay in milliseconds
  priority?: number;           // Job priority (higher number = higher priority)
  attempts?: number;           // Number of retry attempts
  backoff?: {                  // Backoff strategy for retries
    type: 'fixed' | 'exponential';
    delay: number;
  };
  repeat?: {                   // Recurring job options
    pattern?: string;          // Cron pattern
    every?: number;            // Repeat every X milliseconds
    limit?: number;            // Maximum repetitions
  };
  removeOnComplete?: number;   // Number of completed jobs to keep
  removeOnFail?: number;       // Number of failed jobs to keep
}

/**
 * Schedule a collection run
 */
export const scheduleCollectionRun = async (
  configName: string, 
  options: ScheduleOptions = {}
): Promise<string> => {
  try {
    const jobOptions: JobsOptions = {
      delay: options.delay || 0,
      priority: options.priority || 0,
      attempts: options.attempts || 3,
      backoff: options.backoff || {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: options.removeOnComplete || 10,
      removeOnFail: options.removeOnFail || 20,
    };

    // Add repeat options if provided
    if (options.repeat) {
      jobOptions.repeat = options.repeat;
    }

    const job = await collectionQueue.add(
      'runCollection',
      { 
        configName,
        priority: options.priority || 0,
        scheduledAt: new Date().toISOString()
      },
      jobOptions
    );

    console.log(`📋 Scheduled collection run for '${configName}' with job ID: ${job.id}`);
    
    return job.id || 'unknown';
  } catch (error) {
    console.error(`❌ Failed to schedule collection run for '${configName}':`, error);
    throw error;
  }
};

/**
 * Schedule immediate collection run
 */
export const runCollectionNow = async (configName: string): Promise<string> => {
  return scheduleCollectionRun(configName, { delay: 0, priority: 10 });
};

/**
 * Schedule delayed collection run
 */
export const scheduleDelayedRun = async (
  configName: string, 
  delayMinutes: number
): Promise<string> => {
  const delayMs = delayMinutes * 60 * 1000;
  return scheduleCollectionRun(configName, { delay: delayMs });
};

/**
 * Schedule recurring collection run
 */
export const scheduleRecurringRun = async (
  configName: string,
  cronPattern: string,
  limit?: number
): Promise<string> => {
  return scheduleCollectionRun(configName, {
    repeat: {
      pattern: cronPattern,
      limit
    }
  });
};

/**
 * Cancel a scheduled job
 */
export const cancelJob = async (jobId: string): Promise<boolean> => {
  try {
    const job = await collectionQueue.getJob(jobId);
    
    if (!job) {
      console.warn(`⚠️  Job ${jobId} not found`);
      return false;
    }

    await job.remove();
    console.log(`🗑️  Cancelled job ${jobId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to cancel job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Get job details
 */
export const getJobDetails = async (jobId: string) => {
  try {
    const job = await collectionQueue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      delay: job.delay
    };
  } catch (error) {
    console.error(`❌ Failed to get job details for ${jobId}:`, error);
    throw error;
  }
};

/**
 * Get all jobs by status
 */
export const getJobsByStatus = async (status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed') => {
  try {
    let jobs;
    
    switch (status) {
      case 'waiting':
        jobs = await collectionQueue.getWaiting();
        break;
      case 'active':
        jobs = await collectionQueue.getActive();
        break;
      case 'completed':
        jobs = await collectionQueue.getCompleted();
        break;
      case 'failed':
        jobs = await collectionQueue.getFailed();
        break;
      case 'delayed':
        jobs = await collectionQueue.getDelayed();
        break;
      default:
        throw new Error(`Invalid status: ${status}`);
    }

    return jobs.map(job => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp
    }));
  } catch (error) {
    console.error(`❌ Failed to get ${status} jobs:`, error);
    throw error;
  }
};

/**
 * Retry a failed job
 */
export const retryJob = async (jobId: string): Promise<boolean> => {
  try {
    const job = await collectionQueue.getJob(jobId);
    
    if (!job) {
      console.warn(`⚠️  Job ${jobId} not found`);
      return false;
    }

    await job.retry();
    console.log(`🔄 Retrying job ${jobId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to retry job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Get queue statistics
 */
export const getTaskStats = async () => {
  try {
    const stats = await getQueueStats();
    return {
      ...stats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to get task stats:', error);
    throw error;
  }
};

/**
 * Clear jobs by status
 */
export const clearTasksByStatus = async (status: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed') => {
  try {
    const count = await clearQueue(status);
    return {
      cleared: count,
      status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Failed to clear ${status} tasks:`, error);
    throw error;
  }
};

/**
 * Pause task processing
 */
export const pauseTaskProcessing = async () => {
  try {
    await pauseQueue();
    return {
      status: 'paused',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to pause task processing:', error);
    throw error;
  }
};

/**
 * Resume task processing
 */
export const resumeTaskProcessing = async () => {
  try {
    await resumeQueue();
    return {
      status: 'resumed',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to resume task processing:', error);
    throw error;
  }
};

export default {
  scheduleCollectionRun,
  runCollectionNow,
  scheduleDelayedRun,
  scheduleRecurringRun,
  cancelJob,
  getJobDetails,
  getJobsByStatus,
  retryJob,
  getTaskStats,
  clearTasksByStatus,
  pauseTaskProcessing,
  resumeTaskProcessing
};