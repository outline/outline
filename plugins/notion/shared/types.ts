import { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

export type Page = {
  id: string;
  name: string;
  emoji?: string;
};

export type PageTitle = {
  type: "title";
  title: Array<RichTextItemResponse>;
};
