import Extension from "../lib/Extension";
import Highlight from "../marks/Highlight";
import Mark from "../marks/Mark";
import TemplatePlaceholder from "../marks/Placeholder";
import Attachment from "../nodes/Attachment";
import Blockquote from "../nodes/Blockquote";
import BulletList from "../nodes/BulletList";
import CheckboxItem from "../nodes/CheckboxItem";
import CheckboxList from "../nodes/CheckboxList";
import CodeBlock from "../nodes/CodeBlock";
import CodeFence from "../nodes/CodeFence";
import Embed from "../nodes/Embed";
import Heading from "../nodes/Heading";
import HorizontalRule from "../nodes/HorizontalRule";
import ListItem from "../nodes/ListItem";
import Math from "../nodes/Math";
import MathBlock from "../nodes/MathBlock";
import Node from "../nodes/Node";
import Notice from "../nodes/Notice";
import OrderedList from "../nodes/OrderedList";
import Table from "../nodes/Table";
import TableCell from "../nodes/TableCell";
import TableHeadCell from "../nodes/TableHeadCell";
import TableRow from "../nodes/TableRow";
import BlockMenuTrigger from "../plugins/BlockMenuTrigger";
import Folding from "../plugins/Folding";
import basicPackage from "./basic";

const fullPackage: (typeof Node | typeof Mark | typeof Extension)[] = [
  ...basicPackage,
  CodeBlock,
  CodeFence,
  CheckboxList,
  CheckboxItem,
  Blockquote,
  BulletList,
  OrderedList,
  Embed,
  ListItem,
  Attachment,
  Notice,
  Heading,
  HorizontalRule,
  Table,
  TableCell,
  TableHeadCell,
  TableRow,
  Highlight,
  TemplatePlaceholder,
  Folding,
  BlockMenuTrigger,
  Math,
  MathBlock,
];

export default fullPackage;
