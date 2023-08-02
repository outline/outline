/**
 * Helper class to track events across various analytics integrations
 */
export default class Analytics {
  /**
   * Send an event to Analytics
   *
   * @param event The event name
   * @param action The action name
   */
  public static track = (
    event: string,
    action: string,
    metadata?: Record<string, string>
  ) => {
    // GA3
    if (window.ga) {
      window.ga("send", "event", event, action);
    }

    // GA4
    if (window.dataLayer) {
      window.dataLayer.push({
        event,
        action,
        ...metadata,
      });
    }
  };
}
