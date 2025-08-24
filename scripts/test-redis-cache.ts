// scripts/test-redis-cache.ts
// Test script to validate Redis connectivity and caching
// Run with: npx tsx scripts/test-redis-cache.ts

import { health, setKV, getKV } from '../lib/cache/redisBridge';
import { loadTripDataOptimized } from '../lib/cache/trip-loader';
import { TripCacheService, getTripDataFast } from '../lib/cache/trip-cache-service';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRedisConnection() {
  log('\n🔌 Testing Redis Connection...', 'blue');
  
  try {
    const healthCheck = await health();
    log(`✅ Redis is ${healthCheck.redis}`, 'green');
    log(`   Status: ${healthCheck.status}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Redis connection failed: ${error}`, 'red');
    return false;
  }
}

async function testBasicOperations() {
  log('\n📝 Testing Basic Redis Operations...', 'blue');
  
  try {
    const testKey = `test:${Date.now()}`;
    const testValue = { 
      message: 'Hello from TripNotes!', 
      timestamp: new Date().toISOString(),
      data: { trips: 10, users: 5 }
    };
    
    // Test SET
    log('  Setting test value...', 'yellow');
    const setResult = await setKV({
      key: testKey,
      value: JSON.stringify(testValue),
      ttl_seconds: 60,
    });
    log(`  ✅ SET successful: ${setResult.ok}`, 'green');
    
    // Test GET
    log('  Getting test value...', 'yellow');
    const getResult = await getKV(testKey);
    const retrieved = getResult.value ? JSON.parse(getResult.value) : null;
    
    if (retrieved && retrieved.message === testValue.message) {
      log(`  ✅ GET successful: ${retrieved.message}`, 'green');
      return true;
    } else {
      log(`  ❌ GET failed: value mismatch`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Basic operations failed: ${error}`, 'red');
    return false;
  }
}

async function testTripCaching(tripId?: string) {
  log('\n🗺️ Testing Trip Cache Service...', 'blue');
  
  // Use a test trip ID or create a mock one
  const testTripId = tripId || 'test-trip-123';
  
  try {
    // Create mock trip data for testing
    const mockTripData = {
      id: testTripId,
      creatorId: 'test-user-123',
      title: 'Test Trip to Tokyo',
      subtitle: '7 days of adventure',
      description: 'An amazing journey through Japan',
      destination: 'Tokyo, Japan',
      durationDays: 7,
      priceCents: 2500,
      currency: 'USD',
      status: 'draft',
      season: 'Spring',
      budgetRange: '$500-$1000',
      tripStyle: 'Adventure',
      coverImageUrl: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      days: [
        {
          id: 'day-1',
          tripId: testTripId,
          dayNumber: 1,
          title: 'Arrival in Tokyo',
          subtitle: 'Settle in and explore Shinjuku',
          activities: [
            {
              id: 'activity-1',
              dayId: 'day-1',
              timeBlock: 'morning',
              description: 'Airport pickup and hotel check-in',
              orderIndex: 1,
              gems: [],
            },
          ],
        },
      ],
    };

    // Test SET in cache
    log('  Caching trip data...', 'yellow');
    const cacheStart = performance.now();
    await TripCacheService.set(testTripId, mockTripData as any, 60);
    const cacheTime = performance.now() - cacheStart;
    log(`  ✅ Trip cached in ${cacheTime.toFixed(2)}ms`, 'green');

    // Test GET from cache
    log('  Retrieving from cache...', 'yellow');
    const getStart = performance.now();
    const cachedData = await TripCacheService.get(testTripId);
    const getTime = performance.now() - getStart;
    
    if (cachedData && cachedData.title === mockTripData.title) {
      log(`  ✅ Trip retrieved from cache in ${getTime.toFixed(2)}ms`, 'green');
      log(`     Title: ${cachedData.title}`, 'green');
      log(`     Days: ${cachedData.days.length}`, 'green');
    } else {
      log(`  ❌ Cache retrieval failed`, 'red');
      return false;
    }

    // Test cache invalidation
    log('  Testing cache invalidation...', 'yellow');
    await TripCacheService.invalidate(testTripId);
    log(`  ✅ Cache invalidated`, 'green');

    return true;
  } catch (error) {
    log(`❌ Trip caching failed: ${error}`, 'red');
    return false;
  }
}

async function testPerformance() {
  log('\n⚡ Testing Cache Performance...', 'blue');
  
  const iterations = 10;
  const testKey = 'perf-test';
  const testData = {
    id: 'trip-123',
    title: 'Performance Test Trip',
    data: Array(100).fill('Some data to make the payload bigger'),
  };
  
  try {
    // Warm up
    await setKV({
      key: testKey,
      value: JSON.stringify(testData),
      ttl_seconds: 60,
    });

    // Test read performance
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await getKV(testKey);
      const elapsed = performance.now() - start;
      times.push(elapsed);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    log(`  📊 Performance Results (${iterations} reads):`, 'green');
    log(`     Average: ${avg.toFixed(2)}ms`, 'green');
    log(`     Min: ${min.toFixed(2)}ms`, 'green');
    log(`     Max: ${max.toFixed(2)}ms`, 'green');
    log(`     P95: ${p95.toFixed(2)}ms`, 'green');
    
    return true;
  } catch (error) {
    log(`❌ Performance test failed: ${error}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting TripNotes Redis Cache Tests', 'blue');
  log('=' .repeat(50), 'blue');
  
  // Check environment variables
  log('\n🔐 Checking Environment Variables...', 'blue');
  const requiredVars = [
    'REDIS_BRIDGE_BASE',
    'CF_ACCESS_CLIENT_ID',
    'CF_ACCESS_CLIENT_SECRET'
  ];
  
  let envValid = true;
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      log(`  ✅ ${varName} is set`, 'green');
    } else {
      log(`  ❌ ${varName} is missing`, 'red');
      envValid = false;
    }
  }
  
  if (!envValid) {
    log('\n❌ Missing required environment variables. Please check your .env.local file', 'red');
    process.exit(1);
  }

  // Run tests
  const results = {
    connection: await testRedisConnection(),
    basicOps: false,
    tripCache: false,
    performance: false,
  };

  if (results.connection) {
    results.basicOps = await testBasicOperations();
    results.tripCache = await testTripCaching();
    results.performance = await testPerformance();
  }

  // Summary
  log('\n' + '=' .repeat(50), 'blue');
  log('📋 Test Summary:', 'blue');
  
  const allPassed = Object.values(results).every(r => r);
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`  ${icon} ${test}: ${passed ? 'PASSED' : 'FAILED'}`, color);
  });

  if (allPassed) {
    log('\n🎉 All tests passed! Redis cache is ready for use.', 'green');
    log('\nNext steps:', 'yellow');
    log('  1. Update your editor pages to use getTripDataFast()', 'yellow');
    log('  2. Add cache invalidation to your save actions', 'yellow');
    log('  3. Monitor cache performance in production', 'yellow');
  } else {
    log('\n⚠️ Some tests failed. Please check the errors above.', 'red');
  }

  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  log(`\n💥 Unexpected error: ${error}`, 'red');
  process.exit(1);
});