import type { Job } from "bull";
import { BaseTask } from "./BaseTask";

class TestTask extends BaseTask<{ id: string }> {
  public async perform() {
    // Not used in these tests
  }
}

describe("BaseTask", () => {
  describe("scheduleOptional", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return the job when it is scheduled", async () => {
      const task = new TestTask();
      const job = { id: "job" } as Job;
      vi.spyOn(task, "schedule").mockResolvedValue(job);

      await expect(task.scheduleOptional({ id: "1" })).resolves.toBe(job);
    });

    it("should not throw when the job cannot be scheduled", async () => {
      const task = new TestTask();
      vi.spyOn(task, "schedule").mockRejectedValue(new Error("Queue error"));

      await expect(task.scheduleOptional({ id: "1" })).resolves.toBeUndefined();
    });
  });
});
