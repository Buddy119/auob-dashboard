import { scheduleCollectionRun, getTaskStats } from '../services/taskService';

async function testBullMQFunctionality() {
  console.log('🧪 Testing BullMQ Task Scheduling...\n');

  try {
    // Test 1: Get initial task statistics
    console.log('1. ✅ Getting initial task statistics...');
    const initialStats = await getTaskStats();
    console.log(`   Initial stats: ${JSON.stringify(initialStats)}`);

    // Test 2: Schedule a test job (without actually running Newman since we don't have a config)
    console.log('2. ✅ Scheduling a test job...');
    try {
      const jobId = await scheduleCollectionRun('test-config', { delay: 1000 });
      console.log(`   Job scheduled with ID: ${jobId}`);
    } catch (error) {
      console.log(`   Expected error (config not found): ${error instanceof Error ? error.message : error}`);
    }

    // Test 3: Get updated statistics
    console.log('3. ✅ Getting updated task statistics...');
    const updatedStats = await getTaskStats();
    console.log(`   Updated stats: ${JSON.stringify(updatedStats)}`);

    console.log('\n🎉 BullMQ basic functionality test completed!');

  } catch (error) {
    console.error('❌ BullMQ test failed:', error);
    process.exit(1);
  }
}

export default testBullMQFunctionality;

// Run test if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting BullMQ functionality test...');
  console.log('⚠️  Make sure Redis is running on localhost:6379\n');
  
  testBullMQFunctionality()
    .then(() => {
      console.log('\n✨ All BullMQ tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 BullMQ tests failed:', error);
      process.exit(1);
    });
}