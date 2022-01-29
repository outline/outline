import { PluginSimple } from "markdown-it";
import createMarkdown from "@shared/editor/lib/markdown/rules";
import attachmentsRule from "@shared/editor/rules/attachments";
import breakRule from "@shared/editor/rules/breaks";
import checkboxRule from "@shared/editor/rules/checkboxes";
import embedsRule from "@shared/editor/rules/embeds";
import emojiRule from "@shared/editor/rules/emoji";
import markRule from "@shared/editor/rules/mark";
import noticesRule from "@shared/editor/rules/notices";
import tablesRule from "@shared/editor/rules/tables";
import underlinesRule from "@shared/editor/rules/underlines";

const defaultRules = [
  embedsRule([]),
  breakRule,
  checkboxRule,
  markRule({ delim: "==", mark: "highlight" }),
  markRule({ delim: "!!", mark: "placeholder" }),
  underlinesRule,
  tablesRule,
  noticesRule,
  attachmentsRule,
  emojiRule,
];

export default function renderToHtml(
  markdown: string,
  rulePlugins: PluginSimple[] = defaultRules
): string {
  return createMarkdown({ plugins: rulePlugins }).render(markdown).trim();
}
