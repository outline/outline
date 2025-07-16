/**
 * Performance monitoring utilities for test optimization
 */

interface TestMetrics {
  testName: string;
  databaseTime: number;
  totalTime: number;
  databaseOperations: number;
}

class TestPerformanceMonitor {
  private metrics: TestMetrics[] = [];
  private currentTest: {
    name: string;
    startTime: number;
    databaseTime: number;
    databaseOperations: number;
  } | null = null;

  startTest(testName: string) {
    this.currentTest = {
      name: testName,
      startTime: Date.now(),
      databaseTime: 0,
      databaseOperations: 0,
    };
  }

  recordDatabaseOperation(duration: number) {
    if (this.currentTest) {
      this.currentTest.databaseTime += duration;
      this.currentTest.databaseOperations++;
    }
  }

  endTest() {
    if (this.currentTest) {
      const totalTime = Date.now() - this.currentTest.startTime;
      this.metrics.push({
        testName: this.currentTest.name,
        databaseTime: this.currentTest.databaseTime,
        totalTime,
        databaseOperations: this.currentTest.databaseOperations,
      });
      this.currentTest = null;
    }
  }

  getReport(): string {
    if (this.metrics.length === 0) {
      return "No test metrics collected";
    }

    const totalTests = this.metrics.length;
    const totalTime = this.metrics.reduce((sum, m) => sum + m.totalTime, 0);
    const totalDbTime = this.metrics.reduce(
      (sum, m) => sum + m.databaseTime,
      0
    );
    const totalDbOps = this.metrics.reduce(
      (sum, m) => sum + m.databaseOperations,
      0
    );

    const avgTestTime = totalTime / totalTests;
    const avgDbTime = totalDbTime / totalTests;
    const dbTimePercentage = (totalDbTime / totalTime) * 100;

    const slowestTests = this.metrics
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 5);

    const dbHeaviestTests = this.metrics
      .sort((a, b) => b.databaseTime - a.databaseTime)
      .slice(0, 5);

    return `
📊 Test Performance Report
==========================
Total Tests: ${totalTests}
Total Time: ${totalTime}ms
Total DB Time: ${totalDbTime}ms (${dbTimePercentage.toFixed(1)}%)
Total DB Operations: ${totalDbOps}

Average per test:
- Total Time: ${avgTestTime.toFixed(1)}ms
- DB Time: ${avgDbTime.toFixed(1)}ms
- DB Operations: ${(totalDbOps / totalTests).toFixed(1)}

🐌 Slowest Tests:
${slowestTests.map((t) => `- ${t.testName}: ${t.totalTime}ms`).join("\n")}

🗄️ DB-Heavy Tests:
${dbHeaviestTests.map((t) => `- ${t.testName}: ${t.databaseTime}ms (${t.databaseOperations} ops)`).join("\n")}
`;
  }

  reset() {
    this.metrics = [];
    this.currentTest = null;
  }
}

export const testMonitor = new TestPerformanceMonitor();

/**
 * Decorator to monitor test performance
 */
export function monitorTestPerformance(_testName: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      testMonitor.startTest(`${target.constructor.name}.${propertyName}`);
      try {
        const result = await method.apply(this, args);
        return result;
      } finally {
        testMonitor.endTest();
      }
    };
  };
}

/**
 * Utility to wrap database operations for monitoring
 */
export function monitorDatabaseOperation<T>(
  operation: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  return operation().finally(() => {
    const duration = Date.now() - start;
    testMonitor.recordDatabaseOperation(duration);
  });
}

// Global test hooks for automatic monitoring
if (typeof global !== "undefined") {
  const originalBeforeEach = global.beforeEach;
  const originalAfterEach = global.afterEach;

  if (originalBeforeEach) {
    global.beforeEach = function (fn?: jest.ProvidesCallback) {
      return originalBeforeEach(() => {
        const testName = expect.getState().currentTestName || "unknown";
        testMonitor.startTest(testName);
        if (fn) {
          fn();
        }
      });
    };
  }

  if (originalAfterEach) {
    global.afterEach = function (fn?: jest.ProvidesCallback) {
      return originalAfterEach(() => {
        if (fn) {
          fn();
        }
        testMonitor.endTest();
      });
    };
  }
}

// Print report on process exit
process.on("exit", () => {
  if (process.env.TEST_PERFORMANCE_REPORT === "true") {
    // eslint-disable-next-line no-console
    console.log(testMonitor.getReport());
  }
});
