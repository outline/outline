import { Schema } from "prosemirror-model";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";

// marks
import Bold from "@shared/editor/marks/Bold";
import Code from "@shared/editor/marks/Code";
import Highlight from "@shared/editor/marks/Highlight";
import Italic from "@shared/editor/marks/Italic";
import Link from "@shared/editor/marks/Link";
import TemplatePlaceholder from "@shared/editor/marks/Placeholder";
import Strikethrough from "@shared/editor/marks/Strikethrough";
import Underline from "@shared/editor/marks/Underline";

// nodes
import Attachment from "@shared/editor/nodes/Attachment";
import Blockquote from "@shared/editor/nodes/Blockquote";
import BulletList from "@shared/editor/nodes/BulletList";
import CheckboxItem from "@shared/editor/nodes/CheckboxItem";
import CheckboxList from "@shared/editor/nodes/CheckboxList";
import CodeBlock from "@shared/editor/nodes/CodeBlock";
import CodeFence from "@shared/editor/nodes/CodeFence";
import Doc from "@shared/editor/nodes/Doc";
import Embed from "@shared/editor/nodes/Embed";
import Emoji from "@shared/editor/nodes/Emoji";
import HardBreak from "@shared/editor/nodes/HardBreak";
import Heading from "@shared/editor/nodes/Heading";
import HorizontalRule from "@shared/editor/nodes/HorizontalRule";
import Image from "@shared/editor/nodes/Image";
import ListItem from "@shared/editor/nodes/ListItem";
import Notice from "@shared/editor/nodes/Notice";
import OrderedList from "@shared/editor/nodes/OrderedList";
import Paragraph from "@shared/editor/nodes/Paragraph";
import Table from "@shared/editor/nodes/Table";
import TableCell from "@shared/editor/nodes/TableCell";
import TableHeadCell from "@shared/editor/nodes/TableHeadCell";
import TableRow from "@shared/editor/nodes/TableRow";
import Text from "@shared/editor/nodes/Text";
import render from "./renderToHtml";

const extensions = new ExtensionManager([
  new Doc(),
  new Text(),
  new HardBreak(),
  new Paragraph(),
  new Blockquote(),
  new Emoji(),
  new BulletList(),
  new CodeBlock(),
  new CodeFence(),
  new CheckboxList(),
  new CheckboxItem(),
  new Embed(),
  new ListItem(),
  new Notice(),
  new Attachment(),
  new Heading(),
  new HorizontalRule(),
  new Image(),
  new Table(),
  new TableCell(),
  new TableHeadCell(),
  new TableRow(),
  new Bold(),
  new Code(),
  new Highlight(),
  new Italic(),
  new Link(),
  new Strikethrough(),
  new TemplatePlaceholder(),
  new Underline(),
  new OrderedList(),
]);

export const schema = new Schema({
  nodes: extensions.nodes,
  marks: extensions.marks,
});

export const parser = extensions.parser({
  schema,
  plugins: extensions.rulePlugins,
});

export const serializer = extensions.serializer();

export const renderToHtml = (markdown: string): string =>
  render(markdown, extensions.rulePlugins);
