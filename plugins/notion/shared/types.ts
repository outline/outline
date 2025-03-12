import {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

export enum PageType {
  Page = "page",
  Database = "database",
}

export type Page = {
  id: string;
  name: string;
  emoji?: string;
};

export type PageTitle = {
  type: "title";
  title: Array<RichTextItemResponse>;
};

// Transformed block structure with "children".
export type Block<T = BlockObjectResponse> = T & {
  children?: Block[];
};
