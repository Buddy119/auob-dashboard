import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔗 Testing Prisma database connectivity...\n');

  try {
    // Test basic connectivity
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test querying empty collections
    console.log('2. Testing Collection model query...');
    const collections = await prisma.collection.findMany();
    console.log(`✅ Collections query successful. Found ${collections.length} collections.`);

    // Test creating a sample collection
    console.log('3. Testing Collection creation...');
    const testCollection = await prisma.collection.create({
      data: {
        name: 'Test Collection',
        description: 'A test collection for verifying Prisma setup',
      },
    });
    console.log(`✅ Collection created successfully with ID: ${testCollection.id}`);

    // Test creating a sample run
    console.log('4. Testing Run creation...');
    const testRun = await prisma.run.create({
      data: {
        collectionId: testCollection.id,
      },
    });
    console.log(`✅ Run created successfully with ID: ${testRun.id}`);

    // Test creating an API result
    console.log('5. Testing APIRunResult creation...');
    const testResult = await prisma.aPIRunResult.create({
      data: {
        runId: testRun.id,
        apiName: 'Test API',
        method: 'GET',
        url: 'https://api.example.com/test',
        status: 200,
        responseTime: 150,
        passed: true,
        responseBody: { message: 'Success' },
        responseHeaders: { 'content-type': 'application/json' },
      },
    });
    console.log(`✅ APIRunResult created successfully with ID: ${testResult.id}`);

    // Test creating daily availability record
    console.log('6. Testing APIDailyAvailability creation...');
    const testAvailability = await prisma.aPIDailyAvailability.create({
      data: {
        collectionId: testCollection.id,
        apiName: 'Test API',
        apiMethod: 'GET',
        apiUrl: 'https://api.example.com/test',
        date: new Date(),
        successCount: 95,
        totalCount: 100,
        availability: 95.0,
      },
    });
    console.log(`✅ APIDailyAvailability created successfully with ID: ${testAvailability.id}`);

    // Test creating a report
    console.log('7. Testing Report creation...');
    const testReport = await prisma.report.create({
      data: {
        collectionId: testCollection.id,
        reportType: 'DAILY_SUMMARY',
        reportDate: new Date(),
        reportContent: 'This is a test report content',
      },
    });
    console.log(`✅ Report created successfully with ID: ${testReport.id}`);

    // Test complex query with relations
    console.log('8. Testing complex query with relations...');
    const collectionWithData = await prisma.collection.findFirst({
      include: {
        Runs: {
          include: {
            apiResults: true,
          },
        },
        Availabilities: true,
        Reports: true,
      },
    });
    console.log(`✅ Complex query successful. Collection has:`);
    console.log(`   - ${collectionWithData?.Runs.length || 0} runs`);
    console.log(`   - ${collectionWithData?.Runs[0]?.apiResults.length || 0} API results`);
    console.log(`   - ${collectionWithData?.Availabilities.length || 0} availability records`);
    console.log(`   - ${collectionWithData?.Reports.length || 0} reports`);

    // Clean up test data
    console.log('9. Cleaning up test data...');
    await prisma.aPIRunResult.deleteMany();
    await prisma.run.deleteMany();
    await prisma.aPIDailyAvailability.deleteMany();
    await prisma.report.deleteMany();
    await prisma.collection.deleteMany();
    console.log('✅ Test data cleaned up successfully');

    console.log('\n🎉 All Prisma tests passed! Database setup is working correctly.');

  } catch (error) {
    console.error('❌ Error testing Prisma:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Unhandled error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed.');
  });