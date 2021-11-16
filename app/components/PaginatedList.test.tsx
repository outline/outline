import "../stores";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'enzy... Remove this comment to see the full error message
import { shallow } from "enzyme";
import * as React from "react";
import AuthStore from "stores/AuthStore";
import { DEFAULT_PAGINATION_LIMIT } from "stores/BaseStore";
import RootStore from "stores/RootStore";
import { runAllPromises } from "../test/support";
import { Component as PaginatedList } from "./PaginatedList";

describe("PaginatedList", () => {
  const render = () => null;

  const rootStore = new RootStore();
  const props = {
    auth: new AuthStore(rootStore),
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'string' implicitly has an 'any' type.
    t: (string) => "test",
  };
  it("with no items renders nothing", () => {
    const list = shallow(
      <PaginatedList items={[]} renderItem={render} {...props} />
    );
    expect(list).toEqual({});
  });
  it("with no items renders empty prop", () => {
    const list = shallow(
      <PaginatedList
        items={[]}
        empty={<p>Sorry, no results</p>}
        renderItem={render}
        {...props}
      />
    );
    expect(list.text()).toEqual("Sorry, no results");
  });
  it("calls fetch with options + pagination on mount", () => {
    const fetch = jest.fn();
    const options = {
      id: "one",
    };
    shallow(
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
      limit: DEFAULT_PAGINATION_LIMIT,
      offset: 0,
    });
  });
  it("calls fetch when options prop changes", async () => {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 1-3 arguments, but got 0.
    const fetchedItems = Array(DEFAULT_PAGINATION_LIMIT).fill();
    const fetch = jest.fn().mockReturnValue(Promise.resolve(fetchedItems));
    const list = shallow(
      <PaginatedList
        items={[]}
        fetch={fetch}
        options={{
          id: "one",
        }}
        renderItem={render}
        {...props}
      />
    );
    await runAllPromises();
    expect(fetch).toHaveBeenCalledWith({
      id: "one",
      limit: DEFAULT_PAGINATION_LIMIT,
      offset: 0,
    });
    fetch.mockReset();
    list.setProps({
      fetch,
      items: [],
      options: {
        id: "two",
      },
    });
    await runAllPromises();
    expect(fetch).toHaveBeenCalledWith({
      id: "two",
      limit: DEFAULT_PAGINATION_LIMIT,
      offset: 0,
    });
  });
});
