import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import {
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
} from '../services/taskService';
import {
  runAvailabilityCalculationNow,
  scheduleAvailabilityCalculation,
  getAvailabilityJobStats,
  cancelAvailabilityJob,
  cleanupAvailabilityJobs
} from '../tasks/availabilityTask';
import {
  getAPIAvailabilityTrend,
  getSystemAvailability,
  calculateCollectionAvailability
} from '../utils/calculateAvailability';
import {
  generateManualReport,
  generateMultiFormatReport,
  getReportJobStats,
  cancelReportJob,
  cleanupReportJobs
} from '../tasks/reportTask';
import { getReportStats } from '../utils/reportGenerator';

const router = Router();

/**
 * Schedule a collection run with custom options
 * POST /api/tasks/schedule/:configName
 */
router.post('/tasks/schedule/:configName', async (req: Request, res: Response) => {
  try {
    const { configName } = req.params;
    const { delay, priority, attempts, backoff, repeat, removeOnComplete, removeOnFail } = req.body;

    if (!configName) {
      res.status(400).json({
        error: 'Configuration name is required',
        message: 'Please provide a valid configuration name'
      });
      return;
    }

    const options = {
      delay: delay || 0,
      priority: priority || 0,
      attempts: attempts || 3,
      backoff: backoff || { type: 'exponential' as const, delay: 2000 },
      repeat,
      removeOnComplete: removeOnComplete || 10,
      removeOnFail: removeOnFail || 20
    };

    const jobId = await scheduleCollectionRun(configName, options);

    res.status(200).json({
      message: 'Collection run scheduled successfully',
      jobId,
      configName,
      options,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error scheduling collection run:', error);
    res.status(500).json({
      error: 'Failed to schedule collection run',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Run collection immediately
 * POST /api/tasks/run/:configName
 */
router.post('/tasks/run/:configName', async (req: Request, res: Response) => {
  try {
    const { configName } = req.params;

    if (!configName) {
      res.status(400).json({
        error: 'Configuration name is required',
        message: 'Please provide a valid configuration name'
      });
      return;
    }

    const jobId = await runCollectionNow(configName);

    res.status(200).json({
      message: 'Collection run started immediately',
      jobId,
      configName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting immediate collection run:', error);
    res.status(500).json({
      error: 'Failed to start collection run',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Schedule delayed collection run
 * POST /api/tasks/schedule-delayed/:configName
 */
router.post('/tasks/schedule-delayed/:configName', async (req: Request, res: Response) => {
  try {
    const { configName } = req.params;
    const { delayMinutes } = req.body;

    if (!configName) {
      res.status(400).json({
        error: 'Configuration name is required',
        message: 'Please provide a valid configuration name'
      });
      return;
    }

    if (!delayMinutes || delayMinutes <= 0) {
      res.status(400).json({
        error: 'Invalid delay',
        message: 'Please provide a valid delay in minutes (greater than 0)'
      });
      return;
    }

    const jobId = await scheduleDelayedRun(configName, delayMinutes);

    res.status(200).json({
      message: `Collection run scheduled with ${delayMinutes} minute delay`,
      jobId,
      configName,
      delayMinutes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error scheduling delayed collection run:', error);
    res.status(500).json({
      error: 'Failed to schedule delayed collection run',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Schedule recurring collection run
 * POST /api/tasks/schedule-recurring/:configName
 */
router.post('/tasks/schedule-recurring/:configName', async (req: Request, res: Response) => {
  try {
    const { configName } = req.params;
    const { cronPattern, limit } = req.body;

    if (!configName) {
      res.status(400).json({
        error: 'Configuration name is required',
        message: 'Please provide a valid configuration name'
      });
      return;
    }

    if (!cronPattern) {
      res.status(400).json({
        error: 'Cron pattern is required',
        message: 'Please provide a valid cron pattern'
      });
      return;
    }

    const jobId = await scheduleRecurringRun(configName, cronPattern, limit);

    res.status(200).json({
      message: 'Recurring collection run scheduled successfully',
      jobId,
      configName,
      cronPattern,
      limit,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error scheduling recurring collection run:', error);
    res.status(500).json({
      error: 'Failed to schedule recurring collection run',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Cancel a job
 * DELETE /api/tasks/jobs/:jobId
 */
router.delete('/tasks/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({
        error: 'Job ID is required',
        message: 'Please provide a valid job ID'
      });
      return;
    }

    const cancelled = await cancelJob(jobId);

    if (cancelled) {
      res.status(200).json({
        message: 'Job cancelled successfully',
        jobId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        error: 'Job not found',
        message: `Job with ID ${jobId} was not found`
      });
    }
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({
      error: 'Failed to cancel job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get job details
 * GET /api/tasks/jobs/:jobId
 */
router.get('/tasks/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({
        error: 'Job ID is required',
        message: 'Please provide a valid job ID'
      });
      return;
    }

    const jobDetails = await getJobDetails(jobId);

    if (jobDetails) {
      res.status(200).json(jobDetails);
    } else {
      res.status(404).json({
        error: 'Job not found',
        message: `Job with ID ${jobId} was not found`
      });
    }
  } catch (error) {
    console.error('Error getting job details:', error);
    res.status(500).json({
      error: 'Failed to get job details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get jobs by status
 * GET /api/tasks/jobs?status=waiting|active|completed|failed|delayed
 */
router.get('/tasks/jobs', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    if (!status || typeof status !== 'string') {
      res.status(400).json({
        error: 'Status is required',
        message: 'Please provide a valid status (waiting, active, completed, failed, delayed)'
      });
      return;
    }

    const validStatuses = ['waiting', 'active', 'completed', 'failed', 'delayed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
      return;
    }

    const jobs = await getJobsByStatus(status as 'waiting' | 'active' | 'completed' | 'failed' | 'delayed');

    res.status(200).json({
      status,
      jobs,
      count: jobs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting jobs by status:', error);
    res.status(500).json({
      error: 'Failed to get jobs by status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Retry a failed job
 * POST /api/tasks/jobs/:jobId/retry
 */
router.post('/tasks/jobs/:jobId/retry', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({
        error: 'Job ID is required',
        message: 'Please provide a valid job ID'
      });
      return;
    }

    const retried = await retryJob(jobId);

    if (retried) {
      res.status(200).json({
        message: 'Job retry initiated successfully',
        jobId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        error: 'Job not found',
        message: `Job with ID ${jobId} was not found`
      });
    }
  } catch (error) {
    console.error('Error retrying job:', error);
    res.status(500).json({
      error: 'Failed to retry job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get task statistics
 * GET /api/tasks/stats
 */
router.get('/tasks/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getTaskStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting task stats:', error);
    res.status(500).json({
      error: 'Failed to get task statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear jobs by status
 * DELETE /api/tasks/clear?status=completed|failed|active|waiting|delayed
 */
router.delete('/tasks/clear', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    if (!status || typeof status !== 'string') {
      res.status(400).json({
        error: 'Status is required',
        message: 'Please provide a valid status (completed, failed, active, waiting, delayed)'
      });
      return;
    }

    const validStatuses = ['completed', 'failed', 'active', 'waiting', 'delayed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
      return;
    }

    const result = await clearTasksByStatus(status as 'completed' | 'failed' | 'active' | 'waiting' | 'delayed');
    res.status(200).json(result);
  } catch (error) {
    console.error('Error clearing tasks:', error);
    res.status(500).json({
      error: 'Failed to clear tasks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Pause task processing
 * POST /api/tasks/pause
 */
router.post('/tasks/pause', async (req: Request, res: Response) => {
  try {
    const result = await pauseTaskProcessing();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error pausing task processing:', error);
    res.status(500).json({
      error: 'Failed to pause task processing',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Resume task processing
 * POST /api/tasks/resume
 */
router.post('/tasks/resume', async (req: Request, res: Response) => {
  try {
    const result = await resumeTaskProcessing();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error resuming task processing:', error);
    res.status(500).json({
      error: 'Failed to resume task processing',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ======================
// AVAILABILITY CALCULATION ROUTES
// ======================

/**
 * Run availability calculation immediately
 * POST /api/tasks/availability/calculate
 */
router.post('/tasks/availability/calculate', async (req: Request, res: Response) => {
  try {
    const { targetDate } = req.body;
    const calculationDate = targetDate ? new Date(targetDate) : new Date();

    if (targetDate && isNaN(calculationDate.getTime())) {
      res.status(400).json({
        error: 'Invalid date format',
        message: 'Please provide a valid date in ISO format (YYYY-MM-DD)'
      });
      return;
    }

    const jobId = await runAvailabilityCalculationNow(calculationDate);

    res.status(200).json({
      message: 'Availability calculation started successfully',
      jobId,
      targetDate: calculationDate.toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting availability calculation:', error);
    res.status(500).json({
      error: 'Failed to start availability calculation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Schedule availability calculation for future date
 * POST /api/tasks/availability/schedule
 */
router.post('/tasks/availability/schedule', async (req: Request, res: Response) => {
  try {
    const { targetDate, delay } = req.body;

    if (!targetDate) {
      res.status(400).json({
        error: 'Target date is required',
        message: 'Please provide a target date for the calculation'
      });
      return;
    }

    const calculationDate = new Date(targetDate);
    if (isNaN(calculationDate.getTime())) {
      res.status(400).json({
        error: 'Invalid date format',
        message: 'Please provide a valid date in ISO format (YYYY-MM-DD)'
      });
      return;
    }

    const jobId = await scheduleAvailabilityCalculation(calculationDate, delay);

    res.status(200).json({
      message: 'Availability calculation scheduled successfully',
      jobId,
      targetDate: calculationDate.toISOString(),
      delay: delay || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error scheduling availability calculation:', error);
    res.status(500).json({
      error: 'Failed to schedule availability calculation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get availability calculation job statistics
 * GET /api/tasks/availability/stats
 */
router.get('/tasks/availability/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getAvailabilityJobStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting availability job stats:', error);
    res.status(500).json({
      error: 'Failed to get availability job statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Cancel availability calculation job
 * DELETE /api/tasks/availability/jobs/:jobId
 */
router.delete('/tasks/availability/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({
        error: 'Job ID is required',
        message: 'Please provide a valid job ID'
      });
      return;
    }

    const cancelled = await cancelAvailabilityJob(jobId);

    if (cancelled) {
      res.status(200).json({
        message: 'Availability calculation job cancelled successfully',
        jobId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        error: 'Job not found',
        message: `Availability calculation job with ID ${jobId} was not found`
      });
    }
  } catch (error) {
    console.error('Error cancelling availability job:', error);
    res.status(500).json({
      error: 'Failed to cancel availability calculation job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clean up old availability calculation jobs
 * POST /api/tasks/availability/cleanup
 */
router.post('/tasks/availability/cleanup', async (req: Request, res: Response) => {
  try {
    await cleanupAvailabilityJobs();
    res.status(200).json({
      message: 'Availability calculation jobs cleaned up successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error cleaning up availability jobs:', error);
    res.status(500).json({
      error: 'Failed to clean up availability calculation jobs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get API availability trend for specific endpoint
 * GET /api/tasks/availability/trend?collectionId=X&method=GET&url=Y&days=30
 */
router.get('/tasks/availability/trend', async (req: Request, res: Response) => {
  try {
    const { collectionId, method, url, days } = req.query;

    if (!collectionId || !method || !url) {
      res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide collectionId, method, and url parameters'
      });
      return;
    }

    const numDays = days ? parseInt(days as string) : 30;
    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      res.status(400).json({
        error: 'Invalid days parameter',
        message: 'Days must be a number between 1 and 365'
      });
      return;
    }

    const trend = await getAPIAvailabilityTrend(
      collectionId as string,
      method as string,
      url as string,
      numDays
    );

    res.status(200).json({
      collectionId,
      method,
      url,
      days: numDays,
      trend,
      count: trend.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting API availability trend:', error);
    res.status(500).json({
      error: 'Failed to get API availability trend',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get system-wide availability statistics
 * GET /api/tasks/availability/system?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/tasks/availability/system', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide both startDate and endDate parameters'
      });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        error: 'Invalid date format',
        message: 'Please provide valid dates in ISO format (YYYY-MM-DD)'
      });
      return;
    }

    if (start > end) {
      res.status(400).json({
        error: 'Invalid date range',
        message: 'Start date must be before or equal to end date'
      });
      return;
    }

    const systemAvailability = await getSystemAvailability(start, end);

    res.status(200).json({
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      },
      ...systemAvailability,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting system availability:', error);
    res.status(500).json({
      error: 'Failed to get system availability statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get collection-specific availability for a date
 * GET /api/tasks/availability/collection/:collectionId?date=YYYY-MM-DD
 */
router.get('/tasks/availability/collection/:collectionId', async (req: Request, res: Response) => {
  try {
    const { collectionId } = req.params;
    const { date } = req.query;

    if (!collectionId) {
      res.status(400).json({
        error: 'Collection ID is required',
        message: 'Please provide a valid collection ID'
      });
      return;
    }

    const targetDate = date ? new Date(date as string) : new Date();
    if (isNaN(targetDate.getTime())) {
      res.status(400).json({
        error: 'Invalid date format',
        message: 'Please provide a valid date in ISO format (YYYY-MM-DD)'
      });
      return;
    }

    const availability = await calculateCollectionAvailability(collectionId, targetDate);

    res.status(200).json({
      collectionId,
      date: targetDate.toISOString().split('T')[0],
      availability,
      totalAPIs: availability.length,
      averageAvailability: availability.length > 0 
        ? availability.reduce((sum, api) => sum + api.availability, 0) / availability.length 
        : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting collection availability:', error);
    res.status(500).json({
      error: 'Failed to get collection availability',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ======================
// REPORT GENERATION ROUTES
// ======================

/**
 * Generate a manual report
 * POST /api/tasks/reports/generate
 */
router.post('/tasks/reports/generate', async (req: Request, res: Response) => {
  try {
    const { reportType, format, collectionId, customDateRange } = req.body;

    if (!reportType || !['Daily', 'Weekly', 'Monthly'].includes(reportType)) {
      res.status(400).json({
        error: 'Invalid report type',
        message: 'Report type must be one of: Daily, Weekly, Monthly'
      });
      return;
    }

    if (format && !['HTML', 'PDF'].includes(format)) {
      res.status(400).json({
        error: 'Invalid format',
        message: 'Format must be either HTML or PDF'
      });
      return;
    }

    let parsedDateRange;
    if (customDateRange) {
      try {
        const { startDate, endDate } = customDateRange;
        parsedDateRange = {
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        };

        if (isNaN(parsedDateRange.startDate.getTime()) || isNaN(parsedDateRange.endDate.getTime())) {
          throw new Error('Invalid date format');
        }

        if (parsedDateRange.startDate > parsedDateRange.endDate) {
          throw new Error('Start date must be before end date');
        }
      } catch (error) {
        res.status(400).json({
          error: 'Invalid date range',
          message: 'Please provide valid start and end dates in ISO format'
        });
        return;
      }
    }

    const jobId = await generateManualReport(
      reportType,
      format || 'PDF',
      collectionId,
      parsedDateRange
    );

    res.status(200).json({
      message: 'Report generation started successfully',
      jobId,
      reportType,
      format: format || 'PDF',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting report generation:', error);
    res.status(500).json({
      error: 'Failed to start report generation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate report in multiple formats
 * POST /api/tasks/reports/multi-format
 */
router.post('/tasks/reports/multi-format', async (req: Request, res: Response) => {
  try {
    const { reportType, collectionId } = req.body;

    if (!reportType || !['Daily', 'Weekly', 'Monthly'].includes(reportType)) {
      res.status(400).json({
        error: 'Invalid report type',
        message: 'Report type must be one of: Daily, Weekly, Monthly'
      });
      return;
    }

    const jobIds = await generateMultiFormatReport(reportType, collectionId);

    res.status(200).json({
      message: 'Multi-format report generation started successfully',
      jobIds,
      reportType,
      formats: ['HTML', 'PDF'],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting multi-format report generation:', error);
    res.status(500).json({
      error: 'Failed to start multi-format report generation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get report generation job statistics
 * GET /api/tasks/reports/jobs/stats
 */
router.get('/tasks/reports/jobs/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getReportJobStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting report job stats:', error);
    res.status(500).json({
      error: 'Failed to get report job statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get report statistics
 * GET /api/tasks/reports/stats
 */
router.get('/tasks/reports/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getReportStats();
    res.status(200).json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting report stats:', error);
    res.status(500).json({
      error: 'Failed to get report statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Cancel report generation job
 * DELETE /api/tasks/reports/jobs/:jobId
 */
router.delete('/tasks/reports/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({
        error: 'Job ID is required',
        message: 'Please provide a valid job ID'
      });
      return;
    }

    const cancelled = await cancelReportJob(jobId);

    if (cancelled) {
      res.status(200).json({
        message: 'Report generation job cancelled successfully',
        jobId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        error: 'Job not found',
        message: `Report generation job with ID ${jobId} was not found`
      });
    }
  } catch (error) {
    console.error('Error cancelling report job:', error);
    res.status(500).json({
      error: 'Failed to cancel report generation job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clean up old report generation jobs
 * POST /api/tasks/reports/jobs/cleanup
 */
router.post('/tasks/reports/jobs/cleanup', async (req: Request, res: Response) => {
  try {
    await cleanupReportJobs();
    res.status(200).json({
      message: 'Report generation jobs cleaned up successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error cleaning up report jobs:', error);
    res.status(500).json({
      error: 'Failed to clean up report generation jobs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Download report file
 * GET /api/tasks/reports/download/:reportId
 */
router.get('/tasks/reports/download/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;

    if (!reportId) {
      res.status(400).json({
        error: 'Report ID is required',
        message: 'Please provide a valid report ID'
      });
      return;
    }

    // Find report in database
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        collection: {
          select: { name: true }
        }
      }
    });

    if (!report) {
      res.status(404).json({
        error: 'Report not found',
        message: `Report with ID ${reportId} was not found`
      });
      return;
    }

    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(report.reportContent)) {
      res.status(404).json({
        error: 'Report file not found',
        message: 'The report file no longer exists on the server'
      });
      return;
    }

    // Set appropriate headers
    const path = require('path');
    const filename = path.basename(report.reportContent);
    const ext = path.extname(filename).toLowerCase();
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', ext === '.pdf' ? 'application/pdf' : 'text/html');

    // Send file
    res.sendFile(path.resolve(report.reportContent));

  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({
      error: 'Failed to download report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * List all reports
 * GET /api/tasks/reports?page=1&limit=10&type=Daily
 */
router.get('/tasks/reports', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', type, collectionId } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        error: 'Invalid pagination parameters',
        message: 'Page must be >= 1 and limit must be between 1 and 100'
      });
      return;
    }

    const whereClause: any = {};
    if (type && ['Daily', 'Weekly', 'Monthly'].includes(type as string)) {
      whereClause.reportType = type;
    }
    if (collectionId) {
      whereClause.collectionId = collectionId;
    }

    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where: whereClause,
        include: {
          collection: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.report.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      reports: reports.map(report => ({
        id: report.id,
        reportType: report.reportType,
        reportDate: report.reportDate,
        format: report.format,
        apiCount: report.apiCount,
        collectionName: report.collection?.name || 'Unknown',
        createdAt: report.createdAt,
        summary: report.summary ? JSON.parse(report.summary as string) : null
      })),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json({
      error: 'Failed to list reports',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;