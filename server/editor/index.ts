import { Schema } from "prosemirror-model";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import fullPackage from "@shared/editor/packages/full";

const extensions = new ExtensionManager(fullPackage);

export const schema = new Schema({
  nodes: extensions.nodes,
  marks: extensions.marks,
});

export const parser = extensions.parser({
  schema,
  plugins: extensions.rulePlugins,
});

export const serializer = extensions.serializer();
