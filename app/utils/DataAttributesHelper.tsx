import { TFunction } from "i18next";
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
  public static getName(dataType: DataAttributeDataType, t: TFunction) {
    switch (dataType) {
      case DataAttributeDataType.Boolean:
        return t("True / False");
      case DataAttributeDataType.Number:
        return t("Number");
      case DataAttributeDataType.String:
        return t("Text");
      case DataAttributeDataType.List:
        return t("List");
      default:
        return "";
    }
  }

  /**
   * Returns an appropriate icon for the data attribute based on it's type
   *
   * @param dataAttribute The data attribute to get the icon for
   * @param props Additional props to pass to the icon
   * @returns An icon or null
   */
  public static getIcon(
    dataType: DataAttributeDataType,
    props?: React.ComponentProps<typeof DoneIcon>
  ) {
    switch (dataType) {
      case DataAttributeDataType.Boolean:
        return <DoneIcon {...props} />;
      case DataAttributeDataType.Number:
        return <HashtagIcon {...props} />;
      case DataAttributeDataType.String:
        return <CaseSensitiveIcon {...props} />;
      case DataAttributeDataType.List:
        return <TableOfContentsIcon {...props} />;
      default:
        return null;
    }
  }

  /**
   * Returns the regex to validate the input of the data attribute
   * @param dataAttribute
   * @returns A regex or null
   */
  public static getValidationRegex(dataAttribute: DataAttribute) {
    switch (dataAttribute.dataType) {
      case DataAttributeDataType.Number:
        return /^[0-9]+$/;
      default:
        return null;
    }
  }
}
