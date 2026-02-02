/**
 * Test configuration for Playwright E2E tests
 * Follows the same pattern as server/config.js
 */

export const testConfig = {
  // Base URLs
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.SERVER_PORT}`,
  apiUrl: process.env.API_URL || `http://localhost:${process.env.SERVER_PORT}/api`,

  // Test user credentials
  testUsers: {
    admin: {
      username: process.env.TEST_ADMIN_USER || 'admin@test.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'Admin123!',
      fullName: 'Test Admin'
    },
    operator: {
      username: process.env.TEST_OPERATOR_USER || 'operator@test.com',
      password: process.env.TEST_OPERATOR_PASSWORD || 'Operator123!',
      fullName: 'Test Operator'
    },
    viewer: {
      username: process.env.TEST_VIEWER_USER || 'viewer@test.com',
      password: process.env.TEST_VIEWER_PASSWORD || 'Viewer123!',
      fullName: 'Test Viewer'
    }
  },

  // Test entity and plant IDs
  testEntity: {
    entityId: process.env.TEST_ENTITY_ID || '00000000-0000-0000-0000-000000000001',
    plantId: process.env.TEST_PLANT_ID || '00000000-0000-0000-0000-000000000001'
  },

  // Timeouts
  timeouts: {
    navigation: 30000,
    action: 10000,
    assertion: 5000
  },

  // Test data
  testData: {
    vendorCode: 'TEST-VENDOR',
    productCode: 'TEST-PRODUCT',
    operationCode: 'TEST-OP'
  }
}
