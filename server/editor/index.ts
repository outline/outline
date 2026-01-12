import { Schema } from "prosemirror-model";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import {
  basicExtensions,
  richExtensions,
  withComments,
} from "@shared/editor/nodes";
import Mention from "@shared/editor/nodes/Mention";

const extensions = withComments(richExtensions);
export const extensionManager = new ExtensionManager(extensions);

export const schema = new Schema({
  nodes: extensionManager.nodes,
  marks: extensionManager.marks,
});

for (const extension of extensionManager.extensions) {
  extension.bindEditor({
    schema,
    props: {
      theme: {
        isDark: false,
      },
    },
  } as any);
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
  extension.bindEditor({
    schema: basicSchema,
    props: {
      theme: {
        isDark: false,
      },
    },
  } as any);
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
  extension.bindEditor({
    schema: commentSchema,
    props: {
      theme: {
        isDark: false,
      },
    },
  } as any);
}

export const commentParser = commentExtensionManager.parser({
  schema: commentSchema,
  plugins: commentExtensionManager.rulePlugins,
});
