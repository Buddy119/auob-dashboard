# BullMQ Task Scheduling Setup

This document describes the BullMQ task scheduling system implemented for the AUOB Health Dashboard backend.

## 📋 Overview

BullMQ is used to handle asynchronous execution of Postman Collection runs with advanced scheduling capabilities including:
- Immediate execution
- Delayed execution
- Recurring execution with cron patterns
- Job retry mechanisms
- Queue monitoring and management

## 🛠️ Architecture

### Components

1. **Redis Connection** (`src/config/redis.ts`)
   - Configurable Redis connection with health checking
   - Connection pooling and retry logic
   - Graceful shutdown handling

2. **Queue & Worker** (`src/tasks/collectionQueue.ts`)
   - BullMQ Queue for job management
   - Worker for processing collection runs
   - Queue events monitoring
   - Job lifecycle management

3. **Task Service** (`src/services/taskService.ts`)
   - High-level API for job scheduling
   - Queue statistics and management
   - Job cancellation and retry logic

4. **Newman Runner** (`src/utils/newmanRunner.ts`)
   - Postman Collection execution via Newman
   - Configuration file processing
   - SSL certificate and proxy support
   - Environment variable injection

5. **API Routes** (`src/routes/taskRoutes.ts`)
   - REST API endpoints for task management
   - Request validation and error handling
   - Response formatting

## 🚀 Setup Instructions

### Prerequisites

1. **Redis Server**: BullMQ requires Redis for job queue management
   ```bash
   # Install Redis (macOS)
   brew install redis
   
   # Install Redis (Ubuntu)
   sudo apt-get install redis-server
   
   # Start Redis
   redis-server
   ```

2. **Environment Variables**: Configure in `.env` file
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   ```

### Installation

Dependencies are already installed as part of the main project setup:
- `bullmq@5.56.5` - Job queue management
- `ioredis@5.3.2` - Redis client
- `newman@6.2.1` - Postman Collection runner

## 📚 API Endpoints

### Job Scheduling

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/run/:configName` | Run collection immediately |
| POST | `/api/tasks/schedule/:configName` | Schedule with custom options |
| POST | `/api/tasks/schedule-delayed/:configName` | Schedule with delay |
| POST | `/api/tasks/schedule-recurring/:configName` | Schedule recurring execution |

### Job Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/jobs/:jobId` | Get job details |
| DELETE | `/api/tasks/jobs/:jobId` | Cancel a job |
| POST | `/api/tasks/jobs/:jobId/retry` | Retry failed job |
| GET | `/api/tasks/jobs?status=waiting` | Get jobs by status |

### Queue Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/stats` | Get queue statistics |
| DELETE | `/api/tasks/clear?status=completed` | Clear jobs by status |
| POST | `/api/tasks/pause` | Pause queue processing |
| POST | `/api/tasks/resume` | Resume queue processing |

## 🔧 Usage Examples

### 1. Run Collection Immediately

```bash
curl -X POST http://localhost:4000/api/tasks/run/my-config
```

### 2. Schedule with Delay

```bash
curl -X POST http://localhost:4000/api/tasks/schedule-delayed/my-config \\
  -H "Content-Type: application/json" \\
  -d '{"delayMinutes": 30}'
```

### 3. Schedule Recurring Job

```bash
curl -X POST http://localhost:4000/api/tasks/schedule-recurring/my-config \\
  -H "Content-Type: application/json" \\
  -d '{
    "cronPattern": "0 */6 * * *",
    "limit": 100
  }'
```

### 4. Custom Scheduling Options

```bash
curl -X POST http://localhost:4000/api/tasks/schedule/my-config \\
  -H "Content-Type: application/json" \\
  -d '{
    "delay": 5000,
    "priority": 10,
    "attempts": 5,
    "backoff": {
      "type": "exponential",
      "delay": 3000
    },
    "repeat": {
      "pattern": "0 9 * * MON-FRI"
    }
  }'
```

### 5. Get Queue Statistics

```bash
curl http://localhost:4000/api/tasks/stats
```

Response:
```json
{
  "waiting": 2,
  "active": 1,
  "completed": 15,
  "failed": 3,
  "delayed": 1,
  "total": 22,
  "timestamp": "2025-07-28T14:00:00.000Z"
}
```

## ⚙️ Configuration Options

### Job Options

- **delay**: Delay in milliseconds before job execution
- **priority**: Job priority (higher number = higher priority)
- **attempts**: Number of retry attempts for failed jobs
- **backoff**: Retry backoff strategy (fixed or exponential)
- **repeat**: Recurring job configuration
- **removeOnComplete**: Number of completed jobs to keep in queue
- **removeOnFail**: Number of failed jobs to keep in queue

### Worker Configuration

- **concurrency**: Number of jobs processed simultaneously (default: 5)
- **stalledInterval**: Time after which jobs are considered stalled (30s)

## 🔍 Monitoring

### Queue Events

The system provides comprehensive monitoring through BullMQ events:

- Job lifecycle: added, waiting, active, completed, failed
- Worker status: ready, stalled, error
- Queue management: paused, resumed, cleaned

### Health Checking

Health status is available via `/health` endpoint:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-07-28T14:00:00.000Z"
}
```

## 🧪 Testing

### Structure Test (No Redis Required)
```bash
npx ts-node src/utils/testTaskAPI.ts
```

### Full Functionality Test (Redis Required)
```bash
# Start Redis first
redis-server

# Then run the test
npx ts-node src/utils/testBullMQ.ts
```

## 🔒 Security Considerations

- Redis connection supports password authentication
- SSL/TLS encryption for Redis connections
- Input validation on all API endpoints
- Rate limiting recommended for production deployments

## 🚨 Error Handling

- Automatic job retries with exponential backoff
- Failed job retention for debugging
- Comprehensive error logging
- Graceful degradation when Redis is unavailable

## 📈 Performance

- Job concurrency configurable (default: 5 simultaneous jobs)
- Automatic cleanup of old completed/failed jobs
- Efficient Redis connection pooling
- Lazy connection initialization

## 🔧 Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Ensure Redis server is running
   - Check connection credentials in `.env`
   - Verify network connectivity

2. **Jobs Not Processing**
   - Check worker status in logs
   - Verify queue is not paused
   - Check for stalled jobs

3. **Configuration Not Found**
   - Ensure configuration files exist in `configs/` directory
   - Verify file permissions and format

### Debug Commands

```bash
# Check Redis connection
redis-cli ping

# Monitor Redis activity
redis-cli monitor

# View queue contents
curl http://localhost:4000/api/tasks/stats
```