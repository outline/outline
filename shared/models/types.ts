import { Primitive } from "utility-types";

export enum DataAttributeDataType {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  List = "list",
}

export type DocumentDataAttribute = {
  dataAttributeId: string;
  value: Primitive;
  updatedAt: string;
};

export type DataAttributeOptions = {
  /** An icon to display next to the attribute. */
  icon?: string;
  /** Valid options for list data type. */
  options?: {
    value: string;
    color?: string;
  }[];
};
