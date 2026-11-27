import type { Node } from "prosemirror-model";

export function isCode(node: Node) {
  return node.type.name === "code_block" || node.type.name === "code_fence";
}

/**
 * Returns true if the node is a code block with Mermaid language (supports both "mermaid" and "mermaidjs").
 *
 * @param node The node to check.
 * @returns true if the node is a Mermaid code block.
 */
export function isMermaid(node: Node) {
  return (
    isCode(node) &&
    (node.attrs.language === "mermaid" || node.attrs.language === "mermaidjs")
  );
}

/**
 * Returns true if the node is a code block with D2 language.
 *
 * @param node the node to check.
 * @returns true if the node is a D2 code block.
 */
export function isD2(node: Node) {
  return isCode(node) && node.attrs.language === "d2";
}

/**
 * Returns true if the node is a code block with PlantUML language (supports both "plantuml" and "puml").
 *
 * @param node the node to check.
 * @returns true if the node is a PlantUML code block.
 */
export function isPlantUml(node: Node) {
  return (
    isCode(node) &&
    (node.attrs.language === "plantuml" || node.attrs.language === "puml")
  );
}

/**
 * Returns true if the node is a code block with a diagram service language (D2 or PlantUML).
 *
 * @param node the node to check.
 * @returns true if the node is a diagram service code block.
 */
export function isDiagramService(node: Node) {
  return isD2(node) || isPlantUml(node);
}
