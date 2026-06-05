import type { Event } from "@server/types";

export default abstract class BaseProcessor {
  static applicableEvents: (Event["name"] | "*")[] = [];

  /**
   * Optional hook run in the global event queue before a job is created for this
   * processor. Implement it to cheaply opt out of events the processor will not
   * act on and avoid the cost of an empty job. When omitted, every applicable
   * event is queued.
   *
   * @param event The event about to be queued.
   * @returns true if a job should be queued for this processor.
   */
  static shouldQueue?: (event: Event) => Promise<boolean>;

  public abstract perform(event: Event): Promise<void>;

  /**
   * Handle failure when all attempts are exhausted for the processor.
   *
   * @param event processor event
   * @returns A promise that resolves once the processor handles the failure.
   */
  // oxlint-disable-next-line @typescript-eslint/no-unused-vars
  public onFailed(event: Event): Promise<void> {
    return Promise.resolve();
  }
}
