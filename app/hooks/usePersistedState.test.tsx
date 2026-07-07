import * as React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import Storage from "@shared/utils/Storage";
import usePersistedState, { setPersistedState } from "./usePersistedState";

function renderHook<P, R>(useHook: (props: P) => R, initialProps: P) {
  const container = document.createElement("div");
  let current: R | undefined;

  function TestComponent({ hookProps }: { hookProps: P }) {
    current = useHook(hookProps);
    return null;
  }

  const render = (props: P) =>
    act(() => {
      ReactDOM.render(<TestComponent hookProps={props} />, container);
    });

  render(initialProps);

  return {
    result: {
      get current(): R {
        if (current === undefined) {
          throw new Error("Hook has not rendered");
        }
        return current;
      },
    },
    rerender: render,
    unmount: () =>
      act(() => {
        ReactDOM.unmountComponentAtNode(container);
      }),
  };
}

describe("usePersistedState", () => {
  let keyCounter = 0;
  let key: string;

  beforeEach(() => {
    key = `test-key-${keyCounter++}`;
  });

  it("returns the default value when nothing is stored", () => {
    const { result } = renderHook(
      () => usePersistedState<string>(key, "default"),
      {}
    );

    expect(result.current[0]).toBe("default");
  });

  it("returns the stored value when one exists", () => {
    Storage.set(key, "stored");
    const { result } = renderHook(
      () => usePersistedState<string>(key, "default"),
      {}
    );

    expect(result.current[0]).toBe("stored");
  });

  it("updates state and persists the value", () => {
    const { result } = renderHook(
      () => usePersistedState<string>(key, "default"),
      {}
    );

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
    expect(Storage.get(key)).toBe("updated");
  });

  it("supports functional updates computed from the latest state", () => {
    const { result } = renderHook(() => usePersistedState<number>(key, 0), {});
    const setValue = result.current[1];

    act(() => {
      setValue((prev) => prev + 1);
    });
    act(() => {
      // Intentionally reuse the setter captured on first render – updates
      // must still be computed from the latest state, not a stale closure.
      setValue((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(Storage.get(key)).toBe(2);
  });

  it("keeps the setter identity stable across value changes", () => {
    const { result } = renderHook(() => usePersistedState<number>(key, 0), {});
    const setValue = result.current[1];

    act(() => {
      setValue(1);
    });

    expect(result.current[1]).toBe(setValue);
  });

  it("syncs the value from storage events", () => {
    const { result } = renderHook(
      () => usePersistedState<string>(key, "default"),
      {}
    );

    act(() => {
      setPersistedState(key, "from another tab");
    });

    expect(result.current[0]).toBe("from another tab");
  });

  it("ignores storage events for other keys", () => {
    const { result } = renderHook(
      () => usePersistedState<string>(key, "default"),
      {}
    );

    act(() => {
      setPersistedState(`${key}-other`, "elsewhere");
    });

    expect(result.current[0]).toBe("default");
  });

  it("ignores storage events when listen is disabled", () => {
    const { result } = renderHook(
      () => usePersistedState<string>(key, "default", { listen: false }),
      {}
    );

    act(() => {
      setPersistedState(key, "from another tab");
    });

    expect(result.current[0]).toBe("default");
  });

  it("resets to the default value when the key is removed in another tab", () => {
    const { result } = renderHook(
      () => usePersistedState<string>(key, "default"),
      {}
    );

    act(() => {
      result.current[1]("updated");
    });
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key }));
    });

    expect(result.current[0]).toBe("default");
  });

  it("does not throw on storage events containing malformed JSON", () => {
    const { result } = renderHook(
      () => usePersistedState<string>(key, "default"),
      {}
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key, newValue: "{not-json" })
      );
    });

    expect(result.current[0]).toBe("default");
  });

  it("reloads the value when the key changes", () => {
    Storage.set("first-key", "first");
    Storage.set("second-key", "second");

    const { result, rerender } = renderHook(
      ({ storageKey }: { storageKey: string }) =>
        usePersistedState<string>(storageKey, "default"),
      { storageKey: "first-key" }
    );

    expect(result.current[0]).toBe("first");

    rerender({ storageKey: "second-key" });

    expect(result.current[0]).toBe("second");
  });
});
