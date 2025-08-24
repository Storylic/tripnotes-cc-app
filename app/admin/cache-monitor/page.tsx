// app/admin/cache-monitor/page.tsx
// Real-time cache performance monitoring dashboard

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CacheStats {
  redis: 'up' | 'down';
  status: string;
  timestamp: string;
  performance?: {
    avgLatency: number;
    p95Latency: number;
    hitRate: number;
  };
}

interface TestResult {
  operation: string;
  latency: number;
  success: boolean;
  timestamp: string;
}

export default function CacheMonitorPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  // Fetch cache stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/cache/stats');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch stats');
      }
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Run performance test
  const runPerformanceTest = async () => {
    setTesting(true);
    const results: TestResult[] = [];

    try {
      // Test 1: Simple SET/GET
      const testKey = `perf-test-${Date.now()}`;
      const testValue = { test: true, timestamp: new Date().toISOString() };
      
      // Test SET
      const setStart = performance.now();
      const setRes = await fetch('/api/cache/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operation: 'set',
          key: testKey,
          value: testValue,
          ttl: 60,
        }),
      });
      const setLatency = performance.now() - setStart;
      
      results.push({
        operation: 'SET',
        latency: setLatency,
        success: setRes.ok,
        timestamp: new Date().toISOString(),
      });

      // Test GET
      const getStart = performance.now();
      const getRes = await fetch('/api/cache/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operation: 'get',
          key: testKey,
        }),
      });
      const getLatency = performance.now() - getStart;
      
      results.push({
        operation: 'GET',
        latency: getLatency,
        success: getRes.ok,
        timestamp: new Date().toISOString(),
      });

      // Test Trip Load (more realistic)
      const tripStart = performance.now();
      const tripRes = await fetch('/api/cache/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operation: 'trip-load',
          tripId: 'test-trip-123',
        }),
      });
      const tripLatency = performance.now() - tripStart;
      
      results.push({
        operation: 'Trip Load',
        latency: tripLatency,
        success: tripRes.ok,
        timestamp: new Date().toISOString(),
      });

      setTestResults(prev => [...results, ...prev].slice(0, 20)); // Keep last 20 results
    } catch (error) {
      console.error('Performance test error:', error);
    } finally {
      setTesting(false);
    }
  };

  // Warm cache for user's trips
  const warmCache = async () => {
    try {
      const res = await fetch('/api/cache/warm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tripIds: [], // Will be filled from user's trips
        }),
      });
      
      if (res.ok) {
        alert('Cache warming started in background');
      }
    } catch (error) {
      console.error('Cache warm error:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
        <div className="text-gray-500">Loading cache stats...</div>
      </div>
    );
  }

  const avgLatency = testResults.length > 0
    ? testResults.reduce((sum, r) => sum + r.latency, 0) / testResults.length
    : 0;

  const successRate = testResults.length > 0
    ? (testResults.filter(r => r.success).length / testResults.length) * 100
    : 100;

  return (
    <div className="min-h-screen bg-[var(--color-paper)] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl text-[var(--color-ink)] mb-8">
          Cache Performance Monitor
        </h1>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded border border-[var(--color-pencil-gray)] p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Redis Status</h3>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                stats?.redis === 'up' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-xl font-bold">
                {stats?.redis === 'up' ? 'Operational' : 'Down'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Last checked: {stats ? new Date(stats.timestamp).toLocaleTimeString() : 'N/A'}
            </p>
          </div>

          <div className="bg-white rounded border border-[var(--color-pencil-gray)] p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Average Latency</h3>
            <div className="text-xl font-bold">
              {avgLatency.toFixed(2)} ms
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Based on {testResults.length} recent tests
            </p>
          </div>

          <div className="bg-white rounded border border-[var(--color-pencil-gray)] p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Success Rate</h3>
            <div className="text-xl font-bold">
              {successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {testResults.filter(r => r.success).length}/{testResults.length} successful
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded border border-[var(--color-pencil-gray)] p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4">Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={runPerformanceTest}
              disabled={testing}
              className="px-4 py-2 bg-[var(--color-ink)] text-white rounded hover:opacity-90 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Run Performance Test'}
            </button>
            <button
              onClick={warmCache}
              className="px-4 py-2 border border-[var(--color-ink)] text-[var(--color-ink)] rounded hover:bg-gray-50"
            >
              Warm Cache
            </button>
            <button
              onClick={fetchStats}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Refresh Stats
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white rounded border border-[var(--color-pencil-gray)] p-6">
            <h2 className="font-semibold text-lg mb-4">Recent Test Results</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Operation</th>
                    <th className="text-left py-2">Latency</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">{result.operation}</td>
                      <td className="py-2">
                        <span className={
                          result.latency < 20 ? 'text-green-600' :
                          result.latency < 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }>
                          {result.latency.toFixed(2)} ms
                        </span>
                      </td>
                      <td className="py-2">
                        {result.success ? (
                          <span className="text-green-600">✓ Success</span>
                        ) : (
                          <span className="text-red-600">✗ Failed</span>
                        )}
                      </td>
                      <td className="py-2 text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Performance Tips */}
        <div className="mt-8 bg-[var(--color-highlighter)] rounded border border-[var(--color-pencil-gray)] p-6">
          <h3 className="font-semibold mb-3">Performance Optimization Tips</h3>
          <ul className="text-sm space-y-2 text-gray-700">
            <li>• Cache hit latency should be under 20ms for optimal performance</li>
            <li>• Database queries are eliminated on cache hits (10-50x faster)</li>
            <li>• Cache automatically invalidates on trip saves</li>
            <li>• Popular trips are pre-warmed for instant access</li>
            <li>• Dashboard data is cached for 5 minutes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}