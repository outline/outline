import type { MemoryHistory } from "history";
import { createMemoryHistory } from "history";
import { reaction } from "mobx";
import {
  closeSplitPane,
  getFocusedSplitPane,
  getSplitPath,
  initSplitViewNavigation,
  isSplittablePath,
  isSplitViewModifierEvent,
  isSplitViewModifierPressed,
  openRouteInSplit,
  setFocusedSplitPane,
  setSplitPath,
} from "./splitView";

beforeEach(() => {
  setFocusedSplitPane("primary");
});

describe("getSplitPath", () => {
  it("returns the split path from a search string", () => {
    expect(getSplitPath("?split=%2Fdoc%2Fmy-doc")).toEqual("/doc/my-doc");
    expect(getSplitPath("split=%2Fdoc%2Fmy-doc")).toEqual("/doc/my-doc");
  });

  it("returns undefined when no split parameter is present", () => {
    expect(getSplitPath("")).toBeUndefined();
    expect(getSplitPath("?foo=bar")).toBeUndefined();
  });

  it("returns undefined for values that are not internal paths", () => {
    expect(getSplitPath("?split=https%3A%2F%2Fexample.com")).toBeUndefined();
    expect(getSplitPath("?split=%2F%2Fexample.com")).toBeUndefined();
    expect(getSplitPath("?split=doc%2Fmy-doc")).toBeUndefined();
  });

  it("returns undefined for routes that cannot render in a pane", () => {
    expect(getSplitPath("?split=%2Fsettings%2Fmembers")).toBeUndefined();
    expect(getSplitPath("?split=%2Flogout")).toBeUndefined();
  });

  it("uses the last value when the parameter is repeated", () => {
    expect(getSplitPath("?split=%2Fone&split=%2Ftwo")).toEqual("/two");
  });
});

describe("setSplitPath", () => {
  it("adds the split parameter to a search string", () => {
    expect(setSplitPath("", "/doc/my-doc")).toEqual("?split=%2Fdoc%2Fmy-doc");
  });

  it("preserves other query parameters", () => {
    expect(setSplitPath("?foo=bar", "/doc/my-doc")).toEqual(
      "?foo=bar&split=%2Fdoc%2Fmy-doc"
    );
  });

  it("removes the split parameter when the path is undefined", () => {
    expect(setSplitPath("?split=%2Fdoc%2Fmy-doc", undefined)).toEqual("");
    expect(setSplitPath("?foo=bar&split=%2Fdoc%2Fmy-doc", undefined)).toEqual(
      "?foo=bar"
    );
  });

  it("round trips with getSplitPath", () => {
    const search = setSplitPath("?commentId=123", "/doc/my-doc?revision=1");
    expect(getSplitPath(search)).toEqual("/doc/my-doc?revision=1");
  });
});

describe("isSplittablePath", () => {
  it("allows content routes", () => {
    expect(isSplittablePath("/home")).toBe(true);
    expect(isSplittablePath("/doc/my-doc-a1b2c3d4e5")).toBe(true);
    expect(isSplittablePath("/collection/engineering-a1b2c3d4e5")).toBe(true);
    expect(isSplittablePath("/search")).toBe(true);
    expect(isSplittablePath("/drafts")).toBe(true);
  });

  it("rejects routes that render their own chrome", () => {
    expect(isSplittablePath("/")).toBe(false);
    expect(isSplittablePath("/api/documents.export")).toBe(false);
    expect(isSplittablePath("/settings")).toBe(false);
    expect(isSplittablePath("/settings/users")).toBe(false);
    expect(isSplittablePath("/s/abc123")).toBe(false);
    expect(isSplittablePath("/logout")).toBe(false);
    expect(isSplittablePath("/oauth/authorize")).toBe(false);
    expect(isSplittablePath("/404")).toBe(false);
  });

  it("does not reject routes sharing a prefix with an excluded route", () => {
    expect(isSplittablePath("/search")).toBe(true);
    expect(isSplittablePath("/settings-doc-a1b2c3d4e5")).toBe(true);
  });

  it("rejects values that are not internal absolute paths", () => {
    expect(isSplittablePath("https://example.com/doc/my-doc")).toBe(false);
    expect(isSplittablePath("//example.com")).toBe(false);
    expect(isSplittablePath("doc/my-doc")).toBe(false);
    expect(isSplittablePath("")).toBe(false);
  });
});

describe("focused split pane", () => {
  it("defaults to the primary pane", () => {
    expect(getFocusedSplitPane()).toEqual("primary");
  });

  it("is observable", () => {
    const observed: string[] = [];
    const dispose = reaction(
      () => getFocusedSplitPane(),
      (pane) => observed.push(pane)
    );

    setFocusedSplitPane("secondary");
    setFocusedSplitPane("secondary");
    setFocusedSplitPane("primary");
    dispose();
    setFocusedSplitPane("secondary");

    expect(observed).toEqual(["secondary", "primary"]);
  });
});

describe("openRouteInSplit", () => {
  it("adds the split parameter and focuses the secondary pane", () => {
    const history = createMemoryHistory({
      initialEntries: ["/doc/my-doc?commentId=123"],
    });

    openRouteInSplit(history, "/doc/other-doc");

    expect(history.location.pathname).toEqual("/doc/my-doc");
    expect(getSplitPath(history.location.search)).toEqual("/doc/other-doc");
    expect(history.location.search).toContain("commentId=123");
    expect(getFocusedSplitPane()).toEqual("secondary");
  });
});

// The test environment is neither macOS nor Electron, so the modifier is
// control together with shift.
describe("isSplitViewModifierEvent", () => {
  it("matches the modifier combination for the platform", () => {
    expect(
      isSplitViewModifierEvent(
        new MouseEvent("click", { ctrlKey: true, shiftKey: true })
      )
    ).toBe(true);
  });

  it("does not match other combinations", () => {
    expect(
      isSplitViewModifierEvent(new MouseEvent("click", { ctrlKey: true }))
    ).toBe(false);
    expect(
      isSplitViewModifierEvent(new MouseEvent("click", { shiftKey: true }))
    ).toBe(false);
    expect(
      isSplitViewModifierEvent(
        new MouseEvent("click", { ctrlKey: true, shiftKey: true, altKey: true })
      )
    ).toBe(false);
  });
});

describe("initSplitViewNavigation", () => {
  let history: MemoryHistory;
  let stop: () => void;
  let anchor: HTMLAnchorElement;

  // Returns whether the click was left to follow the link, stopping the
  // navigation the test environment cannot perform.
  const click = (target: Element, init: MouseEventInit = {}) => {
    let followed = true;
    const suppressNavigation = (event: Event) => {
      followed = !event.defaultPrevented;
      event.preventDefault();
    };

    window.addEventListener("click", suppressNavigation);
    target.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 1,
        ctrlKey: true,
        shiftKey: true,
        ...init,
      })
    );
    window.removeEventListener("click", suppressNavigation);

    return followed;
  };

  beforeEach(() => {
    history = createMemoryHistory({ initialEntries: ["/doc/my-doc"] });
    stop = initSplitViewNavigation(history);
    anchor = window.document.createElement("a");
    anchor.href = "/doc/other-doc?commentId=123";
    window.document.body.append(anchor);
  });

  afterEach(() => {
    stop();
    anchor.remove();
  });

  it("opens an internal link in the secondary pane", () => {
    const followed = click(anchor);

    expect(followed).toBe(false);
    expect(history.location.pathname).toEqual("/doc/my-doc");
    expect(getSplitPath(history.location.search)).toEqual(
      "/doc/other-doc?commentId=123"
    );
    expect(getFocusedSplitPane()).toEqual("secondary");
  });

  it("opens a link nested inside other elements", () => {
    const child = window.document.createElement("span");
    anchor.append(child);

    click(child);

    expect(getSplitPath(history.location.search)).toEqual(
      "/doc/other-doc?commentId=123"
    );
  });

  it("follows the link without the modifier", () => {
    const followed = click(anchor, { ctrlKey: false, shiftKey: false });

    expect(followed).toBe(true);
    expect(getSplitPath(history.location.search)).toBeUndefined();
  });

  it("follows clicks that are not a primary button press", () => {
    expect(click(anchor, { button: 1 })).toBe(true);
    expect(click(anchor, { detail: 0 })).toBe(true);
    expect(getSplitPath(history.location.search)).toBeUndefined();
  });

  it("follows links to routes that cannot render in a pane", () => {
    anchor.href = "/settings/members";

    expect(click(anchor)).toBe(true);
    expect(getSplitPath(history.location.search)).toBeUndefined();
  });

  it("follows external links", () => {
    anchor.href = "https://example.com/doc/other-doc";

    expect(click(anchor)).toBe(true);
    expect(getSplitPath(history.location.search)).toBeUndefined();
  });

  it("follows links that open elsewhere", () => {
    anchor.target = "_blank";

    expect(click(anchor)).toBe(true);
    expect(getSplitPath(history.location.search)).toBeUndefined();
  });

  it("records the modifier for the duration of the event only", () => {
    vi.useFakeTimers();

    try {
      const target = window.document.createElement("div");
      window.document.body.append(target);
      click(target);
      expect(isSplitViewModifierPressed()).toBe(true);

      vi.runAllTimers();
      expect(isSplitViewModifierPressed()).toBe(false);
      target.remove();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("closeSplitPane", () => {
  it("keeps the primary route when closing the secondary pane", () => {
    const history = createMemoryHistory({
      initialEntries: ["/doc/my-doc?split=%2Fdoc%2Fother-doc"],
    });
    setFocusedSplitPane("secondary");

    closeSplitPane(history, "secondary");

    expect(history.location.pathname).toEqual("/doc/my-doc");
    expect(getSplitPath(history.location.search)).toBeUndefined();
    expect(getFocusedSplitPane()).toEqual("primary");
  });

  it("promotes the secondary route when closing the primary pane", () => {
    const history = createMemoryHistory({
      initialEntries: [
        "/doc/my-doc?split=%2Fdoc%2Fother-doc%3FcommentId%3D123",
      ],
    });
    setFocusedSplitPane("secondary");

    closeSplitPane(history, "primary");

    expect(history.location.pathname).toEqual("/doc/other-doc");
    expect(history.location.search).toContain("commentId=123");
    expect(getSplitPath(history.location.search)).toBeUndefined();
    expect(getFocusedSplitPane()).toEqual("primary");
  });

  it("removes the split parameter when closing the primary pane without a secondary route", () => {
    const history = createMemoryHistory({
      initialEntries: ["/doc/my-doc"],
    });

    closeSplitPane(history, "primary");

    expect(history.location.pathname).toEqual("/doc/my-doc");
    expect(getSplitPath(history.location.search)).toBeUndefined();
  });
});
