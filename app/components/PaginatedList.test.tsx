import "../stores";
import { render } from "@testing-library/react";
import { TFunction } from "i18next";
import { Provider } from "mobx-react";
import { getI18n } from "react-i18next";
import { Pagination } from "@shared/constants";
import PaginatedList from "./PaginatedList";

describe("PaginatedList", () => {
  const i18n = getI18n();
  const authStore = {};

  const props = {
    i18n,
    tReady: true,
    t: ((key: string) => key) as TFunction,
  } as any;

  it("with no items renders nothing", () => {
    const result = render(
      <Provider auth={authStore}>
        <PaginatedList items={[]} renderItem={render} {...props} />
      </Provider>
    );
    expect(result.container.innerHTML).toEqual("");
  });

  it("with no items renders empty prop", async () => {
    const result = render(
      <Provider auth={authStore}>
        <PaginatedList
          items={[]}
          empty={<p>Sorry, no results</p>}
          renderItem={render}
          {...props}
        />{" "}
      </Provider>
    );
    await expect(
      result.findAllByText("Sorry, no results")
    ).resolves.toHaveLength(1);
  });

  it("calls fetch with options + pagination on mount", () => {
    const fetch = jest.fn();
    const options = {
      id: "one",
    };
    render(
      <Provider auth={authStore}>
        <PaginatedList
          items={[]}
          fetch={fetch}
          options={options}
          renderItem={render}
          {...props}
        />{" "}
      </Provider>
    );
    expect(fetch).toHaveBeenCalledWith({
      ...options,
      limit: Pagination.defaultLimit,
      offset: 0,
    });
  });
});
