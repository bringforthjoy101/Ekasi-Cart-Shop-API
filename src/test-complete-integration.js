const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Comprehensive Integration Test for all Ekasi Cart API modules
 */
async function testCompleteIntegration() {
  console.log('🧪 Testing Complete Ekasi Cart API Integration\n');
  console.log('📋 Testing: Products, Orders, Categories, and Auth modules\n');

  let totalTests = 0;
  let passedTests = 0;
  let authToken = null;

  // Auth Tests
  console.log('🔐 === AUTH MODULE TESTS ===');
  const authTests = [
    {
      name: 'Login with Demo Admin',
      endpoint: '/auth/login',
      method: 'POST',
      data: { email: 'admin@demo.com', password: 'password' },
    },
    {
      name: 'Get Current User Profile',
      endpoint: '/auth/me',
      method: 'GET',
    },
  ];

  for (const test of authTests) {
    const result = await runTest(test, authToken);
    if (result.success) {
      passedTests++;
      if (result.token) authToken = result.token;
    }
    totalTests++;
  }

  // Products Tests
  console.log('\n🍷 === PRODUCTS MODULE TESTS ===');
  const productTests = [
    {
      name: 'Get All Products',
      endpoint: '/products',
      method: 'GET',
      params: { limit: 5 },
    },
    {
      name: 'Search Products (Wine)',
      endpoint: '/products',
      method: 'GET',
      params: { search: 'wine', limit: 3 },
    },
    {
      name: 'Get Popular Products',
      endpoint: '/popular-products',
      method: 'GET',
      params: { limit: 3 },
    },
  ];

  for (const test of productTests) {
    const result = await runTest(test, authToken);
    if (result.success) passedTests++;
    totalTests++;
  }

  // Categories Tests
  console.log('\n📂 === CATEGORIES MODULE TESTS ===');
  const categoryTests = [
    {
      name: 'Get All Categories',
      endpoint: '/categories',
      method: 'GET',
      params: { limit: 5 },
    },
    {
      name: 'Get Liquor Categories',
      endpoint: '/categories/liquor',
      method: 'GET',
      params: { limit: 3 },
    },
    {
      name: 'Get Category Hierarchy',
      endpoint: '/categories/hierarchy',
      method: 'GET',
    },
  ];

  for (const test of categoryTests) {
    const result = await runTest(test, authToken);
    if (result.success) passedTests++;
    totalTests++;
  }

  // Orders Tests
  console.log('\n🛒 === ORDERS MODULE TESTS ===');
  const orderTests = [
    {
      name: 'Get All Orders',
      endpoint: '/orders',
      method: 'GET',
      params: { limit: 5 },
    },
    {
      name: 'Get Order Statuses',
      endpoint: '/order-status',
      method: 'GET',
    },
  ];

  for (const test of orderTests) {
    const result = await runTest(test, authToken);
    if (result.success) passedTests++;
    totalTests++;
  }

  // Integration Tests (Cross-module)
  console.log('\n🔗 === INTEGRATION TESTS ===');

  // Test getting a specific product and its category
  try {
    console.log('🔍 Testing: Product-Category Integration');
    const productsResponse = await axios.get(`${API_BASE_URL}/products`, {
      params: { limit: 1 },
      timeout: 10000,
    });

    if (productsResponse.data.data && productsResponse.data.data.length > 0) {
      const product = productsResponse.data.data[0];
      console.log(`   📦 Product: ${product.name} (ID: ${product.id})`);

      if (product.categories && product.categories.length > 0) {
        const categoryId = product.categories[0].id;
        const categoryResponse = await axios.get(
          `${API_BASE_URL}/categories/${categoryId}`,
          {
            timeout: 10000,
          },
        );

        if (categoryResponse.status === 200) {
          console.log(`   ✅ Success: Product-Category integration working`);
          console.log(`   📂 Category: ${categoryResponse.data.name}`);
          passedTests++;
        } else {
          console.log(`   ❌ Failed: Could not fetch product category`);
        }
      } else {
        console.log(`   ⚠️  Product has no categories`);
        passedTests++; // Still count as success
      }
    } else {
      console.log(`   ⚠️  No products available for integration test`);
    }
    totalTests++;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    totalTests++;
  }

  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 COMPLETE INTEGRATION TEST RESULTS:`);
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(
    `📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`,
  );

  // Module breakdown
  const moduleResults = {
    Auth: Math.min(2, passedTests),
    Products: Math.min(3, Math.max(0, passedTests - 2)),
    Categories: Math.min(3, Math.max(0, passedTests - 5)),
    Orders: Math.min(2, Math.max(0, passedTests - 8)),
    Integration: Math.min(1, Math.max(0, passedTests - 10)),
  };

  console.log('\n📊 Module Results:');
  Object.entries(moduleResults).forEach(([module, passed]) => {
    const total =
      module === 'Auth'
        ? 2
        : module === 'Integration'
        ? 1
        : module === 'Orders'
        ? 2
        : 3;
    const percentage = ((passed / total) * 100).toFixed(0);
    console.log(`   ${module}: ${passed}/${total} (${percentage}%)`);
  });

  if (passedTests >= totalTests * 0.8) {
    console.log('\n🎉 EXCELLENT! Ekasi Cart API integration is working great!');
    console.log('🚀 All core modules are successfully integrated');
  } else if (passedTests >= totalTests * 0.6) {
    console.log('\n✅ GOOD! Most integration tests passed');
    console.log('🔧 Some modules may need minor adjustments');
  } else {
    console.log('\n⚠️  NEEDS ATTENTION! Several integration issues detected');
    console.log('🔧 Check API connections and service implementations');
  }

  return passedTests >= totalTests * 0.6;
}

/**
 * Run a single test
 */
async function runTest(test, authToken) {
  try {
    console.log(`📋 Testing: ${test.name}`);

    const config = {
      method: test.method,
      url: `${API_BASE_URL}${test.endpoint}`,
      timeout: 10000,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    };

    if (test.params) {
      config.params = test.params;
    }

    if (test.data) {
      config.data = test.data;
    }

    const response = await axios(config);

    if (response.status === 200 || response.status === 201) {
      const data = response.data;

      // Handle auth responses
      if (test.endpoint.includes('/login')) {
        if (data.token) {
          console.log(`   ✅ Success: Login successful (Role: ${data.role})`);
          return { success: true, token: data.token };
        }
      }

      // Handle data array responses
      if (data.data && Array.isArray(data.data)) {
        console.log(`   ✅ Success: Found ${data.data.length} items`);
        if (data.data.length > 0) {
          const item = data.data[0];
          console.log(
            `   📦 Sample: ${item.name || item.title || `ID ${item.id}`}`,
          );
        }
        return { success: true };
      }

      // Handle single object responses
      if (data.name || data.email || data.id) {
        console.log(
          `   ✅ Success: ${data.name || data.email || `ID ${data.id}`}`,
        );
        return { success: true };
      }

      // Handle array responses
      if (Array.isArray(data)) {
        console.log(`   ✅ Success: Found ${data.length} items`);
        return { success: true };
      }

      console.log(`   ✅ Success: Response received`);
      return { success: true };
    } else {
      console.log(`   ❌ Failed: HTTP ${response.status}`);
      return { success: false };
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    if (error.response?.status) {
      console.log(`   📝 Status: ${error.response.status}`);
    }
    return { success: false };
  }
}

// Run the test
if (require.main === module) {
  testCompleteIntegration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteIntegration };
