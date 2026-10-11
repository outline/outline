import type Model from "../base/Model";
import Field, { getFieldsForModelClass } from "./Field";

describe("Field", () => {
  it("records fields on the decorated class", () => {
    class Example {}
    Field(Example.prototype as Model, "name");
    Field(Example.prototype as Model, "color");

    expect(getFieldsForModelClass(Example)).toEqual(["name", "color"]);
  });

  it("does not leak fields between classes that share a name", () => {
    // Minified builds can mangle two unrelated classes to the same name.
    const One = class Model {};
    const Two = class Model {};

    Field(One.prototype as Model, "name");
    Field(Two.prototype as Model, "index");

    expect(getFieldsForModelClass(One)).toEqual(["name"]);
    expect(getFieldsForModelClass(Two)).toEqual(["index"]);
  });
});
