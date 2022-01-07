import createMarkdown from "./markdown/rules";
import { PluginSimple } from "markdown-it";
import markRule from "../rules/mark";
import checkboxRule from "../rules/checkboxes";
import embedsRule from "../rules/embeds";
import breakRule from "../rules/breaks";
import tablesRule from "../rules/tables";
import noticesRule from "../rules/notices";
import underlinesRule from "../rules/underlines";
import emojiRule from "../rules/emoji";

const defaultRules = [
  embedsRule,
  breakRule,
  checkboxRule,
  markRule({ delim: "==", mark: "highlight" }),
  markRule({ delim: "!!", mark: "placeholder" }),
  underlinesRule,
  tablesRule,
  noticesRule,
  emojiRule,
];

export default function renderToHtml(
  markdown: string,
  rulePlugins: PluginSimple[] = defaultRules
): string {
  return createMarkdown({ plugins: rulePlugins })
    .render(markdown)
    .trim();
}
