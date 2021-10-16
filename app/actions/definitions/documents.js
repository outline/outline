// @flow
import { DocumentIcon } from "outline-icons";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { type Action } from "types";
import history from "utils/history";

export const openDocument: Action = {
  id: uuidv4(),
  name: ({ t }) => t("Open document"),
  section: ({ t }) => t("Documents"),
  shortcut: ["o", "d"],
  icon: <DocumentIcon />,
  children: ({ stores }) => {
    const paths = stores.collections.pathsToDocuments;

    return paths
      .filter((path) => path.type === "document")
      .map((path) => ({
        id: path.id,
        name: path.title,
        section: ({ t }) => t("Documents"),
        perform: () => history.push(path.url),
      }));
  },
};

export const rootDocumentActions = [openDocument];
