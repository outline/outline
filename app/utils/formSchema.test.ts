import { describe, expect, it } from "vitest";
import type { DocType } from "./formSchema";
import { evaluateDependsOn, validateForm, visibleFields } from "./formSchema";

const roomDocType: DocType = {
  name: "Room",
  title: "Room",
  fields: [
    { fieldname: "name", label: "Name", fieldtype: "text", required: true },
    {
      fieldname: "type",
      label: "Type",
      fieldtype: "select",
      required: true,
      options: [
        { value: "standard", label: "Standard" },
        { value: "suite", label: "Suite" },
      ],
    },
    {
      fieldname: "capacity",
      label: "Capacity",
      fieldtype: "number",
      required: true,
      min: 1,
      max: 20,
    },
    {
      fieldname: "suiteExtras",
      label: "Suite extras",
      fieldtype: "text",
      required: true,
      dependsOn: "type == suite",
    },
    { fieldname: "email", label: "Email", fieldtype: "email" },
  ],
};

describe("evaluateDependsOn", () => {
  it("shows a field when its condition holds", () => {
    expect(evaluateDependsOn("type == suite", { type: "suite" })).toBe(true);
  });

  it("hides a field when its condition does not hold", () => {
    expect(evaluateDependsOn("type == suite", { type: "standard" })).toBe(
      false
    );
  });

  it("understands a negative condition", () => {
    expect(evaluateDependsOn("type != suite", { type: "standard" })).toBe(true);
    expect(evaluateDependsOn("type != suite", { type: "suite" })).toBe(false);
  });

  it("treats a bare field name as 'has a value'", () => {
    expect(evaluateDependsOn("name", { name: "Kandang A1" })).toBe(true);
    expect(evaluateDependsOn("name", { name: "" })).toBe(false);
  });

  it("shows a field with no condition at all", () => {
    expect(evaluateDependsOn(undefined, {})).toBe(true);
  });

  it("hides rather than guesses when the condition makes no sense", () => {
    expect(evaluateDependsOn("this is nonsense", { type: "suite" })).toBe(
      false
    );
  });
});

describe("visibleFields", () => {
  it("leaves out a field whose condition does not hold", () => {
    const shown = visibleFields(roomDocType, { type: "standard" });

    expect(shown.map((field) => field.fieldname)).not.toContain("suiteExtras");
  });

  it("includes it once the condition holds", () => {
    const shown = visibleFields(roomDocType, { type: "suite" });

    expect(shown.map((field) => field.fieldname)).toContain("suiteExtras");
  });
});

describe("validateForm", () => {
  it("passes a form that is filled in properly", () => {
    const errors = validateForm(roomDocType, {
      name: "Kandang A1",
      type: "standard",
      capacity: "2",
    });

    expect(errors).toEqual({});
  });

  it("objects to a required field left empty", () => {
    const errors = validateForm(roomDocType, {
      name: "  ",
      type: "standard",
      capacity: "2",
    });

    expect(errors.name).toBeDefined();
  });

  it("does not demand a field that is not being shown", () => {
    // suiteExtras is required, but only when the type is a suite.
    const errors = validateForm(roomDocType, {
      name: "Kandang A1",
      type: "standard",
      capacity: "2",
    });

    expect(errors.suiteExtras).toBeUndefined();
  });

  it("demands it once it is being shown", () => {
    const errors = validateForm(roomDocType, {
      name: "Suite B1",
      type: "suite",
      capacity: "1",
    });

    expect(errors.suiteExtras).toBeDefined();
  });

  it("objects to a number that is not one", () => {
    const errors = validateForm(roomDocType, {
      name: "Kandang A1",
      type: "standard",
      capacity: "two",
    });

    expect(errors.capacity).toBeDefined();
  });

  it("objects to a number below its minimum", () => {
    const errors = validateForm(roomDocType, {
      name: "Kandang A1",
      type: "standard",
      capacity: "0",
    });

    expect(errors.capacity).toBeDefined();
  });

  it("objects to a number above its maximum", () => {
    const errors = validateForm(roomDocType, {
      name: "Kandang A1",
      type: "standard",
      capacity: "999",
    });

    expect(errors.capacity).toBeDefined();
  });

  it("objects to an address that is not one", () => {
    const errors = validateForm(roomDocType, {
      name: "Kandang A1",
      type: "standard",
      capacity: "2",
      email: "not-an-address",
    });

    expect(errors.email).toBeDefined();
  });

  it("lets an optional field be left alone", () => {
    const errors = validateForm(roomDocType, {
      name: "Kandang A1",
      type: "standard",
      capacity: "2",
      email: "",
    });

    expect(errors.email).toBeUndefined();
  });

  it("objects to a choice that is not on offer", () => {
    const errors = validateForm(roomDocType, {
      name: "Kandang A1",
      type: "penthouse",
      capacity: "2",
    });

    expect(errors.type).toBeDefined();
  });
});
