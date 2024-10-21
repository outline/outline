// Based on https://www.npmjs.com/package/joplin-turndown-plugin-gfm
import type TurndownService from "turndown";
import { inHtmlContext } from "./utils";

const rules: Record<string, TurndownService.Rule> = {};
const alignMap = { left: ":---", right: "---:", center: ":---:" };

// Note use of WeakMap to enable garbage collection
const tableShouldBeSkippedCache = new WeakMap<HTMLTableElement, boolean>();

function getAlignment(node: HTMLElement) {
  return node
    ? ((
        node.getAttribute("align") ||
        node.style.textAlign ||
        ""
      ).toLowerCase() as "left" | "right" | "center")
    : "";
}

function getBorder(alignment: keyof typeof alignMap) {
  return alignment ? alignMap[alignment] : "---";
}

function getColumnAlignment(
  table: HTMLTableElement | null,
  columnIndex: number
) {
  const votes = {
    left: 0,
    right: 0,
    center: 0,
    "": 0,
  };

  let align: keyof typeof alignMap = "left";
  if (!table) {
    return align;
  }

  // Reference is important as .rows is an expensive getter.
  const rows = table.rows;

  for (let i = 0; i < rows.length; ++i) {
    const row = rows[i];
    if (columnIndex < row.childNodes.length) {
      const cellAlignment = getAlignment(
        row.childNodes[columnIndex] as HTMLElement
      );
      ++votes[cellAlignment];

      if (
        votes[cellAlignment] > votes[align] &&
        Object.keys(alignMap).includes(cellAlignment)
      ) {
        align = cellAlignment as keyof typeof alignMap;
      }
    }
  }

  return align;
}

rules.tableCell = {
  filter: ["th", "td"],
  replacement(content, node: HTMLTableCellElement) {
    if (tableShouldBeSkipped(nodeParentTable(node))) {
      return content;
    }
    return cell(content, node);
  },
};

rules.tableRow = {
  filter: "tr",
  replacement(content, node: HTMLTableRowElement) {
    const parentTable = nodeParentTable(node);
    if (tableShouldBeSkipped(parentTable)) {
      return content;
    }

    let borderCells = "";

    if (isHeadingRow(node)) {
      const colCount = tableColCount(parentTable);
      for (let i = 0; i < colCount; i++) {
        const childNode =
          i < node.childNodes.length ? node.childNodes[i] : null;
        const border = getBorder(getColumnAlignment(parentTable, i));
        borderCells += cell(border, childNode, i);
      }
    }
    return "\n" + content + (borderCells ? "\n" + borderCells : "");
  },
};

rules.table = {
  // Only convert tables that can result in valid Markdown
  // Other tables are kept as HTML using `keep` (see below).
  filter(node) {
    return node.nodeName === "TABLE" && !tableShouldBeHtml(node);
  },

  replacement(content, node: HTMLTableElement) {
    if (tableShouldBeSkipped(node)) {
      return content;
    }

    // Ensure there are no blank lines
    content = content.replace(/\n+/g, "\n");

    // If table has no heading, add an empty one so as to get a valid Markdown table
    const secondLineParts = content.trim().split("\n");
    let secondLine = "";
    if (secondLineParts.length >= 2) {
      secondLine = secondLineParts[1];
    }
    const secondLineIsDivider = /\| :?---/.test(secondLine);

    const columnCount = tableColCount(node);
    let emptyHeader = "";
    if (columnCount && !secondLineIsDivider) {
      emptyHeader = "|" + "     |".repeat(columnCount) + "\n" + "|";
      for (let columnIndex = 0; columnIndex < columnCount; ++columnIndex) {
        emptyHeader +=
          " " + getBorder(getColumnAlignment(node, columnIndex)) + " |";
      }
    }

    return "\n\n" + emptyHeader + content + "\n\n";
  },
};

rules.tableSection = {
  filter: ["thead", "tbody", "tfoot"],
  replacement(content) {
    return content;
  },
};

/**
 * A tr is a heading row if the parent is a THEAD or its the first child of the TABLE or the first
 * TBODY (possibly following a blank THEAD) and every cell is a TH.
 *
 * @param tr The tr node to check
 * @returns Whether the tr is a heading row
 */
function isHeadingRow(tr: Node) {
  const parentNode = tr.parentNode;
  if (!parentNode) {
    return false;
  }

  return (
    parentNode.nodeName === "THEAD" ||
    (parentNode.firstChild === tr &&
      (parentNode.nodeName === "TABLE" || isFirstTbody(parentNode)) &&
      Array.from(tr.childNodes).every((n) => n.nodeName === "TH"))
  );
}

function isFirstTbody(element: Node) {
  const previousSibling = element?.previousSibling;
  if (!previousSibling) {
    return false;
  }

  return (
    element.nodeName === "TBODY" &&
    (!previousSibling ||
      (previousSibling.nodeName === "THEAD" &&
        /^\s*$/i.test(previousSibling.textContent ?? "")))
  );
}

function cell(
  content: string,
  node: ChildNode | null = null,
  index: number | null = null
) {
  if (index === null && node) {
    index = Array.from(node?.parentNode?.childNodes ?? []).indexOf(node);
  }
  let prefix = " ";
  if (index === 0) {
    prefix = "| ";
  }
  let filteredContent = content
    .trim()
    .replace(/\n\r/g, "<br>")
    .replace(/\n/g, "<br>");
  filteredContent = filteredContent.replace(/\|+/g, "\\|");
  while (filteredContent.length < 3) {
    filteredContent += " ";
  }
  if (node) {
    filteredContent = handleColSpan(filteredContent, node, " ");
  }
  return prefix + filteredContent + " |";
}

function nodeContainsTable(node: Node) {
  if (!node?.childNodes) {
    return false;
  }

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeName === "TABLE") {
      return true;
    }
    if (nodeContainsTable(child)) {
      return true;
    }
  }
  return false;
}

const nodeContains = (node: HTMLElement, types: string | string[]) => {
  if (!node?.childNodes) {
    return false;
  }

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i] as HTMLElement;
    if (types === "code" && inHtmlContext(child, "CODE")) {
      return true;
    }
    if (types.includes(child.nodeName)) {
      return true;
    }
    if (nodeContains(child, types)) {
      return true;
    }
  }

  return false;
};

const tableShouldBeHtml = (tableNode: HTMLElement) =>
  nodeContains(tableNode, ["code", "table"]);

// Various conditions under which a table should be skipped - i.e. each cell
// will be rendered one after the other as if they were paragraphs.
function tableShouldBeSkipped(tableNode: HTMLTableElement | null) {
  if (!tableNode) {
    return true;
  }

  const cached = tableShouldBeSkippedCache.get(tableNode);
  if (cached !== undefined) {
    return cached;
  }

  const process = () => {
    if (!tableNode) {
      return true;
    }

    // Reference is important as .rows is an expensive getter.
    const rows = tableNode.rows;

    if (!rows) {
      return true;
    }
    if (rows.length === 1 && rows[0].childNodes.length <= 1) {
      return true;
    }
    if (nodeContainsTable(tableNode)) {
      return true;
    }
    return false;
  };

  const result = process();
  tableShouldBeSkippedCache.set(tableNode, result);
  return result;
}

function nodeParentTable(
  node: HTMLTableCellElement | HTMLTableRowElement
): HTMLTableElement | null {
  let parent = node.parentNode;
  if (!parent) {
    return null;
  }

  while (parent.nodeName !== "TABLE") {
    parent = parent.parentNode;
    if (!parent) {
      return null;
    }
  }

  return parent as HTMLTableElement;
}

function handleColSpan(content: string, node: ChildNode, emptyChar: string) {
  if (!node) {
    return content;
  }

  const colspan = Number((node as HTMLElement).getAttribute("colspan") || 1);
  for (let i = 1; i < colspan; i++) {
    content += " | " + emptyChar.repeat(3);
  }
  return content;
}

function tableColCount(node: HTMLTableElement | null) {
  if (!node) {
    return 0;
  }

  let maxColCount = 0;

  // Reference is important as .rows is an expensive getter.
  const rows = node.rows;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const colCount = row.childNodes.length;
    if (colCount > maxColCount) {
      maxColCount = colCount;
    }
  }
  return maxColCount;
}

export default function tables(turndownService: TurndownService) {
  turndownService.keep(function (node) {
    if (node.nodeName === "TABLE" && tableShouldBeHtml(node)) {
      return true;
    }
    return false;
  });

  for (const key in rules) {
    turndownService.addRule(key, rules[key]);
  }
}
