// @flow
import remark from "remark";
import strip from "strip-markdown";

const stripProcessor = remark().use(strip);

export default function removeMarkdown(markdown: string) {
  return stripProcessor.processSync(markdown).toString();
}
