import {
  MultiplayerEntityType,
  parseMultiplayerName,
  toMultiplayerName,
} from "./EntityName";

describe("toMultiplayerName", () => {
  it("should build a name from type and id", () => {
    expect(toMultiplayerName(MultiplayerEntityType.Document, "123")).toEqual(
      "document.123"
    );
    expect(toMultiplayerName(MultiplayerEntityType.Collection, "123")).toEqual(
      "collection.123"
    );
  });
});

describe("parseMultiplayerName", () => {
  it("should parse a name into type and id", () => {
    expect(parseMultiplayerName("document.123")).toEqual({
      type: MultiplayerEntityType.Document,
      id: "123",
    });
    expect(parseMultiplayerName("collection.123")).toEqual({
      type: MultiplayerEntityType.Collection,
      id: "123",
    });
  });
});
