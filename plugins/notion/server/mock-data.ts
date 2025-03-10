import { ProsemirrorDoc } from "@shared/types";
import sample from "lodash/sample";

const pageWithoutLinks: ProsemirrorDoc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: {
        level: 1,
      },
      content: [
        {
          text: "Heading 1",
          type: "text",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          text: "Anim ut adipisicing duis pariatur consectetur nisi.",
          type: "text",
        },
      ],
    },
    {
      type: "paragraph",
    },
    {
      type: "paragraph",
      content: [
        {
          text: "Minim quis ipsum ut reprehenderit reprehenderit incididunt mollit voluptate ipsum dolor qui ut aliquip. Dolore commodo amet non Lorem mollit labore ullamco laborum. Officia adipisicing duis culpa labore Lorem consequat velit sit.",
          type: "text",
        },
      ],
    },
  ],
};

const pageWithDocLink: ProsemirrorDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
    {
      type: "paragraph",
      content: [
        {
          text: "Minim quis ipsum ut reprehenderit reprehenderit incididunt mollit voluptate ipsum dolor qui ut aliquip. Dolore commodo amet non Lorem mollit labore ullamco laborum. Officia adipisicing duis culpa labore Lorem consequat velit sit.",
          type: "text",
        },
      ],
    },
    {
      type: "paragraph",
    },
    {
      type: "paragraph",
      content: [
        {
          type: "mention",
          attrs: {
            id: "",
            type: "document",
            label: "",
            actorId: "",
            modelId: "<external-61a8ef00-8954-45f3-adcc-dbea309d43ec>",
          },
        },
        {
          text: " ",
          type: "text",
        },
      ],
    },
  ],
};

const pages = [pageWithoutLinks, pageWithDocLink];

export const getPageData = () => sample(pages)!;
