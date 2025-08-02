import axios, { AxiosError } from 'axios';
import { CollectionConfig } from './types';

const BASE_URL = 'http://localhost:4000/api';

const testConfig: CollectionConfig = {
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
    console.log('1. Testing configuration creation...');
    const createResponse = await axios.post(`${BASE_URL}/configs/test-api-config`, testConfig);
    console.log(`✅ Configuration created: ${createResponse.data.message}`);
    console.log(`   - Config name: ${createResponse.data.configName}`);
    console.log(`   - Timestamp: ${createResponse.data.timestamp}`);

    // Test 2: Retrieve the configuration
    console.log('\n2. Testing configuration retrieval...');
    const getResponse = await axios.get(`${BASE_URL}/configs/test-api-config`);
    console.log('✅ Configuration retrieved successfully');
    console.log(`   - Collection file: ${getResponse.data.collectionFile}`);
    console.log(`   - Follow redirects: ${getResponse.data.followRedirects}`);
    console.log(`   - SSL configured: ${getResponse.data.sslCert ? 'Yes' : 'No'}`);
    console.log(`   - Proxy configured: ${getResponse.data.proxy ? 'Yes' : 'No'}`);
    console.log(`   - Input sets: ${getResponse.data.inputSets ? getResponse.data.inputSets.length : 0}`);

    // Test 3: List all configurations
    console.log('\n3. Testing configuration listing...');
    const listResponse = await axios.get(`${BASE_URL}/configs`);
    console.log('✅ Configuration list retrieved successfully');
    console.log(`   - Total configurations: ${listResponse.data.total}`);
    listResponse.data.configs.forEach((config: any, index: number) => {
      console.log(`   - Config ${index + 1}: ${config.name} (${config.displayName})`);
    });

    // Test 4: Update the configuration
    console.log('\n4. Testing configuration update...');
    const updatedConfig: CollectionConfig = {
      ...testConfig,
      collectionFile: 'updated-collection.json',
      followRedirects: false,
      inputSets: [
        { baseUrl: 'https://updated.api.com', apiKey: 'updated789' }
      ]
    };
    const updateResponse = await axios.put(`${BASE_URL}/configs/test-api-config`, updatedConfig);
    console.log(`✅ Configuration updated: ${updateResponse.data.message}`);

    // Test 5: Verify the update
    console.log('\n5. Testing updated configuration retrieval...');
    const updatedGetResponse = await axios.get(`${BASE_URL}/configs/test-api-config`);
    console.log('✅ Updated configuration retrieved successfully');
    console.log(`   - Collection file: ${updatedGetResponse.data.collectionFile}`);
    console.log(`   - Follow redirects: ${updatedGetResponse.data.followRedirects}`);
    console.log(`   - Input sets: ${updatedGetResponse.data.inputSets.length}`);

    // Test 6: Test validation with invalid data
    console.log('\n6. Testing validation with invalid configuration...');
    try {
      await axios.post(`${BASE_URL}/configs/invalid-config`, {
        followRedirects: 'not-boolean',
        proxy: { http: 'invalid-url' }
      });
      console.log('❌ Validation test failed - should have rejected invalid data');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        console.log('✅ Validation working correctly - rejected invalid data');
        console.log(`   - Error: ${error.response.data.message}`);
        console.log(`   - Details: ${error.response.data.details?.join(', ')}`);
      } else {
        throw error;
      }
    }

    // Test 7: Test duplicate configuration creation
    console.log('\n7. Testing duplicate configuration prevention...');
    try {
      await axios.post(`${BASE_URL}/configs/test-api-config`, testConfig);
      console.log('❌ Duplicate prevention test failed - should have rejected duplicate');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        console.log('✅ Duplicate prevention working correctly');
        console.log(`   - Error: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // Test 8: Test getting non-existent configuration
    console.log('\n8. Testing non-existent configuration retrieval...');
    try {
      await axios.get(`${BASE_URL}/configs/non-existent-config`);
      console.log('❌ Non-existent config test failed - should have returned 404');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('✅ Non-existent configuration handling working correctly');
        console.log(`   - Error: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // Test 9: Delete the configuration
    console.log('\n9. Testing configuration deletion...');
    const deleteResponse = await axios.delete(`${BASE_URL}/configs/test-api-config`);
    console.log(`✅ Configuration deleted: ${deleteResponse.data.message}`);

    // Test 10: Verify deletion
    console.log('\n10. Testing deleted configuration retrieval...');
    try {
      await axios.get(`${BASE_URL}/configs/test-api-config`);
      console.log('❌ Deletion verification failed - configuration still exists');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('✅ Configuration deletion verified - configuration no longer exists');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All Configuration API tests passed successfully!');

  } catch (error) {
    console.error('❌ Configuration API test failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('   - Status:', error.response?.status);
      console.error('   - Data:', error.response?.data);
    }
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('🚀 Starting Configuration API tests...');
  console.log('⚠️  Make sure the server is running on http://localhost:4000\n');
  
  testConfigurationAPI()
    .then(() => {
      console.log('\n✨ All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tests failed:', error);
      process.exit(1);
    });
}

export default testConfigurationAPI;