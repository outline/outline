import { createMemoryHistory } from "history";
import { reaction } from "mobx";
import {
  closeSplitPane,
  getFocusedSplitPane,
  getSplitPath,
  isSplitablePath,
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

describe("isSplitablePath", () => {
  it("allows content routes", () => {
    expect(isSplitablePath("/home")).toBe(true);
    expect(isSplitablePath("/doc/my-doc-a1b2c3d4e5")).toBe(true);
    expect(isSplitablePath("/collection/engineering-a1b2c3d4e5")).toBe(true);
    expect(isSplitablePath("/search")).toBe(true);
    expect(isSplitablePath("/drafts")).toBe(true);
  });

  it("rejects routes that render their own chrome", () => {
    expect(isSplitablePath("/")).toBe(false);
    expect(isSplitablePath("/settings")).toBe(false);
    expect(isSplitablePath("/settings/members")).toBe(false);
    expect(isSplitablePath("/s/abc123")).toBe(false);
    expect(isSplitablePath("/logout")).toBe(false);
    expect(isSplitablePath("/oauth/authorize")).toBe(false);
    expect(isSplitablePath("/404")).toBe(false);
  });

  it("does not reject routes sharing a prefix with an excluded route", () => {
    expect(isSplitablePath("/search")).toBe(true);
    expect(isSplitablePath("/settings-doc-a1b2c3d4e5")).toBe(true);
  });

  it("rejects values that are not internal absolute paths", () => {
    expect(isSplitablePath("https://example.com/doc/my-doc")).toBe(false);
    expect(isSplitablePath("//example.com")).toBe(false);
    expect(isSplitablePath("doc/my-doc")).toBe(false);
    expect(isSplitablePath("")).toBe(false);
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
