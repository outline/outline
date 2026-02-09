/**
 * Class names and values used by the editor.
 */
export class EditorStyleHelper {
  // Blocks

  static readonly blockRadius = "6px";

  // Images

  static readonly imageHandle = "image-handle";

  static readonly imageCaption = "caption";

  static readonly imagePositionAnchor = "image-position-anchor";

  // Headings

  static readonly headingPositionAnchor = "heading-position-anchor";

  // Comments

  static readonly comment = "comment-marker";

  // Code

  static readonly codeWord = "code-word";

  // Diffs

  static readonly diffInsertion = "diff-insertion";

  static readonly diffDeletion = "diff-deletion";

  static readonly diffNodeInsertion = "diff-node-insertion";

  static readonly diffNodeDeletion = "diff-node-deletion";

  static readonly diffModification = "diff-modification";

  static readonly diffNodeModification = "diff-node-modification";

  static readonly diffCurrentChange = "current-diff";

  // Toggle blocks

  /** Toggle block wrapper */
  static readonly toggleBlock = "toggle-block";

  /** Toggle block button */
  static readonly toggleBlockButton = "toggle-block-button";

  /** Toggle block content area */
  static readonly toggleBlockContent = "toggle-block-content";

  /** Toggle block head (first child) */
  static readonly toggleBlockHead = "toggle-block-head";

  /** Toggle block folded state */
  static readonly toggleBlockFolded = "folded";

  // Checkbox Lists

  /** Checkbox list wrapper */
  static readonly checklistWrapper = "checklist-wrapper";

  /** Toggle button for showing/hiding completed items */
  static readonly checklistCompletedToggle = "checklist-completed-toggle";

  /** State when completed items are hidden */
  static readonly checklistCompletedHidden = "completed-hidden";

  // Tables

  /** Table wrapper */
  static readonly table = "table-wrapper";

  /** Table grip (circle in top left) */
  static readonly tableGrip = "table-grip";

  /** Table row grip */
  static readonly tableGripRow = "table-grip-row";

  /** Table column grip */
  static readonly tableGripColumn = "table-grip-column";

  /** "Plus" to add column on tables */
  static readonly tableAddColumn = "table-add-column";

  /** "Plus" to add row on tables */
  static readonly tableAddRow = "table-add-row";

  /** Scrollable area of table */
  static readonly tableScrollable = "table-scrollable";

  /** Full-width table layout */
  static readonly tableFullWidth = "table-full-width";

  /** Shadow on the right side of the table */
  static readonly tableShadowRight = "table-shadow-right";

  /** Shadow on the left side of the table */
  static readonly tableShadowLeft = "table-shadow-left";

  /** Sticky header state */
  static readonly tableStickyHeader = "table-sticky-header";

  /** Drop indicator for table drag and drop */
  static readonly tableDragDropIndicator = "table-drag-drop-indicator";

  /** Class added to body when dragging table rows/columns */
  static readonly tableDragging = "table-dragging";

  /** Drag indicator on left side of cell */
  static readonly tableDragIndicatorLeft = "table-drag-indicator-left";

  /** Drag indicator on right side of cell */
  static readonly tableDragIndicatorRight = "table-drag-indicator-right";

  /** Drag indicator on top side of cell */
  static readonly tableDragIndicatorTop = "table-drag-indicator-top";

  /** Drag indicator on bottom side of cell */
  static readonly tableDragIndicatorBottom = "table-drag-indicator-bottom";

  // Global

  /** Minimum padding around editor */
  static readonly padding = 32;

  /** Table of contents width */
  static readonly tocWidth = 256;

  /** Width of the document content area */
  static readonly documentWidth = "52em";

  /** Gutter width for the document (for decorations, etc) */
  static readonly documentGutter = "88px";
}
