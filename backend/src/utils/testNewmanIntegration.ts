import { runCollectionTask, validateCollectionFile, getCollectionRunStats } from './newmanRunner';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNewmanIntegration() {
  console.log('🧪 Testing Newman Integration...\n');

  try {
    // Test 1: Validate collection file
    console.log('1. ✅ Testing collection file validation...');
    const isValid = validateCollectionFile('test-collection.json');
    if (!isValid) {
      throw new Error('Collection file validation failed');
    }
    console.log('   Collection file validated successfully');

    // Test 2: Run collection task (this would normally be called by BullMQ)
    console.log('2. ✅ Testing Newman collection execution...');
    const result = await runCollectionTask('test-collection-config');
    
    if (result.success) {
      console.log(`   Newman execution completed successfully`);
      console.log(`   - Config: ${result.configName}`);
      console.log(`   - Run ID: ${result.runId}`);
      console.log(`   - Timestamp: ${result.timestamp}`);
    } else {
      console.log(`   Newman execution failed: ${result.error}`);
    }

    // Test 3: Check database records were created
    console.log('3. ✅ Testing database record creation...');
    const collections = await prisma.collection.findMany({
      where: { configName: 'test-collection-config' },
      include: {
        Runs: {
          include: {
            apiResults: true
          }
        }
      }
    });

    if (collections.length > 0) {
      const collection = collections[0];
      console.log(`   Collection record found: ${collection.name}`);
      console.log(`   - Total runs: ${collection.Runs.length}`);
      
      if (collection.Runs.length > 0) {
        const latestRun = collection.Runs[collection.Runs.length - 1];
        console.log(`   - Latest run status: ${latestRun.status}`);
        console.log(`   - Total requests: ${latestRun.totalRequests}`);
        console.log(`   - Passed requests: ${latestRun.passedRequests}`);
        console.log(`   - Failed requests: ${latestRun.failedRequests}`);
        console.log(`   - API results stored: ${latestRun.apiResults.length}`);
      }
    } else {
      console.log('   No collection records found - this might indicate an error');
    }

    // Test 4: Get collection statistics
    console.log('4. ✅ Testing collection statistics...');
    const stats = await getCollectionRunStats('test-collection-config');
    if (stats) {
      console.log(`   Statistics retrieved successfully:`);
      console.log(`   - Total runs: ${stats.totalRuns}`);
      console.log(`   - Completed runs: ${stats.completedRuns}`);
      console.log(`   - Failed runs: ${stats.failedRuns}`);
      console.log(`   - Success rate: ${stats.successRate.toFixed(1)}%`);
    } else {
      console.log('   No statistics available');
    }

    console.log('\n🎉 Newman integration test completed successfully!');
    
    return {
      success: result.success,
      collectionsCreated: collections.length,
      totalRuns: collections.length > 0 ? collections[0].Runs.length : 0,
      totalApiResults: collections.length > 0 
        ? collections[0].Runs.reduce((sum, run) => sum + run.apiResults.length, 0) 
        : 0
    };

  } catch (error) {
    console.error('❌ Newman integration test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default testNewmanIntegration;

// Run test if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Newman integration test...');
  console.log('📝 This test validates Newman execution and database storage\n');

  // Start a minimal server for the test collection to call
  import('../index').then(async (app) => {
    // Give the server a moment to start
    setTimeout(async () => {
      try {
        const result = await testNewmanIntegration();
        
        console.log('\n📊 Test Summary:');
        console.log(`   - Execution successful: ${result.success}`);
        console.log(`   - Collections created: ${result.collectionsCreated}`);
        console.log(`   - Total runs: ${result.totalRuns}`);
        console.log(`   - Total API results: ${result.totalApiResults}`);
        
        process.exit(0);
      } catch (error) {
        console.error('\n💥 Newman integration test failed:', error);
        process.exit(1);
      }
    }, 2000);
  });
}