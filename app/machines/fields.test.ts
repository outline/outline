import { createActor } from "xstate";
import { describe, expect, it } from "vitest";
import { fieldsMachine } from "./fields";
/** Starts a form holding the given values. */
const start = (initial: Record<string, string>) =>
  createActor(fieldsMachine, { input: { initial } }).start();
describe("the values a form is holding", () => {
  it("starts pristine, holding what it was given", () => {
    const form = start({ name: "Rue" });
    expect(form.getSnapshot().value).toBe("pristine");
    expect(form.getSnapshot().context.values.name).toBe("Rue");
  });
  it("is dirty once something is typed", () => {
    const form = start({ name: "Rue" });
    form.send({ type: "SET", field: "name", value: "Milo" });
    expect(form.getSnapshot().value).toBe("dirty");
    expect(form.getSnapshot().context.values.name).toBe("Milo");
  });
  it("puts every field back, not only the one that changed", () => {
    // The setters this replaces had to be listed by hand, so a field added
    // later could be left out of the clearing and keep its old value.
    const form = start({ name: "Rue", note: "" });
    form.send({ type: "SET", field: "name", value: "Milo" });
    form.send({ type: "SET", field: "note", value: "nervous" });
    form.send({ type: "RESET" });
    expect(form.getSnapshot().context.values).toEqual({
      name: "Rue",
      note: "",
    });
    expect(form.getSnapshot().value).toBe("pristine");
  });
  it("ignores a reset it has nothing to undo", () => {
    const form = start({ name: "Rue" });
    form.send({ type: "RESET" });
    expect(form.getSnapshot().value).toBe("pristine");
  });
});
