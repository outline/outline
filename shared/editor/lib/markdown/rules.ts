import markdownit, { PluginSimple } from "markdown-it";

export default function rules({
  rules = {},
  plugins = [],
}: {
  rules?: Record<string, any>;
  plugins?: PluginSimple[];
}) {
  const markdownIt = markdownit("default", {
    breaks: false,
    html: false,
    linkify: false,
    ...rules,
  });
  plugins.forEach(plugin => markdownIt.use(plugin));
  return markdownIt;
}
