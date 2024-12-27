import markdownit, { PluginSimple } from "markdown-it";
import { Schema } from "prosemirror-model";

type Options = {
  /** Markdown-it options. */
  rules?: markdownit.Options;
  /** Markdown-it plugins. */
  plugins?: PluginSimple[];
  /** The schema for associated editor. */
  schema?: Schema;
};

export default function makeRules({
  rules = {},
  plugins = [],
  schema,
}: Options) {
  const markdownIt = markdownit("default", {
    breaks: false,
    html: false,
    linkify: false,
    ...rules,
  });

  // Disable default markdown-it rules that are not supported by the schema.
  if (!schema?.nodes.ordered_list || !schema?.nodes.bullet_list) {
    markdownIt.disable("list");
  }
  if (!schema?.nodes.blockquote) {
    markdownIt.disable("blockquote");
  }
  if (!schema?.nodes.hr) {
    markdownIt.disable("hr");
  }
  if (!schema?.nodes.heading) {
    markdownIt.disable("heading");
  }

  plugins.forEach((plugin) => markdownIt.use(plugin));
  return markdownIt;
}
