import history from "~/utils/history";
import {
  clearSuppressView,
  shouldSuppressView,
  suppressView,
} from "./suppressView";

describe("suppressView", () => {
  afterEach(() => {
    history.replace("/");
  });

  it("should append the parameter to a path", () => {
    expect(suppressView("/doc/test-abc")).toEqual(
      "/doc/test-abc?suppressView=true"
    );
    expect(suppressView("/doc/test-abc?a=1")).toEqual(
      "/doc/test-abc?a=1&suppressView=true"
    );
  });

  it("should detect and clear the parameter", () => {
    history.replace(suppressView("/doc/test-abc?a=1"));
    expect(shouldSuppressView()).toBe(true);

    clearSuppressView();
    expect(shouldSuppressView()).toBe(false);
    expect(history.location.pathname).toEqual("/doc/test-abc");
    expect(history.location.search).toEqual("?a=1");
  });
});
