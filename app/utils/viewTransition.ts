/**
 * A simple wrapper around the startViewTransition API, if it exists. Otherwise
 * it will just call the callback immediately.
 *
 * @param callback The callback to call inside the view transition.
 */
export const startViewTransition = (callback: ViewTransitionUpdateCallback) => {
  if (self.document.startViewTransition) {
    self.document.startViewTransition(callback);
  } else {
    callback();
  }
};
