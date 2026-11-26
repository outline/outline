import { createMemoryHistory } from "history";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Router } from "react-router-dom";
import { usePathnameChange } from "./usePathnameChange";

interface Props {
  callback: () => void;
  enabled?: boolean;
}

function Harness({ callback, enabled }: Props) {
  usePathnameChange(callback, enabled);
  return null;
}

describe("usePathnameChange", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  });

  beforeEach(() => {
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  const render = (
    history: ReturnType<typeof createMemoryHistory>,
    props: Props
  ) =>
    act(() =>
      root.render(
        <Router history={history}>
          <Harness {...props} />
        </Router>
      )
    );

  it("calls the callback when the pathname changes", () => {
    const history = createMemoryHistory({ initialEntries: ["/home"] });
    const callback = vi.fn();
    render(history, { callback });

    act(() => history.push("/settings"));
    expect(callback).toHaveBeenCalledTimes(1);

    act(() => history.push("/settings/notifications"));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("ignores changes to only the search or hash", () => {
    const history = createMemoryHistory({ initialEntries: ["/home"] });
    const callback = vi.fn();
    render(history, { callback });

    act(() => history.replace("/home?notifications=true"));
    act(() => history.push("/home#section"));
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call the callback when disabled", () => {
    const history = createMemoryHistory({ initialEntries: ["/home"] });
    const callback = vi.fn();
    render(history, { callback, enabled: false });

    act(() => history.push("/settings"));
    expect(callback).not.toHaveBeenCalled();

    render(history, { callback, enabled: true });
    act(() => history.push("/settings/notifications"));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls the latest callback", () => {
    const history = createMemoryHistory({ initialEntries: ["/home"] });
    const first = vi.fn();
    const second = vi.fn();
    render(history, { callback: first });
    render(history, { callback: second });

    act(() => history.push("/settings"));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
