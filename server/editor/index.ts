import { Schema } from "prosemirror-model";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import extensionsPackage from "@shared/editor/packages/fullWithComments";

const extensions = new ExtensionManager(extensionsPackage);

export const schema = new Schema({
  nodes: extensions.nodes,
  marks: extensions.marks,
});

export const parser = extensions.parser({
  schema,
  plugins: extensions.rulePlugins,
});

export const serializer = extensions.serializer();
