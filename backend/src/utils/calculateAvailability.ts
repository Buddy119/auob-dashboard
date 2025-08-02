import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AvailabilityStats {
  successCount: number;
  totalCount: number;
  availability: number;
}

interface APIIdentifier {
  apiName: string;
  method: string;
  url: string;
  collectionId: string;
}

/**
 * Calculate daily API availability based on Newman execution results
 */
export const calculateDailyAvailability = async (targetDate?: Date): Promise<void> => {
  console.log('🔄 Starting daily availability calculation...');
  
  const calculationDate = targetDate || new Date();
  const startOfDay = new Date(calculationDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(calculationDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // Get all API results for the target date with run information
    const apiResults = await prisma.aPIRunResult.findMany({
      where: {
        run: {
          startTime: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      },
      include: {
        run: {
          include: {
            collection: true
          }
        }
      }
    });

    console.log(`📊 Found ${apiResults.length} API results for ${startOfDay.toDateString()}`);

    if (apiResults.length === 0) {
      console.log('⚠️  No API results found for the specified date');
      return;
    }

    // Group results by API endpoint
    const availabilityMap: Record<string, AvailabilityStats & APIIdentifier> = {};

    apiResults.forEach(result => {
      // Create unique key for each API endpoint
      const apiKey = `${result.run.collection.id}-${result.method}-${result.url}`;
      
      if (!availabilityMap[apiKey]) {
        availabilityMap[apiKey] = {
          apiName: result.requestName,
          method: result.method,
          url: result.url,
          collectionId: result.run.collection.id,
          successCount: 0,
          totalCount: 0,
          availability: 0
        };
      }

      availabilityMap[apiKey].totalCount++;
      if (result.success) {
        availabilityMap[apiKey].successCount++;
      }
    });

    // Calculate availability percentages
    Object.values(availabilityMap).forEach(stats => {
      stats.availability = stats.totalCount > 0 
        ? (stats.successCount / stats.totalCount) * 100 
        : 0;
    });

    console.log(`📈 Calculated availability for ${Object.keys(availabilityMap).length} unique API endpoints`);

    // Clear existing availability data for the date to avoid duplicates
    await prisma.aPIDailyAvailability.deleteMany({
      where: {
        date: startOfDay
      }
    });

    // Store availability data in database
    const availabilityRecords = Object.values(availabilityMap).map(stats => ({
      collectionId: stats.collectionId,
      apiName: stats.apiName,
      apiMethod: stats.method,
      apiUrl: stats.url,
      date: startOfDay,
      successCount: stats.successCount,
      totalCount: stats.totalCount,
      availability: Math.round(stats.availability * 100) / 100 // Round to 2 decimal places
    }));

    await prisma.aPIDailyAvailability.createMany({
      data: availabilityRecords
    });

    console.log(`✅ Successfully stored ${availabilityRecords.length} availability records for ${startOfDay.toDateString()}`);

    // Log summary statistics
    const totalApis = availabilityRecords.length;
    const averageAvailability = totalApis > 0 
      ? availabilityRecords.reduce((sum, record) => sum + record.availability, 0) / totalApis 
      : 0;
    const highAvailabilityApis = availabilityRecords.filter(record => record.availability >= 99).length;
    const lowAvailabilityApis = availabilityRecords.filter(record => record.availability < 90).length;

    console.log(`📊 Daily Availability Summary for ${startOfDay.toDateString()}:`);
    console.log(`   - Total APIs tracked: ${totalApis}`);
    console.log(`   - Average availability: ${averageAvailability.toFixed(2)}%`);
    console.log(`   - High availability (≥99%): ${highAvailabilityApis} APIs`);
    console.log(`   - Low availability (<90%): ${lowAvailabilityApis} APIs`);

  } catch (error) {
    console.error('❌ Error calculating daily availability:', error);
    throw error;
  }
};

/**
 * Calculate availability for a specific collection
 */
export const calculateCollectionAvailability = async (collectionId: string, targetDate?: Date): Promise<AvailabilityStats[]> => {
  const calculationDate = targetDate || new Date();
  const startOfDay = new Date(calculationDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(calculationDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const apiResults = await prisma.aPIRunResult.findMany({
      where: {
        run: {
          collectionId,
          startTime: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }
    });

    const availabilityMap: Record<string, AvailabilityStats> = {};

    apiResults.forEach(result => {
      const apiKey = `${result.method}-${result.url}`;
      
      if (!availabilityMap[apiKey]) {
        availabilityMap[apiKey] = {
          successCount: 0,
          totalCount: 0,
          availability: 0
        };
      }

      availabilityMap[apiKey].totalCount++;
      if (result.success) {
        availabilityMap[apiKey].successCount++;
      }
    });

    // Calculate availability percentages
    const results = Object.values(availabilityMap).map(stats => ({
      ...stats,
      availability: stats.totalCount > 0 
        ? (stats.successCount / stats.totalCount) * 100 
        : 0
    }));

    return results;
  } catch (error) {
    console.error('Error calculating collection availability:', error);
    throw error;
  }
};

/**
 * Get availability trends for a specific API over time
 */
export const getAPIAvailabilityTrend = async (
  collectionId: string, 
  apiMethod: string, 
  apiUrl: string, 
  days: number = 30
): Promise<any[]> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  try {
    const availabilityData = await prisma.aPIDailyAvailability.findMany({
      where: {
        collectionId,
        apiMethod,
        apiUrl,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    return availabilityData.map(record => ({
      date: record.date.toISOString().split('T')[0],
      availability: record.availability,
      successCount: record.successCount,
      totalCount: record.totalCount
    }));
  } catch (error) {
    console.error('Error getting API availability trend:', error);
    throw error;
  }
};

/**
 * Get overall system availability for a date range
 */
export const getSystemAvailability = async (startDate: Date, endDate: Date): Promise<{
  averageAvailability: number;
  totalAPIs: number;
  totalRequests: number;
  totalSuccessfulRequests: number;
  dailyBreakdown: any[];
}> => {
  try {
    const availabilityData = await prisma.aPIDailyAvailability.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    if (availabilityData.length === 0) {
      return {
        averageAvailability: 0,
        totalAPIs: 0,
        totalRequests: 0,
        totalSuccessfulRequests: 0,
        dailyBreakdown: []
      };
    }

    const totalRequests = availabilityData.reduce((sum, record) => sum + record.totalCount, 0);
    const totalSuccessfulRequests = availabilityData.reduce((sum, record) => sum + record.successCount, 0);
    const averageAvailability = totalRequests > 0 ? (totalSuccessfulRequests / totalRequests) * 100 : 0;

    // Group by date for daily breakdown
    const dailyData: Record<string, { totalApis: number; avgAvailability: number; totalRequests: number; successfulRequests: number }> = {};

    availabilityData.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          totalApis: 0,
          avgAvailability: 0,
          totalRequests: 0,
          successfulRequests: 0
        };
      }

      dailyData[dateKey].totalApis++;
      dailyData[dateKey].totalRequests += record.totalCount;
      dailyData[dateKey].successfulRequests += record.successCount;
    });

    // Calculate daily averages
    const dailyBreakdown = Object.entries(dailyData).map(([date, data]) => ({
      date,
      totalApis: data.totalApis,
      avgAvailability: data.totalRequests > 0 ? (data.successfulRequests / data.totalRequests) * 100 : 0,
      totalRequests: data.totalRequests,
      successfulRequests: data.successfulRequests
    }));

    return {
      averageAvailability: Math.round(averageAvailability * 100) / 100,
      totalAPIs: new Set(availabilityData.map(r => `${r.apiMethod}-${r.apiUrl}`)).size,
      totalRequests,
      totalSuccessfulRequests,
      dailyBreakdown
    };
  } catch (error) {
    console.error('Error getting system availability:', error);
    throw error;
  }
};

export default {
  calculateDailyAvailability,
  calculateCollectionAvailability,
  getAPIAvailabilityTrend,
  getSystemAvailability
};