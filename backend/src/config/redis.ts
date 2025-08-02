import { Redis } from 'ioredis';

// Redis configuration from environment variables
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 300,
  retryDelayOnFailoverAttempts: 10,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectionName: 'auob-dashboard',
};

// Create Redis connection instance
export const connection = new Redis(redisConfig);

// Event handlers for Redis connection
connection.on('connect', () => {
  console.log('🔗 Redis connection established');
});

connection.on('ready', () => {
  console.log('✅ Redis connection ready');
});

connection.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

connection.on('close', () => {
  console.log('🔌 Redis connection closed');
});

connection.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Graceful shutdown handler
export const closeRedisConnection = async (): Promise<void> => {
  try {
    await connection.quit();
    console.log('🛑 Redis connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
  }
};

// Health check function
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const result = await connection.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
};

export default connection;