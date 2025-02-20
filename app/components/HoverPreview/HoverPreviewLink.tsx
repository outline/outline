import * as React from "react";
import Flex from "~/components/Flex";
import {
  Preview,
  Title,
  Description,
  Card,
  CardContent,
  Thumbnail,
} from "./Components";

type Props = {
  /** Link url */
  url: string;
  /** Title for the preview card */
  title: string;
  /** Url for thumbnail served by the link provider */
  thumbnailUrl: string;
  /** Some description about the link provider */
  description: string;
};

const HoverPreviewLink = React.forwardRef(function _HoverPreviewLink(
  { url, thumbnailUrl, title, description }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  return (
    <Preview as="a" href={url} target="_blank" rel="noopener noreferrer">
      <Flex column ref={ref}>
        {thumbnailUrl ? <Thumbnail src={thumbnailUrl} alt="" /> : null}
        <Card>
          <CardContent>
            <Flex column>
              <Title>{title}</Title>
              <Description>{description}</Description>
            </Flex>
          </CardContent>
        </Card>
      </Flex>
    </Preview>
  );
});

export default HoverPreviewLink;
