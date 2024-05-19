import "../stores";
import { render } from "@testing-library/react";
import { TFunction } from "i18next";
import * as React from "react";
import { getI18n } from "react-i18next";
import { Pagination } from "@shared/constants";
import { Component as PaginatedList } from "./PaginatedList";

describe("PaginatedList", () => {
  const i18n = getI18n();

  const props = {
    i18n,
    tReady: true,
    t: ((key: string) => key) as TFunction,
  } as any;

  it("with no items renders nothing", () => {
    const result = render(
      <PaginatedList items={[]} renderItem={render} {...props} />
    );
    expect(result.container.innerHTML).toEqual("");
  });

  it("with no items renders empty prop", async () => {
    const result = render(
      <PaginatedList
        items={[]}
        empty={<p>Sorry, no results</p>}
        renderItem={render}
        {...props}
      />
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
      <PaginatedList
        items={[]}
        fetch={fetch}
        options={options}
        renderItem={render}
        {...props}
      />
    );
    expect(fetch).toHaveBeenCalledWith({
      ...options,
      limit: Pagination.defaultLimit,
      offset: 0,
    });
  });
});
