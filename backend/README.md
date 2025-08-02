# AUOB Health Dashboard Backend

Backend service for the AUOB Health Dashboard built with Node.js, TypeScript, Express, Prisma, and BullMQ.

## Prerequisites

- Node.js (v16 or higher)
- Redis server (for BullMQ job queue)
- SQLite (automatically handled by Prisma)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Access the API:**
   - Main endpoint: http://localhost:4000
   - Health check: http://localhost:4000/health

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Run production server
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
backend/
├── src/
│   ├── index.ts          # Main server file
│   ├── routes/           # Express route definitions
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic layer
│   ├── tasks/            # BullMQ job definitions
│   ├── utils/            # Helper functions (Newman integration)
│   └── config/           # Configuration files
├── prisma/
│   └── schema.prisma     # Database schema
└── package.json
```

## Database Schema

The database includes the following models:
- **Collection** - Postman collections with configuration
- **VariableSet** - Input variable sets for collections
- **CollectionRun** - Execution runs of collections
- **ApiRunResult** - Individual API request results
- **ApiDailyAvailability** - Daily availability metrics
- **Report** - Generated reports

## Environment Variables

See `.env.example` for all available configuration options.

## Development

1. The server runs on port 4000 by default
2. Database migrations are automatically applied in development
3. Prisma Studio is available for database inspection
4. Hot reload is enabled with ts-node

## Dependencies

### Production
- **express** - Web framework
- **prisma/@prisma/client** - Database ORM
- **newman** - Postman collection runner
- **bullmq** - Job queue processing
- **handlebars** - Template engine for reports
- **dotenv** - Environment variable loading
- **cors** - Cross-origin resource sharing

### Development
- **typescript** - TypeScript compiler
- **ts-node** - TypeScript execution
- **@types/** - TypeScript type definitions