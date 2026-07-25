import type { Location } from "history";
import history, { patchLocation, toLocationDescriptor } from "./history";
import {
  getSplitPath,
  setFocusedSplitPane,
  withoutSplitViewNavigation,
} from "./splitView";

describe("patchLocation", () => {
  const location: Location = {
    pathname: "/doc/my-doc",
    search: "?foo=bar",
    hash: "#one",
    state: { sidebarContext: "starred-123" },
    key: "abc123",
  };

  it("carries over the safe fields and applies the patch", () => {
    expect(patchLocation(location, { hash: "#two" })).toEqual({
      pathname: "/doc/my-doc",
      search: "?foo=bar",
      hash: "#two",
      state: { sidebarContext: "starred-123" },
    });
  });

  it("does not carry over internal fields such as key", () => {
    expect(patchLocation(location, {})).not.toHaveProperty("key");
  });

  it("can override multiple fields at once", () => {
    expect(
      patchLocation(location, { search: "?q=1", hash: "#three" })
    ).toMatchObject({ search: "?q=1", hash: "#three" });
  });
});

describe("toLocationDescriptor", () => {
  it("parses a string path", () => {
    expect(toLocationDescriptor("/doc/my-doc?foo=bar#hash")).toMatchObject({
      pathname: "/doc/my-doc",
      search: "?foo=bar",
      hash: "#hash",
    });
  });

  it("attaches state to a string path", () => {
    expect(
      toLocationDescriptor("/doc/my-doc", { restore: true })
    ).toMatchObject({
      pathname: "/doc/my-doc",
      state: { restore: true },
    });
  });

  it("returns location descriptor objects unchanged", () => {
    const descriptor = { pathname: "/doc/my-doc" };
    expect(toLocationDescriptor(descriptor)).toBe(descriptor);
  });
});

describe("split view navigation", () => {
  const navigate = (path: string) => {
    withoutSplitViewNavigation(() => history.replace(path));
  };

  beforeEach(() => {
    setFocusedSplitPane("primary");
    navigate("/home");
  });

  it("leaves navigation unchanged when no split view is open", () => {
    history.push("/doc/my-doc");

    expect(history.location.pathname).toEqual("/doc/my-doc");
    expect(history.location.search).toEqual("");
  });

  it("preserves the split parameter when the primary pane navigates", () => {
    navigate("/doc/my-doc?split=%2Fdoc%2Fother-doc");

    history.push("/doc/third-doc");

    expect(history.location.pathname).toEqual("/doc/third-doc");
    expect(getSplitPath(history.location.search)).toEqual("/doc/other-doc");
  });

  it("preserves the split parameter on replace", () => {
    navigate("/search?split=%2Fdoc%2Fother-doc");

    history.replace("/search?q=foo");

    expect(history.location.pathname).toEqual("/search");
    expect(history.location.search).toContain("q=foo");
    expect(getSplitPath(history.location.search)).toEqual("/doc/other-doc");
  });

  it("directs pushes to the secondary pane when it has focus", () => {
    navigate("/doc/my-doc?split=%2Fdoc%2Fother-doc");
    setFocusedSplitPane("secondary");

    history.push("/doc/third-doc");

    expect(history.location.pathname).toEqual("/doc/my-doc");
    expect(getSplitPath(history.location.search)).toEqual("/doc/third-doc");
  });

  it("closes the split view when navigating to a non-splitable route", () => {
    navigate("/doc/my-doc?split=%2Fdoc%2Fother-doc");

    history.push("/settings/members");

    expect(history.location.pathname).toEqual("/settings/members");
    expect(getSplitPath(history.location.search)).toBeUndefined();
  });

  it("uses locations with an explicit split parameter verbatim", () => {
    navigate("/doc/my-doc?split=%2Fdoc%2Fother-doc");
    setFocusedSplitPane("secondary");

    history.push({
      pathname: "/doc/my-doc",
      search: "?split=%2Fdoc%2Fthird-doc",
    });

    expect(history.location.pathname).toEqual("/doc/my-doc");
    expect(getSplitPath(history.location.search)).toEqual("/doc/third-doc");
  });

  it("skips split view handling when suppressed", () => {
    navigate("/doc/my-doc?split=%2Fdoc%2Fother-doc");

    withoutSplitViewNavigation(() => history.push("/doc/third-doc"));

    expect(history.location.pathname).toEqual("/doc/third-doc");
    expect(getSplitPath(history.location.search)).toBeUndefined();
  });
});
