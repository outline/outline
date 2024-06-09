import {
  TrashIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignCenterIcon,
  InsertLeftIcon,
  InsertRightIcon,
  ArrowIcon,
  MoreIcon,
  TableHeaderColumnIcon,
} from "outline-icons";
import { EditorState } from "prosemirror-state";
import * as React from "react";
import styled from "styled-components";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";

export default function tableColMenuItems(
  state: EditorState,
  index: number,
  rtl: boolean,
  dictionary: Dictionary
): MenuItem[] {
  const { schema } = state;

  return [
    {
      name: "setColumnAttr",
      tooltip: dictionary.alignLeft,
      icon: <AlignLeftIcon />,
      attrs: { index, alignment: "left" },
      active: isNodeActive(schema.nodes.th, {
        colspan: 1,
        rowspan: 1,
        alignment: "left",
      }),
    },
    {
      name: "setColumnAttr",
      tooltip: dictionary.alignCenter,
      icon: <AlignCenterIcon />,
      attrs: { index, alignment: "center" },
      active: isNodeActive(schema.nodes.th, {
        colspan: 1,
        rowspan: 1,
        alignment: "center",
      }),
    },
    {
      name: "setColumnAttr",
      tooltip: dictionary.alignRight,
      icon: <AlignRightIcon />,
      attrs: { index, alignment: "right" },
      active: isNodeActive(schema.nodes.th, {
        colspan: 1,
        rowspan: 1,
        alignment: "right",
      }),
    },
    {
      name: "separator",
    },
    {
      name: "sortTable",
      tooltip: dictionary.sortAsc,
      attrs: { index, direction: "asc" },
      icon: <SortAscIcon />,
    },
    {
      name: "sortTable",
      tooltip: dictionary.sortDesc,
      attrs: { index, direction: "desc" },
      icon: <SortDescIcon />,
    },
    {
      name: "separator",
    },
    {
      icon: <MoreIcon />,
      children: [
        {
          name: "toggleHeaderColumn",
          label: dictionary.toggleHeader,
          icon: <TableHeaderColumnIcon />,
          visible: index === 0,
        },
        {
          name: rtl ? "addColumnAfter" : "addColumnBefore",
          label: rtl ? dictionary.addColumnAfter : dictionary.addColumnBefore,
          icon: <InsertLeftIcon />,
          attrs: { index },
        },
        {
          name: rtl ? "addColumnBefore" : "addColumnAfter",
          label: rtl ? dictionary.addColumnBefore : dictionary.addColumnAfter,
          icon: <InsertRightIcon />,
          attrs: { index },
        },
        {
          name: "deleteColumn",
          dangerous: true,
          label: dictionary.deleteColumn,
          icon: <TrashIcon />,
        },
      ],
    },
  ];
}

const SortAscIcon = styled(ArrowIcon)`
  transform: rotate(-90deg);
`;

const SortDescIcon = styled(ArrowIcon)`
  transform: rotate(90deg);
`;
