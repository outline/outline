/**
 * Comprehensive tests for the download utility.
 *
 * These tests cover:
 *   - Immediate handling of data URL inputs.
 *   - Conversion of non-data URL strings to Blob and triggering the anchor download.
 *   - Modern download flow (using an anchor element with the download attribute).
 *   - Fallback logic by simulating an environment where the download attribute is missing,
 *     which triggers an iframe-based download.
 *   - Cleanup and revoking of the object URL.
 */

import download from "./download";

describe("download utility", () => {
  let originalCreateElement: typeof document.createElement;
  let originalURL: {
    createObjectURL: typeof URL.createObjectURL;
    revokeObjectURL: typeof URL.revokeObjectURL;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    // Save original implementations
    originalCreateElement = document.createElement;
    originalURL = {
      createObjectURL: URL.createObjectURL,
      revokeObjectURL: URL.revokeObjectURL,
    };

    // Stub URL.createObjectURL to always return a fake object URL
    URL.createObjectURL = jest.fn(() => "blob:fake");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalURL.createObjectURL;
    URL.revokeObjectURL = originalURL.revokeObjectURL;
    document.body.innerHTML = "";
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  test("should immediately handle data URL input (modern browser path)", () => {
    const dataUrl = "data:text/plain,HelloWorld";
    const fileName = "test.txt";

    // Create a real anchor element
    const anchor = originalCreateElement.call(
      document,
      "a"
    ) as HTMLAnchorElement;
    const clickSpy = jest.spyOn(anchor, "click");

    // When an anchor is created, use our pre-created anchor
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return anchor;
      }
      return originalCreateElement.call(document, tag);
    });

    const result = download(dataUrl, fileName);
    expect(result).toBe(true);

    // Run timers to simulate async click and removal
    jest.runAllTimers();

    // The anchor should have the proper download attribute and be clicked
    expect(anchor.getAttribute("download")).toBe(fileName);
    expect(clickSpy).toHaveBeenCalled();

    // After working, the anchor is removed from the document body
    expect(document.body.contains(anchor)).toBe(false);
  });

  test("should convert plain string input (non-data URL) to Blob and trigger anchor download", () => {
    const data = "HelloWorld"; // plain string—not a data URL
    const fileName = "test.txt";
    const mimeType = "text/plain";

    // Use a real anchor element for download functionality
    const anchor = originalCreateElement.call(
      document,
      "a"
    ) as HTMLAnchorElement;
    const clickSpy = jest.spyOn(anchor, "click");

    // Stub createElement for anchor at runtime
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return anchor;
      }
      return originalCreateElement.call(document, tag);
    });

    const result = download(data, fileName, mimeType);
    expect(result).toBe(true);

    // Run timers to simulate async behavior
    jest.runAllTimers();

    // The function should use URL.createObjectURL to create an object URL for the generated Blob
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(anchor.getAttribute("download")).toBe(fileName);
    expect(anchor.href).toBe("blob:fake");
    expect(clickSpy).toHaveBeenCalled();
  });

  test("should fall back to iframe download when 'download' attribute is not supported", () => {
    // Simulate an environment where the anchor doesn't support the "download" attribute.
    // Wrap created anchor elements in a Proxy to simulate that the "download" property is missing.
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const anchor = originalCreateElement.call(
          document,
          "a"
        ) as HTMLAnchorElement;
        return new Proxy(anchor, {
          has(target, prop) {
            if (prop === "download") {
              return false;
            }
            return prop in target;
          },
        });
      }
      return originalCreateElement.call(document, tag);
    });

    // Spy on document.body.appendChild and removeChild to monitor iframe insertion
    const appendChildSpy = jest.spyOn(document.body, "appendChild");
    const removeChildSpy = jest.spyOn(document.body, "removeChild");

    // Use a data URL to trigger the fallback branch
    const dataUrl = "data:text/plain,HelloWorld";
    const fileName = "dummy.txt";
    const mimeType = "text/plain";

    const result = download(dataUrl, fileName, mimeType);
    expect(result).toBe(true);

    // Find the appended element; fallback creates an iframe
    const appendedElement = appendChildSpy.mock.calls.find(
      (call) =>
        call[0] instanceof HTMLElement &&
        (call[0] as HTMLElement).tagName.toLowerCase() === "iframe"
    )?.[0] as HTMLIFrameElement;

    expect(appendedElement).toBeDefined();

    // In fallback, the URL is modified to force a download MIME ("application/octet-stream")
    expect(appendedElement.src).toBe(
      "data:application/octet-stream,HelloWorld"
    );

    // Fast-forward timers to trigger the removal of the iframe
    jest.runAllTimers();
    expect(removeChildSpy).toHaveBeenCalledWith(appendedElement);
  });

  test("should revoke object URL after anchor-based download", () => {
    const data = "HelloWorld";
    const fileName = "test.txt";
    const mimeType = "text/plain";

    const anchor = originalCreateElement.call(
      document,
      "a"
    ) as HTMLAnchorElement;
    const clickSpy = jest.spyOn(anchor, "click");

    // Use our anchor for all "a" element creations
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return anchor;
      }
      return originalCreateElement.call(document, tag);
    });

    const result = download(data, fileName, mimeType);
    expect(result).toBe(true);

    jest.runAllTimers();
    expect(clickSpy).toHaveBeenCalled();

    // Advance timers so that the inner timeout (250ms) to revoke the object URL is triggered
    jest.advanceTimersByTime(251);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(anchor.href);
  });
});
