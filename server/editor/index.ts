import { Schema } from "prosemirror-model";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import { richExtensions, withComments } from "@shared/editor/nodes";

const extensions = withComments(richExtensions);
const extensionManager = new ExtensionManager(extensions);

export const schema = new Schema({
  nodes: extensionManager.nodes,
  marks: extensionManager.marks,
});

export const parser = extensionManager.parser({
  schema,
  plugins: extensionManager.rulePlugins,
});

export const serializer = extensionManager.serializer();
