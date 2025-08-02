import { Worker, Queue, QueueEvents } from 'bullmq';
import { generateReport, generateReports, cleanupOldReports, ReportType } from '../utils/reportGenerator';

const REPORT_QUEUE_NAME = 'report-generation';

// Redis connection configuration for BullMQ
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
};

// Create queue for report generation jobs
export const reportQueue = new Queue(REPORT_QUEUE_NAME, { 
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 20, // Keep last 20 completed jobs
    removeOnFail: 10,     // Keep last 10 failed jobs
    attempts: 3,          // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Create worker to process report generation jobs
const reportWorker = new Worker(
  REPORT_QUEUE_NAME,
  async (job) => {
    console.log(`🔄 Processing report generation job: ${job.id}`);
    console.log(`📋 Job data:`, job.data);

    try {
      const { reportType, collectionId, format, customDateRange } = job.data;
      
      console.log(`📊 Generating ${reportType} report...`);
      
      const result = await generateReport({
        reportType,
        format: format || 'PDF',
        collectionId,
        customDateRange
      });
      
      console.log(`✅ Report generation completed for job: ${job.id}`);
      console.log(`📄 Generated report: ${result.filePath}`);
      
      return {
        success: true,
        reportId: result.reportId,
        filePath: result.filePath,
        reportType,
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Report generation failed for job: ${job.id}`, error);
      throw error;
    }
  },
  { 
    connection: redisConnection,
    concurrency: 2, // Process up to 2 reports concurrently
    maxStalledCount: 1,
    stalledInterval: 30000
  }
);

// Create queue events listener for monitoring
const reportQueueEvents = new QueueEvents(REPORT_QUEUE_NAME, {
  connection: redisConnection
});

// Event listeners for monitoring
reportQueueEvents.on('completed', (jobId, result) => {
  console.log(`✅ Report generation job ${jobId} completed:`, result);
});

reportQueueEvents.on('failed', (jobId, error) => {
  console.error(`❌ Report generation job ${jobId} failed:`, error);
});

reportQueueEvents.on('stalled', (jobId) => {
  console.warn(`⚠️  Report generation job ${jobId} stalled`);
});

// Worker event listeners
reportWorker.on('completed', (job, result) => {
  console.log(`🎉 Report worker completed job ${job.id}:`, result);
});

reportWorker.on('failed', (job, error) => {
  console.error(`💥 Report worker failed job ${job?.id}:`, error);
});

reportWorker.on('error', (error) => {
  console.error('🚨 Report worker error:', error);
});

/**
 * Schedule all automated reports (daily, weekly, monthly)
 */
export const scheduleAutomatedReports = async (): Promise<void> => {
  try {
    console.log('📅 Scheduling automated report generation...');

    // Remove any existing recurring jobs to avoid duplicates
    const existingJobs = await reportQueue.getRepeatableJobs();
    for (const job of existingJobs) {
      if (['daily-report', 'weekly-report', 'monthly-report', 'cleanup-reports'].includes(job.name)) {
        await reportQueue.removeRepeatableByKey(job.key);
        console.log(`🗑️  Removed existing ${job.name} job`);
      }
    }

    // Schedule Daily Reports - Every day at 00:30 UTC
    await reportQueue.add(
      'daily-report',
      {
        reportType: 'Daily' as ReportType,
        format: 'PDF',
        description: 'Automated daily availability report'
      },
      {
        repeat: {
          pattern: '30 0 * * *', // 00:30 every day
          tz: 'UTC'
        },
        jobId: 'automated-daily-report',
        priority: 10
      }
    );

    // Schedule Weekly Reports - Every Sunday at 01:00 UTC
    await reportQueue.add(
      'weekly-report',
      {
        reportType: 'Weekly' as ReportType,
        format: 'PDF',
        description: 'Automated weekly availability report'
      },
      {
        repeat: {
          pattern: '0 1 * * 0', // 01:00 every Sunday
          tz: 'UTC'
        },
        jobId: 'automated-weekly-report',
        priority: 8
      }
    );

    // Schedule Monthly Reports - 1st day of every month at 02:00 UTC
    await reportQueue.add(
      'monthly-report',
      {
        reportType: 'Monthly' as ReportType,
        format: 'PDF',
        description: 'Automated monthly availability report'
      },
      {
        repeat: {
          pattern: '0 2 1 * *', // 02:00 on 1st day of month
          tz: 'UTC'
        },
        jobId: 'automated-monthly-report',
        priority: 5
      }
    );

    // Schedule Report Cleanup - Every week at 03:00 UTC on Monday
    await reportQueue.add(
      'cleanup-reports',
      {
        description: 'Clean up old report files',
        daysToKeep: 30
      },
      {
        repeat: {
          pattern: '0 3 * * 1', // 03:00 every Monday
          tz: 'UTC'
        },
        jobId: 'automated-report-cleanup',
        priority: 3
      }
    );

    console.log('✅ Automated report generation scheduled successfully');
    console.log('📋 Scheduled jobs:');
    console.log('   - Daily reports: 00:30 UTC');
    console.log('   - Weekly reports: 01:00 UTC (Sundays)');
    console.log('   - Monthly reports: 02:00 UTC (1st of month)');
    console.log('   - Report cleanup: 03:00 UTC (Mondays)');

  } catch (error) {
    console.error('❌ Failed to schedule automated reports:', error);
    throw error;
  }
};

/**
 * Generate a manual report
 */
export const generateManualReport = async (
  reportType: ReportType,
  format: 'HTML' | 'PDF' = 'PDF',
  collectionId?: string,
  customDateRange?: { startDate: Date; endDate: Date }
): Promise<string> => {
  try {
    const job = await reportQueue.add(
      'manual-report',
      {
        reportType,
        format,
        collectionId,
        customDateRange,
        description: `Manual ${reportType} report generation`
      },
      {
        priority: 15, // Higher priority than automated reports
        jobId: `manual-${reportType.toLowerCase()}-${Date.now()}`
      }
    );

    console.log(`✅ Scheduled manual ${reportType} report generation, job ID: ${job.id}`);
    return job.id || '';
  } catch (error) {
    console.error('❌ Failed to schedule manual report generation:', error);
    throw error;
  }
};

/**
 * Generate reports in both HTML and PDF formats
 */
export const generateMultiFormatReport = async (
  reportType: ReportType,
  collectionId?: string
): Promise<string[]> => {
  try {
    const jobs = await Promise.all([
      reportQueue.add(
        'multi-format-html',
        {
          reportType,
          format: 'HTML',
          collectionId,
          description: `Multi-format ${reportType} report (HTML)`
        },
        {
          priority: 12,
          jobId: `multi-html-${reportType.toLowerCase()}-${Date.now()}`
        }
      ),
      reportQueue.add(
        'multi-format-pdf',
        {
          reportType,
          format: 'PDF',
          collectionId,
          description: `Multi-format ${reportType} report (PDF)`
        },
        {
          priority: 12,
          jobId: `multi-pdf-${reportType.toLowerCase()}-${Date.now()}`
        }
      )
    ]);

    const jobIds = jobs.map(job => job.id || '');
    console.log(`✅ Scheduled multi-format ${reportType} report generation, job IDs:`, jobIds);
    return jobIds;
  } catch (error) {
    console.error('❌ Failed to schedule multi-format report generation:', error);
    throw error;
  }
};

/**
 * Get report generation job statistics
 */
export const getReportJobStats = async () => {
  try {
    const waiting = await reportQueue.getWaiting();
    const active = await reportQueue.getActive();
    const completed = await reportQueue.getCompleted();
    const failed = await reportQueue.getFailed();
    const repeatableJobs = await reportQueue.getRepeatableJobs();

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
    console.error('Error getting report job stats:', error);
    throw error;
  }
};

/**
 * Cancel a specific report generation job
 */
export const cancelReportJob = async (jobId: string): Promise<boolean> => {
  try {
    const job = await reportQueue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`🗑️  Cancelled report generation job: ${jobId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error cancelling report job:', error);
    throw error;
  }
};

/**
 * Clean up old report generation jobs
 */
export const cleanupReportJobs = async (): Promise<void> => {
  try {
    await reportQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // Clean completed jobs older than 24 hours
    await reportQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed');  // Clean failed jobs older than 7 days
    console.log('🧹 Cleaned up old report generation jobs');
  } catch (error) {
    console.error('Error cleaning up report jobs:', error);
    throw error;
  }
};

/**
 * Process cleanup job
 */
const processCleanupJob = async (job: any) => {
  console.log('🧹 Processing report cleanup job...');
  const { daysToKeep = 30 } = job.data;
  
  const result = await cleanupOldReports(daysToKeep);
  
  console.log(`✅ Report cleanup completed: ${result.deletedRecords} records, ${result.filesDeleted} files`);
  return result;
};

// Add cleanup job processor
reportWorker.on('ready', () => {
  // Handle cleanup jobs separately
  reportWorker.concurrency = 3; // Allow more concurrent jobs
});

// Override the worker processor to handle different job types
const originalWorker = reportWorker;

// Create a new worker that can handle different job types
const enhancedReportWorker = new Worker(
  REPORT_QUEUE_NAME,
  async (job) => {
    console.log(`🔄 Processing job: ${job.name} (${job.id})`);

    try {
      if (job.name === 'cleanup-reports') {
        return await processCleanupJob(job);
      } else {
        // Handle report generation jobs
        const { reportType, collectionId, format, customDateRange } = job.data;
        
        console.log(`📊 Generating ${reportType} report in ${format} format...`);
        
        const result = await generateReport({
          reportType,
          format: format || 'PDF',
          collectionId,
          customDateRange
        });
        
        console.log(`✅ Report generation completed for job: ${job.id}`);
        
        return {
          success: true,
          reportId: result.reportId,
          filePath: result.filePath,
          reportType,
          format,
          completedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error(`❌ Job processing failed for: ${job.id}`, error);
      throw error;
    }
  },
  { 
    connection: redisConnection,
    concurrency: 3,
    maxStalledCount: 1,
    stalledInterval: 30000
  }
);

/**
 * Graceful shutdown of report task components
 */
export const shutdownReportTask = async (): Promise<void> => {
  try {
    console.log('🛑 Shutting down report task components...');
    
    await reportWorker.close();
    await enhancedReportWorker.close();
    await reportQueueEvents.close();
    
    console.log('✅ Report task components shut down successfully');
  } catch (error) {
    console.error('❌ Error shutting down report task components:', error);
  }
};

export default {
  scheduleAutomatedReports,
  generateManualReport,
  generateMultiFormatReport,
  getReportJobStats,
  cancelReportJob,
  cleanupReportJobs,
  shutdownReportTask,
  reportQueue
};