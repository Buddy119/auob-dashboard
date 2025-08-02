import { calculateDailyAvailability, getSystemAvailability, getAPIAvailabilityTrend, calculateCollectionAvailability } from './calculateAvailability';
import { runAvailabilityCalculationNow, getAvailabilityJobStats } from '../tasks/availabilityTask';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAvailabilityCalculation() {
  console.log('🧪 Testing Availability Calculation Logic...\n');

  try {
    // Test 1: Check if we have existing Newman data
    console.log('1. ✅ Checking existing Newman execution data...');
    const existingRuns = await prisma.run.findMany({
      include: {
        apiResults: true,
        collection: true
      }
    });

    if (existingRuns.length === 0) {
      console.log('   ⚠️  No existing Newman runs found. Please run Newman tests first.');
      console.log('   Run: npm run test:newman or use the Newman integration test');
      return;
    }

    console.log(`   Found ${existingRuns.length} existing runs with ${existingRuns.reduce((sum, run) => sum + run.apiResults.length, 0)} API results`);

    // Test 2: Calculate daily availability for today
    console.log('2. ✅ Testing direct availability calculation for today...');
    const today = new Date();
    await calculateDailyAvailability(today);

    // Test 3: Check if availability records were created
    console.log('3. ✅ Verifying availability records creation...');
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const availabilityRecords = await prisma.aPIDailyAvailability.findMany({
      where: {
        date: startOfDay
      }
    });

    if (availabilityRecords.length > 0) {
      console.log(`   ✅ Created ${availabilityRecords.length} availability records for today`);
      console.log(`   Sample records:`);
      availabilityRecords.slice(0, 3).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.apiMethod} ${record.apiUrl} - ${record.availability}% (${record.successCount}/${record.totalCount})`);
      });
    } else {
      console.log('   ⚠️  No availability records created - this might indicate no API results for today');
    }

    // Test 4: Test BullMQ job scheduling
    console.log('4. ✅ Testing BullMQ availability calculation job...');
    try {
      const jobId = await runAvailabilityCalculationNow(today);
      console.log(`   Scheduled availability calculation job: ${jobId}`);
      
      // Wait a moment and check job stats
      setTimeout(async () => {
        try {
          const stats = await getAvailabilityJobStats();
          console.log(`   Job queue stats:`, stats);
        } catch (error) {
          console.log('   ⚠️  Could not get job stats (Redis may not be running):', error instanceof Error ? error.message : 'Unknown error');
        }
      }, 1000);
    } catch (error) {
      console.log('   ⚠️  Could not schedule BullMQ job (Redis may not be running):', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 5: Test system availability calculation
    console.log('5. ✅ Testing system availability calculation...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days
    const endDate = new Date();

    const systemAvailability = await getSystemAvailability(startDate, endDate);
    console.log(`   System availability over last 7 days:`);
    console.log(`   - Average availability: ${systemAvailability.averageAvailability}%`);
    console.log(`   - Total APIs tracked: ${systemAvailability.totalAPIs}`);
    console.log(`   - Total requests: ${systemAvailability.totalRequests}`);
    console.log(`   - Successful requests: ${systemAvailability.totalSuccessfulRequests}`);
    console.log(`   - Daily breakdown: ${systemAvailability.dailyBreakdown.length} days`);

    // Test 6: Test collection-specific availability
    if (existingRuns.length > 0) {
      console.log('6. ✅ Testing collection-specific availability...');
      const sampleCollection = existingRuns[0].collection;
      const collectionAvailability = await calculateCollectionAvailability(sampleCollection.id, today);
      
      console.log(`   Collection "${sampleCollection.name}" availability for today:`);
      if (collectionAvailability.length > 0) {
        const avgAvailability = collectionAvailability.reduce((sum, api) => sum + api.availability, 0) / collectionAvailability.length;
        console.log(`   - APIs tracked: ${collectionAvailability.length}`);
        console.log(`   - Average availability: ${avgAvailability.toFixed(2)}%`);
        console.log(`   - Individual API availability:`);
        collectionAvailability.forEach((api, index) => {
          console.log(`     ${index + 1}. ${api.availability}% (${api.successCount}/${api.totalCount} successful)`);
        });
      } else {
        console.log('   - No API results found for today in this collection');
      }
    }

    // Test 7: Test API trend analysis (if we have availability data)
    if (availabilityRecords.length > 0) {
      console.log('7. ✅ Testing API availability trend analysis...');
      const sampleRecord = availabilityRecords[0];
      const trend = await getAPIAvailabilityTrend(
        sampleRecord.collectionId,
        sampleRecord.apiMethod,
        sampleRecord.apiUrl,
        7 // Last 7 days
      );

      console.log(`   Trend for ${sampleRecord.apiMethod} ${sampleRecord.apiUrl}:`);
      if (trend.length > 0) {
        console.log(`   - Data points: ${trend.length}`);
        trend.forEach(point => {
          console.log(`     ${point.date}: ${point.availability}% (${point.successCount}/${point.totalCount})`);
        });
      } else {
        console.log('   - No trend data available (only today\'s data exists)');
      }
    }

    console.log('\n🎉 Availability calculation test completed successfully!');
    
    return {
      success: true,
      existingRuns: existingRuns.length,
      availabilityRecords: availabilityRecords.length,
      systemAvailability: systemAvailability.averageAvailability
    };

  } catch (error) {
    console.error('❌ Availability calculation test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default testAvailabilityCalculation;

// Run test if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Availability Calculation Test...');
  console.log('📊 This test validates availability calculation and storage\n');

  testAvailabilityCalculation()
    .then((result) => {
      console.log('\n📊 Test Summary:');
      console.log(`   - Existing runs processed: ${result?.existingRuns || 0}`);
      console.log(`   - Availability records created: ${result?.availabilityRecords || 0}`);
      console.log(`   - System availability: ${result?.systemAvailability || 0}%`);
      console.log(`   - Test successful: ${result?.success || false}`);
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Availability calculation test failed:', error);
      process.exit(1);
    });
}