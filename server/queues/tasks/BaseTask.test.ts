import { Op } from "sequelize";
import BaseTask, { PartitionInfo, TaskPriority } from "./BaseTask";

// Create a concrete implementation of BaseTask for testing
class TestTask extends BaseTask<{ limit: number; partition?: PartitionInfo }> {
  public async perform() {
    // Not used in these tests
  }

  public get options() {
    return {
      priority: TaskPriority.Normal,
    };
  }

  public testGetPartitionWhereClauseOptimized(
    idField: string,
    partition: PartitionInfo | undefined
  ) {
    return this.getPartitionWhereClause(idField, partition);
  }
}

describe("BaseTask", () => {
  let task: TestTask;

  beforeEach(() => {
    task = new TestTask();
  });

  describe("getPartitionWhereClause", () => {
    it("should return empty object when partition is undefined", () => {
      const where = task.testGetPartitionWhereClauseOptimized("id", undefined);
      expect(where).toEqual({});
    });

    it("should generate range WHERE clause for valid partition", () => {
      const where = task.testGetPartitionWhereClauseOptimized("id", {
        partitionIndex: 0,
        partitionCount: 3,
      }) as any;

      expect(where).toBeDefined();
      expect(where.id).toBeDefined();
      expect(where.id[Op.gte]).toBeDefined();
      expect(where.id[Op.lte]).toBeDefined();
    });

    it("should generate correct UUID ranges for 3 partitions", () => {
      const where0 = task.testGetPartitionWhereClauseOptimized("id", {
        partitionIndex: 0,
        partitionCount: 3,
      }) as any;

      const where1 = task.testGetPartitionWhereClauseOptimized("id", {
        partitionIndex: 1,
        partitionCount: 3,
      }) as any;

      const where2 = task.testGetPartitionWhereClauseOptimized("id", {
        partitionIndex: 2,
        partitionCount: 3,
      }) as any;

      // Partition 0: Should start from 00000000
      expect(where0.id[Op.gte]).toBe("00000000-0000-0000-0000-000000000000");
      expect(where0.id[Op.lte]).toMatch(/^55555554-/);

      // Partition 1: Should start from 55555555
      expect(where1.id[Op.gte]).toBe("55555555-0000-0000-0000-000000000000");
      expect(where1.id[Op.lte]).toBe("aaaaaaa9-ffff-ffff-ffff-ffffffffffff");

      // Partition 2: Should end at ffffffff
      expect(where2.id[Op.gte]).toBe("aaaaaaaa-0000-0000-0000-000000000000");
      expect(where2.id[Op.lte]).toBe("ffffffff-ffff-ffff-ffff-ffffffffffff");
    });

    it("should generate correct UUID ranges for 2 partitions", () => {
      const where0 = task.testGetPartitionWhereClauseOptimized("id", {
        partitionIndex: 0,
        partitionCount: 2,
      }) as any;

      const where1 = task.testGetPartitionWhereClauseOptimized("id", {
        partitionIndex: 1,
        partitionCount: 2,
      }) as any;

      // Partition 0: 0x00000000 to 0x7fffffff
      expect(where0.id[Op.gte]).toBe("00000000-0000-0000-0000-000000000000");
      expect(where0.id[Op.lte]).toBe("7fffffff-ffff-ffff-ffff-ffffffffffff");

      // Partition 1: 0x80000000 to 0xffffffff
      expect(where1.id[Op.gte]).toBe("80000000-0000-0000-0000-000000000000");
      expect(where1.id[Op.lte]).toBe("ffffffff-ffff-ffff-ffff-ffffffffffff");
    });

    it("should distribute UUID space evenly", () => {
      const partitionCount = 4;
      const ranges: Array<{ start: string; end: string }> = [];

      for (let i = 0; i < partitionCount; i++) {
        const where = task.testGetPartitionWhereClauseOptimized("id", {
          partitionIndex: i,
          partitionCount,
        }) as any;
        ranges.push({
          start: where.id[Op.gte],
          end: where.id[Op.lte],
        });
      }

      // Check that ranges don't overlap and cover the entire space
      expect(ranges[0].start).toBe("00000000-0000-0000-0000-000000000000");
      expect(ranges[3].end).toBe("ffffffff-ffff-ffff-ffff-ffffffffffff");

      // Check that each range ends where the next begins (approximately)
      for (let i = 0; i < partitionCount - 1; i++) {
        const currentEnd = ranges[i].end.substring(0, 8);
        const nextStart = ranges[i + 1].start.substring(0, 8);

        // Convert to numbers to check they're consecutive
        const currentEndNum = parseInt(currentEnd, 16);
        const nextStartNum = parseInt(nextStart, 16);

        // Should be consecutive or very close
        expect(nextStartNum - currentEndNum).toBeLessThanOrEqual(1);
      }
    });

    it("should handle single partition (no partitioning)", () => {
      const where = task.testGetPartitionWhereClauseOptimized("id", {
        partitionIndex: 0,
        partitionCount: 1,
      }) as any;

      // Should cover entire UUID space
      expect(where.id[Op.gte]).toBe("00000000-0000-0000-0000-000000000000");
      expect(where.id[Op.lte]).toBe("ffffffff-ffff-ffff-ffff-ffffffffffff");
    });

    it("should throw error for invalid partition info", () => {
      expect(() => {
        task.testGetPartitionWhereClauseOptimized("id", {
          partitionIndex: -1,
          partitionCount: 3,
        });
      }).toThrow("Invalid partition info: index -1, count 3");

      expect(() => {
        task.testGetPartitionWhereClauseOptimized("id", {
          partitionIndex: 3,
          partitionCount: 3,
        });
      }).toThrow("Invalid partition info: index 3, count 3");

      expect(() => {
        task.testGetPartitionWhereClauseOptimized("id", {
          partitionIndex: 0,
          partitionCount: 0,
        });
      }).toThrow("Invalid partition info: index 0, count 0");
    });

    it("should work with different field names", () => {
      const where1 = task.testGetPartitionWhereClauseOptimized("id", {
        partitionIndex: 0,
        partitionCount: 2,
      }) as any;

      const where2 = task.testGetPartitionWhereClauseOptimized("documentId", {
        partitionIndex: 0,
        partitionCount: 2,
      }) as any;

      expect(where1.id).toBeDefined();
      expect(where1.documentId).toBeUndefined();
      expect(where2.documentId).toBeDefined();
      expect(where2.id).toBeUndefined();
    });

    it("should handle large partition counts efficiently", () => {
      const partitionCount = 100;
      const ranges: Array<{ start: string; end: string }> = [];

      for (let i = 0; i < partitionCount; i++) {
        const where = task.testGetPartitionWhereClauseOptimized("id", {
          partitionIndex: i,
          partitionCount,
        }) as any;
        ranges.push({
          start: where.id[Op.gte],
          end: where.id[Op.lte],
        });
      }

      // First partition should start at 00000000
      expect(ranges[0].start).toBe("00000000-0000-0000-0000-000000000000");
      // Last partition should end at ffffffff
      expect(ranges[99].end).toBe("ffffffff-ffff-ffff-ffff-ffffffffffff");

      // Each partition should have a unique range
      const startValues = new Set(ranges.map((r) => r.start));
      expect(startValues.size).toBe(100);
    });

    it("should calculate correct hex values for partition boundaries", () => {
      // Test specific calculations
      const where = task.testGetPartitionWhereClauseOptimized("id", {
        partitionIndex: 1,
        partitionCount: 16, // 16 partitions = 0x10000000 per partition
      }) as any;

      // Partition 1 should be from 0x10000000 to 0x1fffffff
      expect(where.id[Op.gte]).toBe("10000000-0000-0000-0000-000000000000");
      expect(where.id[Op.lte]).toBe("1fffffff-ffff-ffff-ffff-ffffffffffff");
    });
  });

  describe("Partition distribution properties", () => {
    it("should ensure all UUIDs map to exactly one partition", () => {
      const testUuids = [
        "00000000-0000-0000-0000-000000000000", // Min UUID
        "12345678-9abc-def0-1234-567890abcdef",
        "55555555-5555-5555-5555-555555555555",
        "87654321-fedc-ba98-7654-321098765432",
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "deadbeef-cafe-babe-feed-dec0debac1e5",
        "ffffffff-ffff-ffff-ffff-ffffffffffff", // Max UUID
      ];

      const partitionCount = 3;

      for (const uuid of testUuids) {
        let matchCount = 0;
        let matchedPartition = -1;

        for (let i = 0; i < partitionCount; i++) {
          const where = task.testGetPartitionWhereClauseOptimized("id", {
            partitionIndex: i,
            partitionCount,
          }) as any;

          const startUuid = where.id[Op.gte];
          const endUuid = where.id[Op.lte];

          // Check if UUID falls within this partition's range
          if (uuid >= startUuid && uuid <= endUuid) {
            matchCount++;
            matchedPartition = i;
          }
        }

        // Each UUID should match exactly one partition
        expect(matchCount).toBe(1);
        expect(matchedPartition).toBeGreaterThanOrEqual(0);
        expect(matchedPartition).toBeLessThan(partitionCount);
      }
    });
  });

  describe("Integration tests", () => {
    it("should partition work correctly for real-world scenario", () => {
      // Simulate 10,000 documents with random UUIDs
      const documentCount = 10000;
      const partitionCount = 3;
      const documents: string[] = [];

      // Generate random UUIDs
      for (let i = 0; i < documentCount; i++) {
        // Generate a random UUID (simplified - just random hex for first 8 chars)
        const randomHex = Math.floor(Math.random() * 0xffffffff)
          .toString(16)
          .padStart(8, "0");
        const uuid = `${randomHex}-0000-0000-0000-000000000000`;
        documents.push(uuid);
      }

      // Count how many documents each partition would process
      const partitionCounts = new Array(partitionCount).fill(0);

      for (const uuid of documents) {
        for (let p = 0; p < partitionCount; p++) {
          const where = task.testGetPartitionWhereClauseOptimized("id", {
            partitionIndex: p,
            partitionCount,
          }) as any;

          if (uuid >= where.id[Op.gte] && uuid <= where.id[Op.lte]) {
            partitionCounts[p]++;
            break;
          }
        }
      }

      // Verify each partition got roughly equal work
      const expectedPerPartition = documentCount / partitionCount;
      const tolerance = expectedPerPartition * 0.1; // 10% tolerance

      for (let p = 0; p < partitionCount; p++) {
        expect(partitionCounts[p]).toBeGreaterThan(
          expectedPerPartition - tolerance
        );
        expect(partitionCounts[p]).toBeLessThan(
          expectedPerPartition + tolerance
        );
      }

      // Verify total equals original count (no documents missed or duplicated)
      const total = partitionCounts.reduce((sum, count) => sum + count, 0);
      expect(total).toBe(documentCount);
    });

    it("should handle edge cases in UUID distribution", () => {
      const edgeCaseUuids = [
        "00000000-0000-0000-0000-000000000000", // Minimum UUID
        "00000001-0000-0000-0000-000000000000",
        "55555554-ffff-ffff-ffff-ffffffffffff",
        "55555555-0000-0000-0000-000000000000", // Partition boundary
        "aaaaaaa9-ffff-ffff-ffff-ffffffffffff",
        "aaaaaaaa-0000-0000-0000-000000000000", // Another boundary
        "fffffffe-ffff-ffff-ffff-ffffffffffff",
        "ffffffff-ffff-ffff-ffff-ffffffffffff", // Maximum UUID
      ];

      const partitionCount = 3;
      const assignments = new Map<string, number>();

      // Assign each UUID to its partition
      for (const uuid of edgeCaseUuids) {
        for (let p = 0; p < partitionCount; p++) {
          const where = task.testGetPartitionWhereClauseOptimized("id", {
            partitionIndex: p,
            partitionCount,
          }) as any;

          if (uuid >= where.id[Op.gte] && uuid <= where.id[Op.lte]) {
            assignments.set(uuid, p);
            break;
          }
        }
      }

      // Verify all UUIDs were assigned
      expect(assignments.size).toBe(edgeCaseUuids.length);

      // Verify boundary assignments are correct
      expect(assignments.get("00000000-0000-0000-0000-000000000000")).toBe(0);
      expect(assignments.get("55555554-ffff-ffff-ffff-ffffffffffff")).toBe(0);
      expect(assignments.get("55555555-0000-0000-0000-000000000000")).toBe(1);
      expect(assignments.get("aaaaaaaa-0000-0000-0000-000000000000")).toBe(2);
      expect(assignments.get("ffffffff-ffff-ffff-ffff-ffffffffffff")).toBe(2);
    });

    it("should generate non-overlapping ranges for any partition count", () => {
      const testCounts = [2, 3, 5, 7, 10, 16, 32];

      for (const partitionCount of testCounts) {
        const ranges: Array<{ start: string; end: string }> = [];

        // Get all partition ranges
        for (let i = 0; i < partitionCount; i++) {
          const where = task.testGetPartitionWhereClauseOptimized("id", {
            partitionIndex: i,
            partitionCount,
          }) as any;
          ranges.push({
            start: where.id[Op.gte],
            end: where.id[Op.lte],
          });
        }

        // Verify no gaps between consecutive partitions
        for (let i = 0; i < partitionCount - 1; i++) {
          const currentEnd = ranges[i].end.substring(0, 8);
          const nextStart = ranges[i + 1].start.substring(0, 8);

          const currentEndNum = parseInt(currentEnd, 16);
          const nextStartNum = parseInt(nextStart, 16);

          // Next partition should start exactly where current ends + 1
          expect(nextStartNum).toBe(currentEndNum + 1);
        }

        // Verify coverage of entire UUID space
        expect(ranges[0].start).toBe("00000000-0000-0000-0000-000000000000");
        expect(ranges[partitionCount - 1].end).toBe(
          "ffffffff-ffff-ffff-ffff-ffffffffffff"
        );
      }
    });
  });
});
