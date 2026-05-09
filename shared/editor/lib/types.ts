import type Mark from "../marks/Mark";
import type Node from "../nodes/Node";
import type Extension from "./Extension";

/**
 * Type-erased Extension, Mark, or Node instance. Used at registration
 * boundaries where the specific options shape is not relevant.
 */
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyExtension = Extension<any> | Mark<any> | Node<any>;

/**
 * Constructor for any Extension, Mark, or Node subclass, regardless of its
 * options shape.
 */
export type AnyExtensionClass = abstract new (
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => AnyExtension;
