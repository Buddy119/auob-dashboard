import { Worker, Queue, QueueEvents } from 'bullmq';
import { connection } from '../config/redis';
import { calculateDailyAvailability } from '../utils/calculateAvailability';

const AVAILABILITY_QUEUE_NAME = 'availability-calculation';

// Redis connection configuration for BullMQ
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
};

// Create queue for availability calculation jobs
export const availabilityQueue = new Queue(AVAILABILITY_QUEUE_NAME, { 
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 5,      // Keep last 5 failed jobs
    attempts: 3,          // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Create worker to process availability calculation jobs
const availabilityWorker = new Worker(
  AVAILABILITY_QUEUE_NAME,
  async (job) => {
    console.log(`🔄 Processing availability calculation job: ${job.id}`);
    console.log(`📅 Job data:`, job.data);

    try {
      const { targetDate } = job.data;
      const calculationDate = targetDate ? new Date(targetDate) : new Date();
      
      console.log(`📊 Calculating availability for: ${calculationDate.toDateString()}`);
      
      await calculateDailyAvailability(calculationDate);
      
      console.log(`✅ Availability calculation completed for job: ${job.id}`);
      
      return {
        success: true,
        date: calculationDate.toISOString(),
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Availability calculation failed for job: ${job.id}`, error);
      throw error;
    }
  },
  { 
    connection: redisConnection,
    concurrency: 1, // Process one job at a time
    maxStalledCount: 1,
    stalledInterval: 30000
  }
);

// Create queue events listener for monitoring
const availabilityQueueEvents = new QueueEvents(AVAILABILITY_QUEUE_NAME, {
  connection: redisConnection
});

// Event listeners for monitoring
availabilityQueueEvents.on('completed', (jobId, result) => {
  console.log(`✅ Availability calculation job ${jobId} completed:`, result);
});

availabilityQueueEvents.on('failed', (jobId, error) => {
  console.error(`❌ Availability calculation job ${jobId} failed:`, error);
});

availabilityQueueEvents.on('stalled', (jobId) => {
  console.warn(`⚠️  Availability calculation job ${jobId} stalled`);
});

// Worker event listeners
availabilityWorker.on('completed', (job, result) => {
  console.log(`🎉 Availability worker completed job ${job.id}:`, result);
});

availabilityWorker.on('failed', (job, error) => {
  console.error(`💥 Availability worker failed job ${job?.id}:`, error);
});

availabilityWorker.on('error', (error) => {
  console.error('🚨 Availability worker error:', error);
});

/**
 * Schedule daily availability calculation at midnight (00:00) every day
 */
export const scheduleDailyAvailabilityCalculation = async (): Promise<void> => {
  try {
    console.log('📅 Scheduling daily availability calculation...');

    // Remove any existing recurring jobs to avoid duplicates
    const existingJobs = await availabilityQueue.getRepeatableJobs();
    for (const job of existingJobs) {
      if (job.name === 'daily-availability-calculation') {
        await availabilityQueue.removeRepeatableByKey(job.key);
        console.log('🗑️  Removed existing daily availability calculation job');
      }
    }

    // Schedule new daily job at midnight
    await availabilityQueue.add(
      'daily-availability-calculation',
      {
        description: 'Daily availability calculation at midnight',
        targetDate: null // Will use current date
      },
      {
        repeat: {
          pattern: '0 0 * * *', // Every day at midnight (00:00)
          tz: 'UTC'
        },
        jobId: 'daily-availability-calculation'
      }
    );

    console.log('✅ Daily availability calculation scheduled successfully (00:00 UTC)');
  } catch (error) {
    console.error('❌ Failed to schedule daily availability calculation:', error);
    throw error;
  }
};

/**
 * Schedule availability calculation for a specific date
 */
export const scheduleAvailabilityCalculation = async (targetDate: Date, delay?: number): Promise<string> => {
  try {
    const job = await availabilityQueue.add(
      'manual-availability-calculation',
      {
        description: `Manual availability calculation for ${targetDate.toDateString()}`,
        targetDate: targetDate.toISOString()
      },
      {
        delay: delay || 0,
        jobId: `availability-calc-${targetDate.toISOString().split('T')[0]}`
      }
    );

    console.log(`✅ Scheduled availability calculation for ${targetDate.toDateString()}, job ID: ${job.id}`);
    return job.id || '';
  } catch (error) {
    console.error('❌ Failed to schedule availability calculation:', error);
    throw error;
  }
};

/**
 * Run availability calculation immediately for current or specified date
 */
export const runAvailabilityCalculationNow = async (targetDate?: Date): Promise<string> => {
  try {
    const calculationDate = targetDate || new Date();
    const job = await availabilityQueue.add(
      'immediate-availability-calculation',
      {
        description: `Immediate availability calculation for ${calculationDate.toDateString()}`,
        targetDate: calculationDate.toISOString()
      },
      {
        priority: 10, // High priority
        jobId: `immediate-availability-calc-${Date.now()}`
      }
    );

    console.log(`🚀 Started immediate availability calculation for ${calculationDate.toDateString()}, job ID: ${job.id}`);
    return job.id || '';
  } catch (error) {
    console.error('❌ Failed to run immediate availability calculation:', error);
    throw error;
  }
};

/**
 * Get availability calculation job statistics
 */
export const getAvailabilityJobStats = async () => {
  try {
    const waiting = await availabilityQueue.getWaiting();
    const active = await availabilityQueue.getActive();
    const completed = await availabilityQueue.getCompleted();
    const failed = await availabilityQueue.getFailed();
    const repeatableJobs = await availabilityQueue.getRepeatableJobs();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      repeatable: repeatableJobs.length,
      repeatableJobs: repeatableJobs.map(job => ({
        name: job.name,
        pattern: job.pattern,
        next: job.next,
        tz: job.tz
      }))
    };
  } catch (error) {
    console.error('Error getting availability job stats:', error);
    throw error;
  }
};

/**
 * Cancel a specific availability calculation job
 */
export const cancelAvailabilityJob = async (jobId: string): Promise<boolean> => {
  try {
    const job = await availabilityQueue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`🗑️  Cancelled availability calculation job: ${jobId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error cancelling availability job:', error);
    throw error;
  }
};

/**
 * Clean up old availability calculation jobs
 */
export const cleanupAvailabilityJobs = async (): Promise<void> => {
  try {
    await availabilityQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // Clean completed jobs older than 24 hours
    await availabilityQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed');  // Clean failed jobs older than 7 days
    console.log('🧹 Cleaned up old availability calculation jobs');
  } catch (error) {
    console.error('Error cleaning up availability jobs:', error);
    throw error;
  }
};

/**
 * Graceful shutdown of availability task components
 */
export const shutdownAvailabilityTask = async (): Promise<void> => {
  try {
    console.log('🛑 Shutting down availability task components...');
    
    await availabilityWorker.close();
    await availabilityQueueEvents.close();
    // QueueScheduler is no longer needed in BullMQ v5+
    
    console.log('✅ Availability task components shut down successfully');
  } catch (error) {
    console.error('❌ Error shutting down availability task components:', error);
  }
};

export default {
  scheduleDailyAvailabilityCalculation,
  scheduleAvailabilityCalculation,
  runAvailabilityCalculationNow,
  getAvailabilityJobStats,
  cancelAvailabilityJob,
  cleanupAvailabilityJobs,
  shutdownAvailabilityTask,
  availabilityQueue
};