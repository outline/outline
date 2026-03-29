/**
 * Calls preventDefault on the event. Useful as a stable callback reference.
 *
 * @param event the event to prevent default on.
 */
export const preventDefault = (event: { preventDefault: () => void }) => {
  event.preventDefault();
};
