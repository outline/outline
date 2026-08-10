import { createActor } from "xstate";
import { describe, expect, it } from "vitest";
import { linesMachine } from "./lines";

/** A document with nothing on it yet. */
const start = () => createActor(linesMachine).start();

describe("the lines on a document being drawn up", () => {
  it("starts empty", () => {
    expect(start().getSnapshot().value).toBe("empty");
  });

  it("holds lines once one is added", () => {
    const doc = start();

    doc.send({ type: "ADD", line: { name: "A service" } });

    expect(doc.getSnapshot().value).toBe("holding");
    expect(doc.getSnapshot().context.lines).toHaveLength(1);
  });

  it("goes back to empty when the last line is taken off", () => {
    const doc = start();
    doc.send({ type: "ADD", line: { name: "A service" } });

    doc.send({ type: "REMOVE", at: 0 });

    expect(doc.getSnapshot().value).toBe("empty");
  });

  it("removes the line that was asked for, not another", () => {
    const doc = start();
    doc.send({ type: "ADD", line: { name: "first" } });
    doc.send({ type: "ADD", line: { name: "second" } });
    doc.send({ type: "ADD", line: { name: "third" } });

    doc.send({ type: "REMOVE", at: 1 });

    expect(doc.getSnapshot().context.lines.map((l) => l.name)).toEqual([
      "first",
      "third",
    ]);
  });

  it("has nothing to remove while it is empty", () => {
    expect(start().getSnapshot().can({ type: "REMOVE", at: 0 })).toBe(false);
  });
});
