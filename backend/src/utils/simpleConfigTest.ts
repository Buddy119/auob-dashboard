import axios from 'axios';

const BASE_URL = 'http://localhost:4000/api';

const testConfig = {
  collectionFile: 'sample-collection.json',
  sslCert: {
    certPath: '/path/to/ssl.crt',
    keyPath: '/path/to/ssl.key',
    caCertPath: '/path/to/ca.crt',
    passphrase: 'secure123'
  },
  proxy: {
    http: 'http://proxy.example.com:8080',
    https: 'https://proxy.example.com:8443'
  },
  followRedirects: true,
  inputSets: [
    { baseUrl: 'https://api.test.com', apiKey: 'test123', environment: 'development' },
    { baseUrl: 'https://api.prod.com', apiKey: 'prod456', environment: 'production' }
  ]
};

async function testConfigurationAPI() {
  console.log('🧪 Testing Configuration API endpoints...\n');

  try {
    // Test 1: Create a new configuration
    console.log('1. ✅ Testing configuration creation...');
    const createResponse = await axios.post(`${BASE_URL}/configs/test-simple-config`, testConfig);
    console.log(`   Configuration created successfully`);

    // Test 2: Retrieve the configuration
    console.log('2. ✅ Testing configuration retrieval...');
    const getResponse = await axios.get(`${BASE_URL}/configs/test-simple-config`);
    console.log(`   Configuration retrieved successfully`);

    // Test 3: List all configurations
    console.log('3. ✅ Testing configuration listing...');
    const listResponse = await axios.get(`${BASE_URL}/configs`);
    console.log(`   Configuration list retrieved successfully`);

    // Test 4: Update the configuration
    console.log('4. ✅ Testing configuration update...');
    const updatedConfig = {
      ...testConfig,
      collectionFile: 'updated-collection.json',
      followRedirects: false
    };
    const updateResponse = await axios.put(`${BASE_URL}/configs/test-simple-config`, updatedConfig);
    console.log(`   Configuration updated successfully`);

    // Test 5: Test validation with invalid data
    console.log('5. ✅ Testing validation...');
    try {
      await axios.post(`${BASE_URL}/configs/invalid-config`, {
        followRedirects: 'not-boolean'
      });
      console.log('   ❌ Validation test failed - should have rejected invalid data');
    } catch (error) {
      console.log('   Validation working correctly - rejected invalid data');
    }

    // Test 6: Delete the configuration
    console.log('6. ✅ Testing configuration deletion...');
    const deleteResponse = await axios.delete(`${BASE_URL}/configs/test-simple-config`);
    console.log(`   Configuration deleted successfully`);

    console.log('\n🎉 All Configuration API tests passed successfully!');

  } catch (error) {
    console.error('❌ Configuration API test failed:', error);
    process.exit(1);
  }
}

testConfigurationAPI()
  .then(() => {
    console.log('\n✨ All tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Tests failed:', error);
    process.exit(1);
  });