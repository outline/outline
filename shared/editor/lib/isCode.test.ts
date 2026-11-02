import { codeBlock, p } from "@shared/test/editor";
import { isD2, isPlantUml, isDiagramService } from "./isCode";

describe("isD2", () => {
  it("should return true for a code block with d2 language", () => {
    expect(isD2(codeBlock("", "d2"))).toBe(true);
  });

  it("should return false for a code block with javascript language", () => {
    expect(isD2(codeBlock("", "javascript"))).toBe(false);
  });

  it("should return false for a paragraph node", () => {
    expect(isD2(p("hello"))).toBe(false);
  });
});

describe("isPlantUml", () => {
  it("should return true for a code block with plantuml language", () => {
    expect(isPlantUml(codeBlock("", "plantuml"))).toBe(true);
  });

  it("should return true for a code block with puml language", () => {
    expect(isPlantUml(codeBlock("", "puml"))).toBe(true);
  });

  it("should return false for a code block with d2 language", () => {
    expect(isPlantUml(codeBlock("", "d2"))).toBe(false);
  });
});

describe("isDiagramService", () => {
  it("should return true for a d2 code block", () => {
    expect(isDiagramService(codeBlock("", "d2"))).toBe(true);
  });

  it("should return true for a plantuml code block", () => {
    expect(isDiagramService(codeBlock("", "plantuml"))).toBe(true);
  });

  it("should return true for a puml code block", () => {
    expect(isDiagramService(codeBlock("", "puml"))).toBe(true);
  });

  it("should return false for a mermaid code block", () => {
    expect(isDiagramService(codeBlock("", "mermaid"))).toBe(false);
  });

  it("should return false for a javascript code block", () => {
    expect(isDiagramService(codeBlock("", "javascript"))).toBe(false);
  });

  it("should return false for a paragraph node", () => {
    expect(isDiagramService(p("hello"))).toBe(false);
  });
});
