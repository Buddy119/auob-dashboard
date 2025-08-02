import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import configRoutes from './routes/configRoutes';
import taskRoutes from './routes/taskRoutes';
import { connection, closeRedisConnection, checkRedisHealth } from './config/redis';
import { shutdownQueue } from './tasks/collectionQueue';
import { scheduleDailyAvailabilityCalculation, shutdownAvailabilityTask } from './tasks/availabilityTask';
import { scheduleAutomatedReports, shutdownReportTask } from './tasks/reportTask';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AUOB Health Dashboard Backend Running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API health check
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Test Redis connection
    const redisHealthy = await checkRedisHealth();
    
    res.json({
      status: 'healthy',
      database: 'connected',
      redis: redisHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      redis: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api', configRoutes);
app.use('/api', taskRoutes);

// Initialize Redis connection and background tasks
const initializeRedis = async () => {
  try {
    await connection.connect();
    console.log('🔗 Redis initialized successfully');
    
    // Schedule daily availability calculation
    await scheduleDailyAvailabilityCalculation();
    console.log('📅 Daily availability calculation scheduled');
    
    // Schedule automated report generation
    await scheduleAutomatedReports();
    console.log('📊 Automated report generation scheduled');
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('🛑 Shutting down gracefully...');
  
  try {
    // Close BullMQ queue and worker
    await shutdownQueue();
    
    // Close availability task components
    await shutdownAvailabilityTask();
    
    // Close report task components
    await shutdownReportTask();
    
    // Close Redis connection
    await closeRedisConnection();
    
    // Close Prisma connection
    await prisma.$disconnect();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Initialize Redis after server starts
  await initializeRedis();
  
  console.log('📋 Task scheduling endpoints:');
  console.log(`   - POST /api/tasks/run/:configName - Run immediately`);
  console.log(`   - POST /api/tasks/schedule/:configName - Schedule with options`);
  console.log(`   - GET /api/tasks/stats - Queue statistics`);
  console.log('📊 Availability calculation:');
  console.log(`   - Daily calculation scheduled at 00:00 UTC`);
  console.log(`   - Manual triggers available via task routes`);
  console.log('📋 Automated report generation:');
  console.log(`   - Daily reports: 00:30 UTC`);
  console.log(`   - Weekly reports: 01:00 UTC (Sundays)`);
  console.log(`   - Monthly reports: 02:00 UTC (1st of month)`);
});

export default app;