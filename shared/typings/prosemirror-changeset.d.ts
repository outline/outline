declare module "prosemirror-changeset" {
  import { Node, Slice } from "prosemirror-model";
  import { StepMap } from "prosemirror-transform";

  export interface Deletion {
    pos: number;
    from: number;
    to: number;
    slice: Slice;
  }

  export interface Insertion {
    from: number;
    to: number;
  }

  export class ChangeSet {
    inserted: Insertion[];
    deleted: Deletion[];

    static create(doc: Node, combine?: (a: any, b: any) => any): ChangeSet;

    addSteps(newDoc: Node, maps: readonly StepMap[], data?: any): ChangeSet;
  }
}
