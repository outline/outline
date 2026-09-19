import { AfterChange, LifecycleManager } from "./Lifecycle";

describe("LifecycleManager", () => {
  it("executes registered hooks", () => {
    const hook = vi.fn();

    class Model {
      static onChange = hook;
    }
    AfterChange(Model, "onChange");

    LifecycleManager.executeHooks(Model, "afterChange", "arg");
    expect(hook).toHaveBeenCalledWith("arg");
  });

  it("does not leak hooks between classes that share a name", () => {
    const hook = vi.fn();

    // Minified builds can mangle two unrelated classes to the same name.
    const One = class Model {
      static onChange = hook;
    };
    const Two = class Model {};

    AfterChange(One, "onChange");

    expect(() =>
      LifecycleManager.executeHooks(Two, "afterChange", "arg")
    ).not.toThrow();
    expect(hook).not.toHaveBeenCalled();
  });
});
