import { Event } from "@server/types";

export default abstract class BaseProcessor {
  static applicableEvents: (Event["name"] | "*")[] = [];

  public abstract perform(event: Event): Promise<void>;

  /**
   * Handle failure when all attempts are exhausted for the processor.
   *
   * @param event processor event
   * @returns A promise that resolves once the processor handles the failure.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onFailed(event: Event): Promise<void> {
    return Promise.resolve();
  }
}
