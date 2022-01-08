import { PluginSimple } from "markdown-it";
import breakRule from "../rules/breaks";
import checkboxRule from "../rules/checkboxes";
import embedsRule from "../rules/embeds";
import emojiRule from "../rules/emoji";
import markRule from "../rules/mark";
import noticesRule from "../rules/notices";
import tablesRule from "../rules/tables";
import underlinesRule from "../rules/underlines";
import createMarkdown from "./markdown/rules";

const defaultRules = [
  embedsRule([]),
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
  return createMarkdown({ plugins: rulePlugins }).render(markdown).trim();
}
