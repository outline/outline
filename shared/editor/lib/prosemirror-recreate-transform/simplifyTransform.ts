import { Node } from "prosemirror-model";
import { Transform, ReplaceStep, Step } from "prosemirror-transform";
import { getReplaceStep } from "./getReplaceStep";

// join adjacent ReplaceSteps
export function simplifyTransform(tr: Transform) {
  if (!tr.steps.length) {
    return undefined;
  }

  const newTr = new Transform(tr.docs[0]);
  const oldSteps = tr.steps.slice();

  while (oldSteps.length) {
    let step = oldSteps.shift() as Step;
    while (oldSteps.length && step.merge(oldSteps[0])) {
      const addedStep = oldSteps.shift() as Step;
      if (step instanceof ReplaceStep && addedStep instanceof ReplaceStep) {
        step = getReplaceStep(
          newTr.doc,
          addedStep.apply(step.apply(newTr.doc).doc as Node).doc as Node
        ) as Step;
      } else {
        step = step.merge(addedStep) as Step;
      }
    }
    newTr.step(step);
  }
  return newTr;
}
