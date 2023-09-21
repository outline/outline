import { diffWordsWithSpace, diffChars, Change } from "diff";
import { Node, Schema } from "prosemirror-model";
import { Transform } from "prosemirror-transform";
import { applyPatch, createPatch, Operation } from "rfc6902";
import { ReplaceOperation } from "rfc6902/diff";
import { copy } from "./copy";
import { getFromPath } from "./getFromPath";
import { getReplaceStep } from "./getReplaceStep";
import { removeMarks } from "./removeMarks";
import { simplifyTransform } from "./simplifyTransform";
import { JSONObject } from "./types";

export interface Options {
  complexSteps?: boolean;
  wordDiffs?: boolean;
  simplifyDiff?: boolean;
}

export class RecreateTransform {
  fromDoc: Node;
  toDoc: Node;
  complexSteps: boolean;
  wordDiffs: boolean;
  simplifyDiff: boolean;
  schema: Schema;
  tr: Transform;
  /* current working document data, may get updated while recalculating node steps */
  currentJSON: JSONObject;
  /* final document as json data */
  finalJSON: JSONObject;
  ops: Array<Operation>;

  constructor(fromDoc: Node, toDoc: Node, options: Options = {}) {
    const o = {
      complexSteps: true,
      wordDiffs: false,
      simplifyDiff: true,
      ...options,
    };

    this.fromDoc = fromDoc;
    this.toDoc = toDoc;
    this.complexSteps = o.complexSteps; // Whether to return steps other than ReplaceSteps
    this.wordDiffs = o.wordDiffs; // Whether to make text diffs cover entire words
    this.simplifyDiff = o.simplifyDiff;
    this.schema = fromDoc.type.schema;
    this.tr = new Transform(fromDoc);
    this.currentJSON = {};
    this.finalJSON = {};
    this.ops = [];
  }

  init() {
    if (this.complexSteps) {
      // For First steps: we create versions of the documents without marks as
      // these will only confuse the diffing mechanism and marks won't cause
      // any mapping changes anyway.
      this.currentJSON = removeMarks(this.fromDoc).toJSON();
      this.finalJSON = removeMarks(this.toDoc).toJSON();
      this.ops = createPatch(this.currentJSON, this.finalJSON);
      this.recreateChangeContentSteps();
      this.recreateChangeMarkSteps();
    } else {
      // We don't differentiate between mark changes and other changes.
      this.currentJSON = this.fromDoc.toJSON();
      this.finalJSON = this.toDoc.toJSON();
      this.ops = createPatch(this.currentJSON, this.finalJSON);
      this.recreateChangeContentSteps();
    }

    if (this.simplifyDiff) {
      this.tr = simplifyTransform(this.tr) || this.tr;
    }

    return this.tr;
  }

  /** convert json-diff to prosemirror steps */
  recreateChangeContentSteps() {
    // First step: find content changing steps.
    let ops = [];
    while (this.ops.length) {
      // get next
      let op = this.ops.shift() as Operation;
      ops.push(op);

      let toDoc;
      const afterStepJSON = copy(this.currentJSON); // working document receiving patches
      const pathParts = op.path.split("/");

      // collect operations until we receive a valid document:
      // apply ops-patches until a valid prosemirror document is retrieved,
      // then try to create a transformation step or retry with next operation
      while (!toDoc) {
        applyPatch(afterStepJSON, [op]);

        try {
          toDoc = this.schema.nodeFromJSON(afterStepJSON);
          toDoc.check();
        } catch (error) {
          toDoc = null;
          if (this.ops.length > 0) {
            op = this.ops.shift() as Operation;
            ops.push(op);
          } else {
            throw new Error(`No valid diff possible applying ${op.path}`);
          }
        }
      }

      // apply operation (ignoring afterStepJSON)
      if (
        this.complexSteps &&
        ops.length === 1 &&
        (pathParts.includes("attrs") || pathParts.includes("type"))
      ) {
        // Node markup is changing
        this.addSetNodeMarkup(); // a lost update is ignored
        ops = [];
      } else if (
        ops.length === 1 &&
        op.op === "replace" &&
        pathParts[pathParts.length - 1] === "text"
      ) {
        // Text is being replaced, we apply text diffing to find the smallest possible diffs.
        this.addReplaceTextSteps(op, afterStepJSON);
        ops = [];
      } else if (this.addReplaceStep(toDoc, afterStepJSON)) {
        // operations have been applied
        ops = [];
      }
    }
  }

  /** update node with attrs and marks, may also change type */
  addSetNodeMarkup() {
    // first diff in document is supposed to be a node-change (in type and/or attributes)
    // thus simply find the first change and apply a node change step, then recalculate the diff
    // after updating the document
    const fromDoc = this.schema.nodeFromJSON(this.currentJSON);
    const toDoc = this.schema.nodeFromJSON(this.finalJSON);
    const start = toDoc.content.findDiffStart(fromDoc.content) as number;
    // @note start is the same (first) position for current and target document
    const fromNode = fromDoc.nodeAt(start) as Node;
    const toNode = toDoc.nodeAt(start) as Node;

    if (!start) {
      // @note this completly updates all attributes in one step, by completely replacing node
      const nodeType = fromNode.type === toNode.type ? null : toNode.type;
      try {
        this.tr.setNodeMarkup(start, nodeType, toNode.attrs, toNode.marks);
      } catch (e) {
        // if nodetypes differ, the updated node-type and contents might not be compatible
        // with schema and requires a replace
        if (nodeType && (e as Error).message.includes("Invalid content")) {
          // @todo add test-case for this scenario
          this.tr.replaceWith(start, start + fromNode.nodeSize, toNode);
        } else {
          throw e;
        }
      }
      this.currentJSON = removeMarks(this.tr.doc).toJSON();
      // setting the node markup may have invalidated the following ops, so we calculate them again.
      this.ops = createPatch(this.currentJSON, this.finalJSON);
      return true;
    }
    return false;
  }

  recreateChangeMarkSteps() {
    // Now the documents should be the same, except their marks, so everything should map 1:1.
    // Second step: Iterate through the toDoc and make sure all marks are the same in tr.doc
    this.toDoc.descendants((tNode, tPos) => {
      if (!tNode.isInline) {
        return true;
      }

      this.tr.doc.nodesBetween(tPos, tPos + tNode.nodeSize, (fNode, fPos) => {
        if (!fNode.isInline) {
          return true;
        }
        const from = Math.max(tPos, fPos);
        const to = Math.min(tPos + tNode.nodeSize, fPos + fNode.nodeSize);
        fNode.marks.forEach((nodeMark) => {
          if (!nodeMark.isInSet(tNode.marks)) {
            this.tr.removeMark(from, to, nodeMark);
          }
        });
        tNode.marks.forEach((nodeMark) => {
          if (!nodeMark.isInSet(fNode.marks)) {
            this.tr.addMark(from, to, nodeMark);
          }
        });

        return;
      });

      return;
    });
  }

  /**
   * retrieve and possibly apply replace-step based from doc changes
   * From http://prosemirror.net/examples/footnote/
   */
  addReplaceStep(toDoc: Node, afterStepJSON: JSONObject) {
    const fromDoc = this.schema.nodeFromJSON(this.currentJSON);
    const step = getReplaceStep(fromDoc, toDoc);

    if (!step) {
      return false;
    } else if (!this.tr.maybeStep(step).failed) {
      this.currentJSON = afterStepJSON;
      return true; // @change previously null
    }

    throw new Error("No valid step found.");
  }

  /** retrieve and possibly apply text replace-steps based from doc changes */
  addReplaceTextSteps(op: ReplaceOperation, afterStepJSON: JSONObject) {
    // We find the position number of the first character in the string
    const op1 = { ...op, value: "xx" };
    const op2 = { ...op, value: "yy" };
    const afterOP1JSON = copy(this.currentJSON);
    const afterOP2JSON = copy(this.currentJSON);
    applyPatch(afterOP1JSON, [op1]);
    applyPatch(afterOP2JSON, [op2]);
    const op1Doc = this.schema.nodeFromJSON(afterOP1JSON);
    const op2Doc = this.schema.nodeFromJSON(afterOP2JSON);

    // get text diffs
    const finalText = op.value;
    const currentText = getFromPath(this.currentJSON, op.path) as string;
    const textDiffs = this.wordDiffs
      ? diffWordsWithSpace(currentText, finalText)
      : diffChars(currentText, finalText);

    let offset = op1Doc.content.findDiffStart(op2Doc.content) as number;
    const marks = op1Doc.resolve(offset + 1).marks();

    while (textDiffs.length) {
      const diff = textDiffs.shift() as Change;

      if (diff.added) {
        const textNode = this.schema
          .nodeFromJSON({ type: "text", text: diff.value })
          .mark(marks);

        if (textDiffs.length && textDiffs[0].removed) {
          const nextDiff = textDiffs.shift() as Change;
          this.tr.replaceWith(offset, offset + nextDiff.value.length, textNode);
        } else {
          this.tr.insert(offset, textNode);
        }
        offset += diff.value.length;
      } else if (diff.removed) {
        if (textDiffs.length && textDiffs[0].added) {
          const nextDiff = textDiffs.shift() as Change;
          const textNode = this.schema
            .nodeFromJSON({ type: "text", text: nextDiff.value })
            .mark(marks);
          this.tr.replaceWith(offset, offset + diff.value.length, textNode);
          offset += nextDiff.value.length;
        } else {
          this.tr.delete(offset, offset + diff.value.length);
        }
      } else {
        offset += diff.value.length;
      }
    }

    this.currentJSON = afterStepJSON;
  }
}

export function recreateTransform(
  fromDoc: Node,
  toDoc: Node,
  options: Options = {}
): Transform {
  const recreator = new RecreateTransform(fromDoc, toDoc, options);
  return recreator.init();
}
