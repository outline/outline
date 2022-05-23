import Extension from "../lib/Extension";
import Bold from "../marks/Bold";
import Code from "../marks/Code";
import Italic from "../marks/Italic";
import Link from "../marks/Link";
import Mark from "../marks/Mark";
import Strikethrough from "../marks/Strikethrough";
import Underline from "../marks/Underline";
import Doc from "../nodes/Doc";
import Emoji from "../nodes/Emoji";
import HardBreak from "../nodes/HardBreak";
import Image from "../nodes/Image";
import Node from "../nodes/Node";
import Paragraph from "../nodes/Paragraph";
import Text from "../nodes/Text";
import ClipboardTextSerializer from "../plugins/ClipboardTextSerializer";
import DateTime from "../plugins/DateTime";
import History from "../plugins/History";
import MaxLength from "../plugins/MaxLength";
import PasteHandler from "../plugins/PasteHandler";
import Placeholder from "../plugins/Placeholder";
import SmartText from "../plugins/SmartText";
import TrailingNode from "../plugins/TrailingNode";

const basicPackage: (typeof Node | typeof Mark | typeof Extension)[] = [
  Doc,
  HardBreak,
  Paragraph,
  Emoji,
  Text,
  Image,
  Bold,
  Code,
  Italic,
  Underline,
  Link,
  Strikethrough,
  History,
  SmartText,
  TrailingNode,
  PasteHandler,
  Placeholder,
  MaxLength,
  DateTime,
  ClipboardTextSerializer,
];

export default basicPackage;
