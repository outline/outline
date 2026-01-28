import DateTime from "../extensions/DateTime";
import DeleteNearAtom from "../extensions/DeleteNearAtom";
import History from "../extensions/History";
import MaxLength from "../extensions/MaxLength";
import TrailingNode from "../extensions/TrailingNode";
import type Extension from "../lib/Extension";
import Bold from "../marks/Bold";
import Code from "../marks/Code";
import Comment from "../marks/Comment";
import Highlight from "../marks/Highlight";
import Italic from "../marks/Italic";
import Link from "../marks/Link";
import type Mark from "../marks/Mark";
import TemplatePlaceholder from "../marks/Placeholder";
import Strikethrough from "../marks/Strikethrough";
import Underline from "../marks/Underline";
import Attachment from "./Attachment";
import Blockquote from "./Blockquote";
import BulletList from "./BulletList";
import CheckboxItem from "./CheckboxItem";
import CheckboxList from "./CheckboxList";
import CodeBlock from "./CodeBlock";
import CodeFence from "./CodeFence";
import Doc from "./Doc";
import Embed from "./Embed";
import Emoji from "./Emoji";
import HardBreak from "./HardBreak";
import Heading from "./Heading";
import HorizontalRule from "./HorizontalRule";
import Image from "./Image";
import ListItem from "./ListItem";
import Math from "./Math";
import MathBlock from "./MathBlock";
import Mention from "./Mention";
import type Node from "./Node";
import Notice from "./Notice";
import OrderedList from "./OrderedList";
import Paragraph from "./Paragraph";
import SimpleImage from "./SimpleImage";
import Table from "./Table";
import TableCell from "./TableCell";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import Text from "./Text";
import ToggleBlock from "./ToggleBlock";

import Video from "./Video";

type Nodes = (typeof Node | typeof Mark | typeof Extension)[];

/**
 * A set of inline nodes that are used in the editor. This is used for simple
 * editors that need basic formatting.
 */
export const inlineExtensions: Nodes = [
  Doc,
  Paragraph,
  Emoji,
  Text,
  SimpleImage,
  Code,
  Bold,
  Italic,
  Underline,
  Link,
  Strikethrough,
  History,
  TrailingNode,
  MaxLength,
  DateTime,
  HardBreak,
  DeleteNearAtom,
];

export const listExtensions: Nodes = [
  CheckboxList,
  CheckboxItem,
  BulletList,
  OrderedList,
  ListItem,
];

export const tableExtensions: Nodes = [
  TableCell,
  TableHeader,
  TableRow,
  // Note: Table nodes comes last to ensure the table selection plugin is registered after the
  // plugins for table grips in TableCell and TableHeader.
  Table,
];

/**
 * The basic set of nodes that are used in the editor. This is used for simple
 * editors that need basic formatting and lists.
 */
export const basicExtensions: Nodes = [...inlineExtensions, ...listExtensions];

/**
 * The full set of nodes that are used in the editor. This is used for rich
 * editors that need advanced formatting.
 */
export const richExtensions: Nodes = [
  ...inlineExtensions.filter((n) => n !== SimpleImage),
  Image,
  CodeBlock,
  CodeFence,
  Blockquote,
  Embed,
  Attachment,
  Video,
  Notice,
  Heading,
  HorizontalRule,
  Highlight,
  TemplatePlaceholder,
  Math,
  MathBlock,
  Mention,
  ToggleBlock,
  // Container type nodes should be last so that key handlers are registered for content inside
  // the container nodes first.
  ...listExtensions,
  ...tableExtensions,
];

/**
 * Add commenting and mentions to a set of nodes
 */
export const withComments = (nodes: Nodes) => [
  ...nodes.filter((node) => node !== Mention),
  Mention,
  Comment,
];
