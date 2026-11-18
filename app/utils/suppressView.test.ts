import { suppressView } from "./suppressView";

describe("suppressView", () => {
  it("should append the parameter to a path", () => {
    expect(suppressView("/doc/test-abc")).toEqual(
      "/doc/test-abc?suppressView=true"
    );
    expect(suppressView("/doc/test-abc?a=1")).toEqual(
      "/doc/test-abc?a=1&suppressView=true"
    );
  });
});
