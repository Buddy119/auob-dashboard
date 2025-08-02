import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import crypto from 'crypto';

const prisma = new PrismaClient();

export type ReportType = 'Daily' | 'Weekly' | 'Monthly';
export type ReportFormat = 'HTML' | 'PDF';

interface ReportOptions {
  reportType: ReportType;
  format: ReportFormat;
  collectionId?: string;
  customDateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

interface ReportData {
  reportId: string;
  reportType: ReportType;
  reportDate: string;
  generatedAt: string;
  periodInfo?: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalAPIs: number;
    averageAvailability: number;
    totalRequests: number;
    successfulRequests: number;
    highAvailabilityAPIs: number;
    lowAvailabilityAPIs: number;
  };
  apis: Array<{
    apiName: string;
    apiMethod: string;
    apiUrl: string;
    availability: number;
    successCount: number;
    totalCount: number;
    collectionName?: string;
    date?: string;
  }>;
  showCollection: boolean;
  showDate: boolean;
}

interface GeneratedReport {
  reportId: string;
  filePath: string;
  htmlContent?: string;
  reportData: ReportData;
}

/**
 * Register Handlebars helpers
 */
const registerHandlebarsHelpers = () => {
  // Helper to compare values
  handlebars.registerHelper('gte', (a: number, b: number) => a >= b);
  handlebars.registerHelper('lt', (a: number, b: number) => a < b);
  handlebars.registerHelper('gt', (a: number, b: number) => a > b);
  handlebars.registerHelper('lowercase', (str: string) => str.toLowerCase());
  
  // Helper to format dates
  handlebars.registerHelper('formatDate', (date: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  });
};

/**
 * Calculate date range based on report type
 */
const calculateDateRange = (reportType: ReportType, customDateRange?: { startDate: Date; endDate: Date }) => {
  if (customDateRange) {
    return {
      startDate: customDateRange.startDate,
      endDate: customDateRange.endDate
    };
  }

  const now = new Date();
  const endDate = new Date(now);
  let startDate: Date;

  switch (reportType) {
    case 'Daily':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'Weekly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'Monthly':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      throw new Error(`Invalid report type: ${reportType}`);
  }

  return { startDate, endDate };
};

/**
 * Fetch availability data from database
 */
const fetchAvailabilityData = async (
  startDate: Date, 
  endDate: Date, 
  collectionId?: string
) => {
  console.log(`📊 Fetching availability data from ${startDate.toDateString()} to ${endDate.toDateString()}`);

  const whereClause: any = {
    date: {
      gte: startDate,
      lte: endDate
    }
  };

  if (collectionId) {
    whereClause.collectionId = collectionId;
  }

  const availabilityData = await prisma.aPIDailyAvailability.findMany({
    where: whereClause,
    include: {
      collection: true
    },
    orderBy: [
      { date: 'desc' },
      { availability: 'asc' }
    ]
  });

  console.log(`📈 Found ${availabilityData.length} availability records`);
  return availabilityData;
};

/**
 * Process and aggregate availability data
 */
const processAvailabilityData = (availabilityData: any[], reportType: ReportType) => {
  if (availabilityData.length === 0) {
    return {
      summary: {
        totalAPIs: 0,
        averageAvailability: 0,
        totalRequests: 0,
        successfulRequests: 0,
        highAvailabilityAPIs: 0,
        lowAvailabilityAPIs: 0
      },
      apis: []
    };
  }

  // For daily reports, show individual records
  // For weekly/monthly reports, aggregate by API endpoint
  let processedAPIs: any[] = [];

  if (reportType === 'Daily') {
    processedAPIs = availabilityData.map(record => ({
      apiName: record.apiName,
      apiMethod: record.apiMethod,
      apiUrl: record.apiUrl,
      availability: Math.round(record.availability * 100) / 100,
      successCount: record.successCount,
      totalCount: record.totalCount,
      collectionName: record.collection?.name || 'Unknown',
      date: record.date.toISOString().split('T')[0]
    }));
  } else {
    // Aggregate data by API endpoint for weekly/monthly reports
    const apiMap: Record<string, any> = {};

    availabilityData.forEach(record => {
      const key = `${record.apiMethod}-${record.apiUrl}`;
      
      if (!apiMap[key]) {
        apiMap[key] = {
          apiName: record.apiName,
          apiMethod: record.apiMethod,
          apiUrl: record.apiUrl,
          totalSuccessCount: 0,
          totalCount: 0,
          collectionName: record.collection?.name || 'Unknown'
        };
      }

      apiMap[key].totalSuccessCount += record.successCount;
      apiMap[key].totalCount += record.totalCount;
    });

    processedAPIs = Object.values(apiMap).map((api: any) => ({
      ...api,
      availability: api.totalCount > 0 
        ? Math.round((api.totalSuccessCount / api.totalCount) * 10000) / 100 
        : 0,
      successCount: api.totalSuccessCount,
      totalCount: api.totalCount
    }));

    // Sort by availability (lowest first to highlight issues)
    processedAPIs.sort((a, b) => a.availability - b.availability);
  }

  // Calculate summary statistics
  const totalRequests = processedAPIs.reduce((sum, api) => sum + api.totalCount, 0);
  const successfulRequests = processedAPIs.reduce((sum, api) => sum + api.successCount, 0);
  const averageAvailability = totalRequests > 0 
    ? Math.round((successfulRequests / totalRequests) * 10000) / 100 
    : 0;

  const highAvailabilityAPIs = processedAPIs.filter(api => api.availability >= 99).length;
  const lowAvailabilityAPIs = processedAPIs.filter(api => api.availability < 90).length;

  return {
    summary: {
      totalAPIs: processedAPIs.length,
      averageAvailability,
      totalRequests,
      successfulRequests,
      highAvailabilityAPIs,
      lowAvailabilityAPIs
    },
    apis: processedAPIs
  };
};

/**
 * Generate HTML content from template
 */
const generateHTMLContent = (reportData: ReportData): string => {
  try {
    const templatePath = path.join(__dirname, '../templates/reportTemplate.hbs');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateContent);
    
    return template(reportData);
  } catch (error) {
    console.error('Error generating HTML content:', error);
    throw error;
  }
};

/**
 * Generate PDF from HTML content
 */
const generatePDF = async (htmlContent: string, outputPath: string): Promise<void> => {
  let browser;
  try {
    console.log('🔄 Launching Puppeteer browser for PDF generation...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('📄 Generating PDF...');
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    console.log(`✅ PDF generated successfully: ${outputPath}`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Save report record to database
 */
const saveReportToDatabase = async (
  reportData: ReportData,
  filePath: string,
  format: ReportFormat,
  collectionId?: string
) => {
  try {
    // Use the first collection ID from the data if not specified
    const finalCollectionId = collectionId || 
      (reportData.apis.length > 0 ? await getFirstCollectionId() : null);

    if (!finalCollectionId) {
      console.warn('⚠️  No collection ID available for report record');
      return null;
    }

    const reportRecord = await prisma.report.create({
      data: {
        collectionId: finalCollectionId,
        reportType: reportData.reportType,
        reportDate: new Date(reportData.reportDate),
        reportContent: filePath,
        format,
        summary: JSON.stringify(reportData.summary),
        apiCount: reportData.apis.length
      }
    });

    console.log(`📝 Report record saved to database: ${reportRecord.id}`);
    return reportRecord;
  } catch (error) {
    console.error('Error saving report to database:', error);
    throw error;
  }
};

/**
 * Get first available collection ID
 */
const getFirstCollectionId = async (): Promise<string | null> => {
  try {
    const collection = await prisma.collection.findFirst();
    return collection?.id || null;
  } catch (error) {
    console.error('Error getting first collection ID:', error);
    return null;
  }
};

/**
 * Main report generation function
 */
export const generateReport = async (options: ReportOptions): Promise<GeneratedReport> => {
  console.log(`🚀 Starting ${options.reportType} report generation in ${options.format} format...`);

  try {
    // Register Handlebars helpers
    registerHandlebarsHelpers();

    // Calculate date range
    const { startDate, endDate } = calculateDateRange(options.reportType, options.customDateRange);

    // Fetch data
    const availabilityData = await fetchAvailabilityData(startDate, endDate, options.collectionId);

    // Process data
    const { summary, apis } = processAvailabilityData(availabilityData, options.reportType);

    // Prepare report data
    const reportId = crypto.randomUUID();
    const reportData: ReportData = {
      reportId,
      reportType: options.reportType,
      reportDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      generatedAt: new Date().toISOString(),
      periodInfo: {
        startDate: startDate.toLocaleDateString(),
        endDate: endDate.toLocaleDateString()
      },
      summary,
      apis,
      showCollection: !options.collectionId, // Show collection column if not filtering by collection
      showDate: options.reportType !== 'Daily' // Show date column for weekly/monthly reports
    };

    // Generate HTML content
    const htmlContent = generateHTMLContent(reportData);

    // Determine file paths
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${options.reportType}-Report-${timestamp}`;
    const reportsDir = path.join(__dirname, '../../reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    let filePath: string;
    if (options.format === 'PDF') {
      filePath = path.join(reportsDir, `${filename}.pdf`);
      await generatePDF(htmlContent, filePath);
    } else {
      filePath = path.join(reportsDir, `${filename}.html`);
      fs.writeFileSync(filePath, htmlContent, 'utf-8');
      console.log(`✅ HTML report generated: ${filePath}`);
    }

    // Save to database
    await saveReportToDatabase(reportData, filePath, options.format, options.collectionId);

    console.log(`🎉 ${options.reportType} report generation completed successfully!`);

    return {
      reportId,
      filePath,
      htmlContent: options.format === 'HTML' ? htmlContent : undefined,
      reportData
    };

  } catch (error) {
    console.error(`❌ Error generating ${options.reportType} report:`, error);
    throw error;
  }
};

/**
 * Generate multiple report formats
 */
export const generateReports = async (reportType: ReportType, collectionId?: string) => {
  const reports = [];
  
  try {
    // Generate both HTML and PDF versions
    const htmlReport = await generateReport({
      reportType,
      format: 'HTML',
      collectionId
    });
    reports.push(htmlReport);

    const pdfReport = await generateReport({
      reportType,
      format: 'PDF',
      collectionId
    });
    reports.push(pdfReport);

    return reports;
  } catch (error) {
    console.error('Error generating multiple report formats:', error);
    throw error;
  }
};

/**
 * Get report statistics
 */
export const getReportStats = async () => {
  try {
    const totalReports = await prisma.report.count();
    const recentReports = await prisma.report.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        collection: {
          select: { name: true }
        }
      }
    });

    const reportsByType = await prisma.report.groupBy({
      by: ['reportType'],
      _count: {
        reportType: true
      }
    });

    return {
      totalReports,
      recentReports,
      reportsByType: reportsByType.reduce((acc, item) => {
        acc[item.reportType] = item._count.reportType;
        return acc;
      }, {} as Record<string, number>)
    };
  } catch (error) {
    console.error('Error getting report stats:', error);
    throw error;
  }
};

/**
 * Clean up old report files
 */
export const cleanupOldReports = async (daysToKeep: number = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldReports = await prisma.report.findMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    let filesDeleted = 0;
    for (const report of oldReports) {
      try {
        if (fs.existsSync(report.reportContent)) {
          fs.unlinkSync(report.reportContent);
          filesDeleted++;
        }
      } catch (error) {
        console.warn(`Failed to delete report file: ${report.reportContent}`, error);
      }
    }

    // Delete database records
    const deletedRecords = await prisma.report.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    console.log(`🧹 Cleaned up ${deletedRecords.count} old reports, deleted ${filesDeleted} files`);
    return { deletedRecords: deletedRecords.count, filesDeleted };
  } catch (error) {
    console.error('Error cleaning up old reports:', error);
    throw error;
  }
};

export default {
  generateReport,
  generateReports,
  getReportStats,
  cleanupOldReports
};