import type Extension from "@shared/editor/lib/Extension";
import type Mark from "@shared/editor/marks/Mark";
import type Node from "@shared/editor/nodes/Node";
import BlockMenuExtension from "~/editor/extensions/BlockMenu";
import ClipboardTextSerializer from "~/editor/extensions/ClipboardTextSerializer";
import DiagramsExtension from "@shared/editor/extensions/Diagrams";
import EmojiMenuExtension from "~/editor/extensions/EmojiMenu";
import FindAndReplaceExtension from "~/editor/extensions/FindAndReplace";
import HoverPreviewsExtension from "~/editor/extensions/HoverPreviews";
import Keys from "~/editor/extensions/Keys";
import MentionMenuExtension from "~/editor/extensions/MentionMenu";
import PasteHandler from "~/editor/extensions/PasteHandler";
import PreventTab from "~/editor/extensions/PreventTab";
import SelectionToolbarExtension from "~/editor/extensions/SelectionToolbar";
import SmartText from "~/editor/extensions/SmartText";

type Nodes = (typeof Node | typeof Mark | typeof Extension)[];

export const withUIExtensions = (nodes: Nodes) => [
  ...nodes,
  SmartText,
  PasteHandler,
  ClipboardTextSerializer,
  BlockMenuExtension,
  EmojiMenuExtension,
  MentionMenuExtension,
  FindAndReplaceExtension,
  HoverPreviewsExtension,
  SelectionToolbarExtension,
  DiagramsExtension,
  // Order these default key handlers last
  PreventTab,
  Keys,
];
