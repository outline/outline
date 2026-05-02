import data from "@emoji-mart/data";
import type { EmojiMartData } from "@emoji-mart/data";
import { Schema } from "prosemirror-model";
import type { Editor } from "~/editor";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import { populateEmojiData } from "@shared/editor/lib/emoji";
import {
  basicExtensions,
  richExtensions,
  withComments,
} from "@shared/editor/nodes";
import Mention from "@shared/editor/nodes/Mention";

populateEmojiData(data as EmojiMartData);

// Server-side parsing/serializing only requires schema and a few static props,
// but the Extension API expects a full Editor. This stub satisfies bindEditor
// without instantiating the React component.
const stubEditor = (s: Schema): Editor =>
  ({ schema: s, props: { theme: { isDark: false } } }) as unknown as Editor;

const extensions = withComments(richExtensions);
export const extensionManager = new ExtensionManager(extensions);

export const schema = new Schema({
  nodes: extensionManager.nodes,
  marks: extensionManager.marks,
});

for (const extension of extensionManager.extensions) {
  extension.bindEditor(stubEditor(schema));
}

export const parser = extensionManager.parser({
  schema,
  plugins: extensionManager.rulePlugins,
});

export const serializer = extensionManager.serializer();

export const plugins = extensionManager.plugins;

export const basicExtensionManager = new ExtensionManager(basicExtensions);

export const basicSchema = new Schema({
  nodes: basicExtensionManager.nodes,
  marks: basicExtensionManager.marks,
});

for (const extension of basicExtensionManager.extensions) {
  extension.bindEditor(stubEditor(basicSchema));
}

export const basicParser = basicExtensionManager.parser({
  schema: basicSchema,
  plugins: basicExtensionManager.rulePlugins,
});

const commentExtensions = [...basicExtensions, Mention];
export const commentExtensionManager = new ExtensionManager(commentExtensions);

export const commentSchema = new Schema({
  nodes: commentExtensionManager.nodes,
  marks: commentExtensionManager.marks,
});

for (const extension of commentExtensionManager.extensions) {
  extension.bindEditor(stubEditor(commentSchema));
}

export const commentParser = commentExtensionManager.parser({
  schema: commentSchema,
  plugins: commentExtensionManager.rulePlugins,
});
