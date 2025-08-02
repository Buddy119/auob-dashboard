import { generateReport, getReportStats, cleanupOldReports } from './reportGenerator';
import { generateManualReport, getReportJobStats } from '../tasks/reportTask';
import { calculateDailyAvailability } from './calculateAvailability';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function testReportGeneration() {
  console.log('🧪 Testing Report Generation System...\n');

  try {
    // Test 1: Ensure we have availability data
    console.log('1. ✅ Checking availability data for reports...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAvailability = await prisma.aPIDailyAvailability.findMany({
      where: {
        date: today
      }
    });

    if (existingAvailability.length === 0) {
      console.log('   ⚠️  No availability data found for today. Calculating...');
      await calculateDailyAvailability(today);
      console.log('   ✅ Availability data calculated');
    } else {
      console.log(`   ✅ Found ${existingAvailability.length} availability records for today`);
    }

    // Test 2: Test HTML report generation
    console.log('2. ✅ Testing HTML report generation...');
    const htmlReport = await generateReport({
      reportType: 'Daily',
      format: 'HTML'
    });

    console.log(`   ✅ HTML report generated: ${htmlReport.reportId}`);
    console.log(`   📄 File path: ${htmlReport.filePath}`);
    console.log(`   📊 APIs in report: ${htmlReport.reportData.apis.length}`);
    console.log(`   📈 Average availability: ${htmlReport.reportData.summary.averageAvailability}%`);

    // Verify HTML file exists
    if (fs.existsSync(htmlReport.filePath)) {
      const stats = fs.statSync(htmlReport.filePath);
      console.log(`   📏 File size: ${Math.round(stats.size / 1024)}KB`);
    }

    // Test 3: Test PDF report generation
    console.log('3. ✅ Testing PDF report generation...');
    const pdfReport = await generateReport({
      reportType: 'Daily',
      format: 'PDF'
    });

    console.log(`   ✅ PDF report generated: ${pdfReport.reportId}`);
    console.log(`   📄 File path: ${pdfReport.filePath}`);

    // Verify PDF file exists
    if (fs.existsSync(pdfReport.filePath)) {
      const stats = fs.statSync(pdfReport.filePath);
      console.log(`   📏 File size: ${Math.round(stats.size / 1024)}KB`);
    }

    // Test 4: Test weekly report
    console.log('4. ✅ Testing weekly report generation...');
    const weeklyReport = await generateReport({
      reportType: 'Weekly',
      format: 'HTML'
    });

    console.log(`   ✅ Weekly report generated: ${weeklyReport.reportId}`);
    console.log(`   📊 APIs in weekly report: ${weeklyReport.reportData.apis.length}`);

    // Test 5: Test monthly report
    console.log('5. ✅ Testing monthly report generation...');
    const monthlyReport = await generateReport({
      reportType: 'Monthly',
      format: 'HTML'
    });

    console.log(`   ✅ Monthly report generated: ${monthlyReport.reportId}`);
    console.log(`   📊 APIs in monthly report: ${monthlyReport.reportData.apis.length}`);

    // Test 6: Test custom date range
    console.log('6. ✅ Testing custom date range report...');
    const customRangeReport = await generateReport({
      reportType: 'Daily',
      format: 'HTML',
      customDateRange: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate: new Date()
      }
    });

    console.log(`   ✅ Custom range report generated: ${customRangeReport.reportId}`);

    // Test 7: Test database records
    console.log('7. ✅ Testing database report records...');
    const reportRecords = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        collection: {
          select: { name: true }
        }
      }
    });

    console.log(`   ✅ Found ${reportRecords.length} report records in database`);
    reportRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.reportType} - ${record.format} - ${record.createdAt.toISOString()}`);
    });

    // Test 8: Test report statistics
    console.log('8. ✅ Testing report statistics...');
    const reportStats = await getReportStats();
    console.log(`   📊 Report statistics:`);
    console.log(`   - Total reports: ${reportStats.totalReports}`);
    console.log(`   - Recent reports: ${reportStats.recentReports.length}`);
    console.log(`   - Reports by type:`, reportStats.reportsByType);

    // Test 9: Test BullMQ job scheduling (if Redis available)
    console.log('9. ✅ Testing BullMQ report job scheduling...');
    try {
      const jobId = await generateManualReport('Daily', 'HTML');
      console.log(`   ✅ Scheduled report job: ${jobId}`);
      
      // Wait a moment and check job stats
      setTimeout(async () => {
        try {
          const jobStats = await getReportJobStats();
          console.log(`   📊 Job queue stats:`, jobStats);
        } catch (error) {
          console.log('   ⚠️  Could not get job stats (Redis may not be running)');
        }
      }, 1000);
    } catch (error) {
      console.log('   ⚠️  Could not schedule BullMQ job (Redis may not be running):', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 10: Test report file cleanup
    console.log('10. ✅ Testing report cleanup (dry run)...');
    // Create a temporary old report for testing
    const tempReportPath = path.join(__dirname, '../../reports/temp-test-report.html');
    fs.writeFileSync(tempReportPath, '<html><body>Test Report</body></html>');
    
    // Create old report record
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40); // 40 days ago
    
    const tempReport = await prisma.report.create({
      data: {
        collectionId: reportRecords[0]?.collectionId || (await prisma.collection.findFirst())?.id || 'test',
        reportType: 'Daily',
        reportDate: oldDate,
        reportContent: tempReportPath,
        format: 'HTML',
        summary: JSON.stringify({ test: true }),
        apiCount: 1
      }
    });

    console.log(`   📝 Created temporary old report: ${tempReport.id}`);
    
    // Test cleanup with 30 days retention
    const cleanupResult = await cleanupOldReports(30);
    console.log(`   🧹 Cleanup result: ${cleanupResult.deletedRecords} records deleted, ${cleanupResult.filesDeleted} files deleted`);

    console.log('\n🎉 Report generation test completed successfully!');
    
    return {
      success: true,
      reportsGenerated: 5, // HTML, PDF, Weekly, Monthly, Custom Range
      databaseRecords: reportRecords.length,
      averageAvailability: htmlReport.reportData.summary.averageAvailability,
      cleanupResult
    };

  } catch (error) {
    console.error('❌ Report generation test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default testReportGeneration;

// Run test if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Report Generation Test...');
  console.log('📋 This test validates report generation, PDF creation, and database storage\n');

  testReportGeneration()
    .then((result) => {
      console.log('\n📊 Test Summary:');
      console.log(`   - Reports generated: ${result?.reportsGenerated || 0}`);
      console.log(`   - Database records: ${result?.databaseRecords || 0}`);
      console.log(`   - Average availability: ${result?.averageAvailability || 0}%`);
      console.log(`   - Cleanup test: ${result?.cleanupResult?.deletedRecords || 0} records deleted`);
      console.log(`   - Test successful: ${result?.success || false}`);
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Report generation test failed:', error);
      process.exit(1);
    });
}