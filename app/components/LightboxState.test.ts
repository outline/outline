import type { Action } from "./LightboxState";
import {
  ImageStatus,
  LightboxStatus,
  initialStatus,
  reducer,
} from "./LightboxState";

/**
 * Applies a sequence of actions to the initial status.
 *
 * @param actions The actions to apply in order.
 * @returns The resulting status.
 */
const run = (...actions: Action[]) => actions.reduce(reducer, initialStatus);

describe("Lightbox state", () => {
  it("opens once the image has loaded and the animation has run", () => {
    const status = run(
      { type: "mounted" },
      { type: "imageLoading" },
      { type: "imageLoaded" },
      { type: "openAnimationPrepared" },
      { type: "openAnimationEnded" }
    );

    expect(status).toEqual({
      lightbox: LightboxStatus.OPENED,
      image: ImageStatus.MIN_ZOOM,
    });
  });

  it("opens when the image fails to load", () => {
    const status = run(
      { type: "mounted" },
      { type: "imageLoading" },
      { type: "imageErrored" },
      { type: "openAnimationPrepared" },
      { type: "openAnimationEnded" }
    );

    expect(status).toEqual({
      lightbox: LightboxStatus.OPENED,
      image: ImageStatus.ERROR,
    });
  });

  it("settles at minimum zoom when the image loads after opening", () => {
    const opened = run(
      { type: "mounted" },
      { type: "imageLoading" },
      { type: "imageLoaded" },
      { type: "openAnimationPrepared" },
      { type: "openAnimationEnded" }
    );

    // Navigating to another image while already open.
    const loading = reducer(opened, { type: "imageLoading" });
    expect(loading.image).toBe(ImageStatus.LOADING);

    const loaded = reducer(loading, { type: "imageLoaded" });
    expect(loaded).toEqual({
      lightbox: LightboxStatus.OPENED,
      image: ImageStatus.MIN_ZOOM,
    });
  });

  it("preserves the lightbox status when the zoom changes", () => {
    const opened = run(
      { type: "mounted" },
      { type: "imageLoading" },
      { type: "imageLoaded" },
      { type: "openAnimationPrepared" },
      { type: "openAnimationEnded" }
    );

    const zoomed = reducer(opened, {
      type: "zoomChanged",
      zoom: ImageStatus.MAX_ZOOM,
    });

    expect(zoomed).toEqual({
      lightbox: LightboxStatus.OPENED,
      image: ImageStatus.MAX_ZOOM,
    });
  });

  it("closes through to a final closed status", () => {
    const opened = run(
      { type: "mounted" },
      { type: "imageLoading" },
      { type: "imageLoaded" },
      { type: "openAnimationPrepared" },
      { type: "openAnimationEnded" }
    );

    const requested = reducer(opened, { type: "closeRequested" });
    expect(requested.lightbox).toBe(LightboxStatus.READY_TO_CLOSE);

    const closing = reducer(requested, { type: "closeAnimationPrepared" });
    expect(closing.lightbox).toBe(LightboxStatus.CLOSING);

    expect(reducer(closing, { type: "closeAnimationEnded" })).toEqual({
      lightbox: LightboxStatus.CLOSED,
      image: null,
    });
  });

  it("ignores a close requested before the lightbox has opened", () => {
    const readyToOpen = reducer(initialStatus, { type: "mounted" });

    expect(reducer(readyToOpen, { type: "closeRequested" })).toBe(readyToOpen);
  });

  it("ignores a repeated close request while already closing", () => {
    const closing = run(
      { type: "mounted" },
      { type: "imageLoading" },
      { type: "imageLoaded" },
      { type: "openAnimationPrepared" },
      { type: "openAnimationEnded" },
      { type: "closeRequested" },
      { type: "closeAnimationPrepared" }
    );

    expect(reducer(closing, { type: "closeRequested" })).toBe(closing);
    expect(reducer(closing, { type: "closeAnimationPrepared" })).toBe(closing);
  });

  it("does not reopen when a slow image load lands after closing started", () => {
    const closing = run(
      { type: "mounted" },
      { type: "imageLoading" },
      { type: "imageLoaded" },
      { type: "openAnimationPrepared" },
      { type: "openAnimationEnded" },
      { type: "closeRequested" }
    );

    const late = reducer(closing, { type: "imageLoaded" });

    expect(late.lightbox).toBe(LightboxStatus.READY_TO_CLOSE);
    expect(reducer(late, { type: "openAnimationPrepared" })).toBe(late);
  });
});
