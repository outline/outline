import naturalSort from "./naturalSort";

describe("#naturalSort", () => {
  it("should sort a list of objects by the given key", () => {
    const items = [
      {
        name: "Joan",
      },
      {
        name: "Pedro",
      },
      {
        name: "Mark",
      },
    ];
    expect(naturalSort(items, "name")).toEqual([
      {
        name: "Joan",
      },
      {
        name: "Mark",
      },
      {
        name: "Pedro",
      },
    ]);
  });

  it("should accept a function as the object key", () => {
    const items = [
      {
        name: "Joan",
      },
      {
        name: "Pedro",
      },
      {
        name: "Mark",
      },
    ];
    expect(naturalSort(items, (item) => item.name)).toEqual([
      {
        name: "Joan",
      },
      {
        name: "Mark",
      },
      {
        name: "Pedro",
      },
    ]);
  });

  it("should accept natural-sort options", () => {
    const items = [
      {
        name: "Joan",
      },
      {
        name: "joan",
      },
      {
        name: "Pedro",
      },
      {
        name: "Mark",
      },
    ];
    expect(
      naturalSort(items, "name", {
        direction: "desc",
        caseSensitive: true,
      })
    ).toEqual([
      {
        name: "Pedro",
      },
      {
        name: "Mark",
      },
      {
        name: "Joan",
      },
      {
        name: "joan",
      },
    ]);
  });

  it("should ignore non basic latin letters", () => {
    const items = [
      {
        name: "Abel",
      },
      {
        name: "Martín",
      },
      {
        name: "Ávila",
      },
    ];
    expect(naturalSort(items, "name")).toEqual([
      {
        name: "Abel",
      },
      {
        name: "Ávila",
      },
      {
        name: "Martín",
      },
    ]);
  });

  it("should ignore emojis", () => {
    const items = [
      {
        title: "🍔 Document 2",
      },
      {
        title: "🐻 Document 3",
      },
      {
        title: "🙂 Document 1",
      },
    ];
    expect(naturalSort(items, "title")).toEqual([
      {
        title: "🙂 Document 1",
      },
      {
        title: "🍔 Document 2",
      },
      {
        title: "🐻 Document 3",
      },
    ]);
  });
});

describe("#naturalSort performance", () => {
  it("should quickly sort long titles that contain years", () => {
    const items = Array.from({ length: 400 }, (_, i) => ({
      title: `Engineering planning notes and retrospective ${2000 + (i % 25)} part ${i}`,
    }));

    const start = performance.now();
    const sorted = naturalSort(items, "title");
    const duration = performance.now() - start;

    expect(sorted[0].title).toEqual(
      "Engineering planning notes and retrospective 2000 part 0"
    );
    expect(sorted[1].title).toEqual(
      "Engineering planning notes and retrospective 2000 part 25"
    );
    expect(duration).toBeLessThan(500);
  });
});
