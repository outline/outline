import { useMemo } from "react";
import type { NavigationNode } from "@shared/types";
import { NavigationNodeType } from "@shared/types";
import { sortNavigationNodes } from "@shared/utils/notebooks";
import type Notebook from "~/models/Notebook";
import useStores from "~/hooks/useStores";
/**
 * React hook that modifies the document structure
 * of all notebooks present in store. Adds extra attributes
 * like type, depth and parent to each of the nodes in document
 * structure.
 *
 * @return {NavigationNode[]} notebookTrees root notebook nodes of modified trees
 */
export default function useNotebookTrees(): NavigationNode[] {
  const { notebooks } = useStores();
  const getNotebookTree = (notebook: Notebook): NavigationNode => {
    const addType = (node: NavigationNode): NavigationNode => {
      if (node.children.length > 0) {
        node.children = node.children.map(addType);
      }
      node.type = node.type ? node.type : NavigationNodeType.Note;
      return node;
    };
    const addParent = (
      node: NavigationNode,
      parent: NavigationNode | null = null
    ): NavigationNode => {
      if (node.children.length > 0) {
        node.children = node.children.map((child) => addParent(child, node));
      }
      node.parent = parent;
      return node;
    };
    const addDepth = (node: NavigationNode, depth = 0): NavigationNode => {
      if (node.children.length > 0) {
        node.children = node.children.map((child) =>
          addDepth(child, depth + 1)
        );
      }
      node.depth = depth;
      return node;
    };
    const addNotebookId = (
      node: NavigationNode,
      notebookId = notebook.id
    ): NavigationNode => {
      if (node.children.length > 0) {
        node.children = node.children.map((child) =>
          addNotebookId(child, notebookId)
        );
      }
      node.notebookId = notebookId;
      return node;
    };
    const notebookNode: NavigationNode = {
      id: notebook.id,
      title: notebook.name,
      url: notebook.path,
      type: NavigationNodeType.Notebook,
      children: notebook.notes
        ? sortNavigationNodes(notebook.notes, notebook.sort, true)
        : [],
      parent: null,
    };
    return addParent(addNotebookId(addDepth(addType(notebookNode), 1)));
  };
  const key = notebooks.orderedData.map((o) => o.notes?.length).join("-");
  const notebookTrees = useMemo(
    () => notebooks.orderedData.map(getNotebookTree),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [notebooks.orderedData, key]
  );
  return notebookTrees;
}
