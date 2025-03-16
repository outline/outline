import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export enum PageType {
  Page = "page",
  Database = "database",
}

export type Page = {
  type: PageType;
  id: string;
  name: string;
  emoji?: string;
};

// Transformed block structure with "children".
export type Block<T = BlockObjectResponse> = T & {
  children?: Block[];
};
