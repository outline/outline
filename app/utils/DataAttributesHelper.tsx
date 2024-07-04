import {
  CaseSensitiveIcon,
  DoneIcon,
  HashtagIcon,
  TableOfContentsIcon,
} from "outline-icons";
import * as React from "react";
import { DataAttributeDataType } from "@shared/models/types";
import DataAttribute from "~/models/DataAttribute";

export class DataAttributesHelper {
  public static getIcon(dataAttribute: DataAttribute) {
    switch (dataAttribute.dataType) {
      case DataAttributeDataType.Boolean:
        return <DoneIcon />;
      case DataAttributeDataType.Number:
        return <HashtagIcon />;
      case DataAttributeDataType.String:
        return <CaseSensitiveIcon />;
      case DataAttributeDataType.List:
        return <TableOfContentsIcon />;
      default:
        return null;
    }
  }
}
