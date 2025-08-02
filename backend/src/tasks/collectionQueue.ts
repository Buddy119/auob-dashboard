import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { runCollectionTask, cleanupTempFiles } from '../utils/newmanRunner';

const queueName = 'collectionQueue';

// Redis connection configuration for BullMQ
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
};

// Create BullMQ Queue
export const collectionQueue = new Queue(queueName, { 
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep only 10 completed jobs
    removeOnFail: 20,     // Keep only 20 failed jobs
    attempts: 3,          // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  }
});

// Create BullMQ Worker
export const worker = new Worker(
  queueName, 
  async (job: Job) => {
    const { configName, priority = 'normal' } = job.data;
    const startTime = Date.now();
    
    console.log(`🔄 Processing job ${job.id} for config: ${configName} (Priority: ${priority})`);
    
    try {
      // Update job progress
      await job.updateProgress(10);
      
      // Run the collection task
      const result = await runCollectionTask(configName);
      
      // Update job progress
      await job.updateProgress(90);
      
      // Clean up temporary files
      cleanupTempFiles(configName);
      
      // Update job progress to completion
      await job.updateProgress(100);
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ Job ${job.id} completed in ${executionTime}ms`);
      
      return {
        ...result,
        executionTime,
        jobId: job.id
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Job ${job.id} failed after ${executionTime}ms:`, error);
      
      // Clean up temporary files even on failure
      cleanupTempFiles(configName);
      
      throw error;
    }
  }, 
  { 
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
    stalledInterval: 30000 // 30 seconds
  }
);

// Create Queue Events listener for monitoring
export const queueEvents = new QueueEvents(queueName, { connection: redisConnection });

// Worker event handlers
worker.on('ready', () => {
  console.log('🚀 Collection queue worker is ready');
});

worker.on('active', (job: Job) => {
  console.log(`🔄 Job ${job.id} started processing`);
});

worker.on('completed', (job: Job, result: any) => {
  console.log(`✅ Job ${job.id} completed successfully`);
  console.log(`   - Config: ${result.configName}`);
  console.log(`   - Execution time: ${result.executionTime}ms`);
  console.log(`   - Success: ${result.success}`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
  if (job) {
    console.error(`   - Config: ${job.data.configName}`);
    console.error(`   - Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
  }
});

worker.on('stalled', (jobId: string) => {
  console.warn(`⚠️  Job ${jobId} stalled`);
});

worker.on('progress', (job: Job, progress: any) => {
  console.log(`📊 Job ${job.id} progress: ${progress}%`);
});

// Queue Events handlers
queueEvents.on('added', ({ jobId, name }) => {
  console.log(`📋 Job ${jobId} (${name}) added to queue`);
});

queueEvents.on('waiting', ({ jobId }) => {
  console.log(`⏳ Job ${jobId} is waiting`);
});

queueEvents.on('delayed', ({ jobId, delay }) => {
  console.log(`⏰ Job ${jobId} delayed by ${delay}ms`);
});

// Error handling
worker.on('error', (error) => {
  console.error('🚨 Worker error:', error);
});

queueEvents.on('error', (error) => {
  console.error('🚨 Queue events error:', error);
});

// Graceful shutdown handler
export const shutdownQueue = async (): Promise<void> => {
  console.log('🛑 Shutting down collection queue...');
  
  try {
    await worker.close();
    await collectionQueue.close();
    await queueEvents.close();
    console.log('✅ Collection queue shut down gracefully');
  } catch (error) {
    console.error('❌ Error shutting down collection queue:', error);
  }
};

// Queue management utilities
export const getQueueStats = async () => {
  const waiting = await collectionQueue.getWaiting();
  const active = await collectionQueue.getActive();
  const completed = await collectionQueue.getCompleted();
  const failed = await collectionQueue.getFailed();
  const delayed = await collectionQueue.getDelayed();
  
  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    total: waiting.length + active.length + completed.length + failed.length + delayed.length
  };
};

export const clearQueue = async (status: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed' = 'completed') => {
  try {
    // Map 'waiting' to 'wait' for BullMQ API compatibility
    const bullmqStatus = status === 'waiting' ? 'wait' : status;
    const count = await collectionQueue.clean(0, 100, bullmqStatus as 'completed' | 'failed' | 'active' | 'wait' | 'delayed');
    console.log(`🗑️  Cleared ${count} ${status} jobs from queue`);
    return count;
  } catch (error) {
    console.error(`❌ Error clearing ${status} jobs:`, error);
    throw error;
  }
};

export const pauseQueue = async () => {
  await collectionQueue.pause();
  console.log('⏸️  Queue paused');
};

export const resumeQueue = async () => {
  await collectionQueue.resume();
  console.log('▶️  Queue resumed');
};

export default {
  collectionQueue,
  worker,
  queueEvents,
  shutdownQueue,
  getQueueStats,
  clearQueue,
  pauseQueue,
  resumeQueue
};