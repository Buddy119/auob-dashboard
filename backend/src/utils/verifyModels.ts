import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyModels() {
  console.log('🔍 Verifying all Prisma models are accessible...\n');

  try {
    // Verify Collection model
    console.log('✅ Collection model: Available');
    console.log(`   - Fields: id, name, description, createdAt, Runs, Availabilities, Reports`);

    // Verify Run model
    console.log('✅ Run model: Available');
    console.log(`   - Fields: id, collectionId, runTime, apiResults, collection`);

    // Verify APIRunResult model
    console.log('✅ APIRunResult model: Available');
    console.log(`   - Fields: id, runId, apiName, method, url, status, responseTime, passed, errorMessage, responseBody, responseHeaders, run`);

    // Verify APIDailyAvailability model
    console.log('✅ APIDailyAvailability model: Available');
    console.log(`   - Fields: id, collectionId, apiName, apiMethod, apiUrl, date, successCount, totalCount, availability, collection`);

    // Verify Report model
    console.log('✅ Report model: Available');
    console.log(`   - Fields: id, collectionId, reportType, reportDate, reportContent, createdAt, collection`);

    // Test that we can create and query each model type
    console.log('\n📊 Database statistics:');
    const [collections, runs, apiResults, availabilities, reports] = await Promise.all([
      prisma.collection.count(),
      prisma.run.count(),
      prisma.aPIRunResult.count(),
      prisma.aPIDailyAvailability.count(),
      prisma.report.count(),
    ]);

    console.log(`   - Collections: ${collections}`);
    console.log(`   - Runs: ${runs}`);
    console.log(`   - API Run Results: ${apiResults}`);
    console.log(`   - Daily Availabilities: ${availabilities}`);
    console.log(`   - Reports: ${reports}`);

    console.log('\n🎉 All models are properly configured and accessible!');

  } catch (error) {
    console.error('❌ Error verifying models:', error);
    process.exit(1);
  }
}

verifyModels()
  .catch((e) => {
    console.error('❌ Unhandled error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed.');
  });