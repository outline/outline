let hidden = "hidden";
let visibilityChange = "visibilitychange";

if ("hidden" in document) {
  hidden = "hidden";
  visibilityChange = "visibilitychange";
} else if ("mozHidden" in document) {
  // Firefox up to v17
  hidden = "mozHidden";
  visibilityChange = "mozvisibilitychange";
} else if ("webkitHidden" in document) {
  // Chrome up to v32, Android up to v4.4, Blackberry up to v10
  hidden = "webkitHidden";
  visibilityChange = "webkitvisibilitychange";
}

export function getVisibilityListener(): string {
  return visibilityChange;
}

export function getPageVisible(): boolean {
  return !document[hidden as keyof Document];
}
