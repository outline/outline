/* oxlint-disable */
import * as React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { vi } from "vitest";

describe("useOnScreen", () => {
  test("should share observers for matching options", async () => {
    vi.resetModules();

    const originalIntersectionObserver = window.IntersectionObserver;
    const observers: TestIntersectionObserver[] = [];

    class TestIntersectionObserver {
      constructor() {
        observers.push(this);
      }

      observe() {}

      unobserve() {}

      disconnect() {}

      takeRecords() {
        return [];
      }
    }

    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: TestIntersectionObserver,
    });

    const { default: useOnScreen } = await import("./useOnScreen");

    function TestComponent() {
      const firstRef = React.useRef<HTMLDivElement>(null);
      const secondRef = React.useRef<HTMLDivElement>(null);
      const options = React.useMemo(() => ({ rootMargin: "0px" }), []);

      useOnScreen(firstRef, options);
      useOnScreen(secondRef, options);

      return (
        <>
          <div ref={firstRef} />
          <div ref={secondRef} />
        </>
      );
    }

    const container = document.createElement("div");

    act(() => {
      ReactDOM.render(<TestComponent />, container);
    });

    expect(observers).toHaveLength(1);

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });

    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: originalIntersectionObserver,
    });
  });
});
