import { Node } from "prosemirror-model";

export type Task = {
  text: string;
  completed: boolean;
};

/**
 * Iterates through the document to find all of the tasks and their completion
 * state.
 *
 * @param doc Prosemirror document node
 * @returns Array<Task>
 */
export default function getTasks(doc: Node): Task[] {
  const tasks: Task[] = [];

  doc.descendants((node) => {
    if (!node.isBlock) {
      return false;
    }

    if (node.type.name === "checkbox_list") {
      node.content.forEach((listItem) => {
        let text = "";

        listItem.forEach((contentNode) => {
          if (contentNode.type.name === "paragraph") {
            text += contentNode.textContent;
          }
        });

        tasks.push({
          text,
          completed: listItem.attrs.checked,
        });
      });
    }

    return true;
  });

  return tasks;
}
