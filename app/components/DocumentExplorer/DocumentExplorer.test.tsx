import type { ReactNode } from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { ThemeProvider } from "styled-components";
import { vi } from "vitest";
import type { NavigationNode } from "@shared/types";
import { buildLightTheme } from "@shared/styles/theme";
import DocumentExplorer from "./DocumentExplorer";

vi.mock("react-virtualized-auto-sizer", () => ({
  default: ({ children }: { children: (size: { width: number; height: number }) => ReactNode }) =>
    children({ width: 320, height: 240 }),
}));

vi.mock("react-window", async () => {
  const React = await import("react");

  return {
    FixedSizeList: React.forwardRef(function FixedSizeList(
      {
        itemData,
        itemCount,
        itemSize,
        width,
        children: Row,
        innerElementType: InnerElement = "div",
      }: {
        itemData: NavigationNode[];
        itemCount: number;
        itemSize: number;
        width: number;
        children: React.ComponentType<{
          index: number;
          data: NavigationNode[];
          style: React.CSSProperties;
        }>;
        innerElementType?: React.ElementType;
      },
      ref
    ) {
      React.useImperativeHandle(ref, () => ({
        props: { itemSize, height: 240 },
        state: { scrollOffset: 0 },
        scrollTo: vi.fn(),
        scrollToItem: vi.fn(),
      }));

      return (
        <InnerElement style={{ width, height: itemCount * itemSize }}>
          {itemData.map((_, index) => (
            <Row
              key={itemData[index].id}
              index={index}
              data={itemData}
              style={{
                position: "absolute",
                top: index * itemSize,
                left: 0,
                width: "100%",
                height: itemSize,
              }}
            />
          ))}
        </InnerElement>
      );
    }),
  };
});

vi.mock("~/hooks/useMobile", () => ({
  default: () => false,
}));

vi.mock("~/hooks/useStores", () => ({
  default: () => ({
    collections: {
      get: () => undefined,
      orderedData: [],
    },
    documents: {
      get: () => undefined,
    },
  }),
}));

vi.mock("~/components/InputSearch", async () => {
  const React = await import("react");

  return {
    default: React.forwardRef(function InputSearch(
      props: React.ComponentPropsWithoutRef<"input">,
      ref: React.ForwardedRef<HTMLInputElement>
    ) {
      const { round, labelHidden, margin, icon, ...rest } = props;

      return <input ref={ref} type="search" {...rest} />;
    }),
  };
});

vi.mock("./DocumentExplorerNode", async () => {
  const React = await import("react");

  return {
    default: React.forwardRef(function DocumentExplorerNode(
      {
        title,
        onClick,
        onDoubleClick,
      }: {
        title: string;
        onClick: React.MouseEventHandler<HTMLButtonElement>;
        onDoubleClick: React.MouseEventHandler<HTMLButtonElement>;
      },
      ref: React.ForwardedRef<HTMLButtonElement>
    ) {
      return (
        <button ref={ref} role="option" onClick={onClick} onDoubleClick={onDoubleClick}>
          {title}
        </button>
      );
    }),
  };
});

vi.mock("./DocumentExplorerSearchResult", async () => ({
  default: ({
    title,
    onClick,
    onDoubleClick,
  }: {
    title: string;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
    onDoubleClick: React.MouseEventHandler<HTMLButtonElement>;
  }) => (
    <button role="option" onClick={onClick} onDoubleClick={onDoubleClick}>
      {title}
    </button>
  ),
}));

const theme = buildLightTheme({});

describe("DocumentExplorer", () => {
  const node: NavigationNode = {
    id: "doc-1",
    title: "Destination",
    url: "/destination",
    collectionId: "collection-1",
    type: "document",
    parent: null,
    depth: 0,
    children: [],
  };

  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  });

  const renderComponent = (onSubmit = vi.fn(), onSelect = vi.fn()) =>
    act(() => {
      ReactDOM.render(
        <ThemeProvider theme={theme}>
          <DocumentExplorer items={[node]} onSubmit={onSubmit} onSelect={onSelect} />
        </ThemeProvider>,
        container
      );
    });

  const doubleClick = (element: Element) =>
    act(() => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    });

  it("submits the clicked node on double click in the tree list", () => {
    const onSubmit = vi.fn();

    renderComponent(onSubmit);

    const option = container.querySelector('[role="option"]');

    expect(option).not.toBeNull();

    doubleClick(option as Element);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(node);
  });

  it("submits the clicked node on double click in search results", () => {
    const onSubmit = vi.fn();

    renderComponent(onSubmit);

    const input = container.querySelector('input[type="search"]') as HTMLInputElement;

    act(() => {
      input.value = "Dest";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const option = container.querySelector('[role="option"]');

    expect(option).not.toBeNull();

    doubleClick(option as Element);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(node);
  });
});
