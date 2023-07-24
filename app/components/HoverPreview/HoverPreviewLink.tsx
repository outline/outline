import * as React from "react";
import Img from "@shared/editor/components/Img";
import Flex from "~/components/Flex";
import { Preview, Title, Description } from "./Components";

type Props = {
  /** Link url */
  url: string;
  /** Title for the preview card */
  title: string;
  /** Url for thumbnail served by the link provider*/
  thumbnailUrl: string;
  /** Some description about the link provider */
  description: string;
};

function HoverPreviewLink({ url, thumbnailUrl, title, description }: Props) {
  return (
    <Preview to={url}>
      <Flex gap={12} column>
        <Img src={thumbnailUrl} alt={""} />
        <Flex column>
          <Title>{title}</Title>
          <Description>{description}</Description>
        </Flex>
      </Flex>
    </Preview>
  );
}

export default HoverPreviewLink;
