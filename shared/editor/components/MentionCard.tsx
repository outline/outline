import * as React from "react";
import styled from "styled-components";
import { Backticks } from "../../components/Backticks";
import Flex from "../../components/Flex";
import type {
  JSONValue,
  UnfurlResourceType,
  UnfurlResponse,
} from "../../types";
import { sanitizeImageSrc, toDisplayUrl } from "../../utils/urls";

type LinkCardProps = Record<string, JSONValue> & {
  /** Class names from the mention node. */
  className: string;
  /** The URL of the link. */
  url?: string;
  /** The unfurled data for the link. */
  unfurl: Partial<UnfurlResponse[UnfurlResourceType.URL]>;
};

/**
 * A preview card for a link, showing its image, title and description.
 *
 * @param props the attributes of the mention and the unfurled link data.
 * @returns the card element.
 */
export const LinkCard = ({
  className,
  url,
  unfurl,
  ...attrs
}: LinkCardProps) => (
  <a
    {...attrs}
    className={className}
    href={url}
    target="_blank"
    rel="noopener noreferrer nofollow"
    contentEditable={false}
  >
    <MentionCard
      title={unfurl.title || (url ? toDisplayUrl(url) : "")}
      description={unfurl.description}
      thumbnailUrl={unfurl.thumbnailUrl}
      source={
        <>
          {unfurl.faviconUrl ? (
            <Favicon src={sanitizeImageSrc(unfurl.faviconUrl)} alt="" />
          ) : null}
          {url ? <SourceText>{toDisplayUrl(url)}</SourceText> : null}
        </>
      }
    />
  </a>
);

interface MentionCardProps {
  /** An icon shown before the title. */
  icon?: React.ReactNode;
  /** The title of the card. */
  title: string;
  /** Secondary text shown after the title, on the same line. */
  titleSuffix?: React.ReactNode;
  /** A short plain text description. */
  description?: string;
  /** Content shown below the description, such as the source of the link. */
  source?: React.ReactNode;
  /** An image shown at the side of the card. */
  thumbnailUrl?: string;
}

/**
 * The content of a mention that is displayed as a card. The caller renders the
 * outer link element.
 *
 * @param props the content of the card.
 * @returns the card content.
 */
export const MentionCard = ({
  icon,
  title,
  titleSuffix,
  description,
  source,
  thumbnailUrl,
}: MentionCardProps) => {
  const imageSrc = thumbnailUrl ? sanitizeImageSrc(thumbnailUrl) : undefined;

  return (
    <>
      <Content>
        <Title align="center" gap={2}>
          {icon}
          <TitleText>
            <Backticks content={title} />
            {titleSuffix ? (
              <>
                {" "}
                <TitleSuffix>{titleSuffix}</TitleSuffix>
              </>
            ) : null}
          </TitleText>
        </Title>
        {description ? <Description>{description}</Description> : null}
        {source ? (
          <Source align="center" gap={6}>
            {source}
          </Source>
        ) : null}
      </Content>
      {imageSrc ? <Thumbnail key={imageSrc} src={imageSrc} /> : null}
    </>
  );
};

/**
 * The image of a card. It is hidden until it loads and removed if it fails, as
 * the viewer may not have access to it.
 */
const Thumbnail = ({ src }: { src: string }) => {
  const [status, setStatus] = React.useState<"loading" | "loaded" | "failed">(
    "loading"
  );

  if (status === "failed") {
    return null;
  }

  return (
    <ImageFrame $loaded={status === "loaded"}>
      <Image
        src={src}
        alt=""
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
      />
    </ImageFrame>
  );
};

const Favicon = styled.img`
  width: 16px;
  height: 16px;
`;

const Content = styled.span`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
`;

const Title = styled(Flex)`
  min-width: 0;
  font-weight: 500;
  color: ${(props) => props.theme.text};
`;

const TitleText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TitleSuffix = styled.span`
  font-weight: normal;
  color: ${(props) => props.theme.textTertiary};
`;

const Description = styled.span`
  font-weight: normal;
  font-size: 14px;
  color: ${(props) => props.theme.textSecondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
`;

const Source = styled(Flex)`
  margin-top: 2px;
  min-width: 0;
`;

const SourceText = styled.span`
  font-weight: normal;
  font-size: 13px;
  color: ${(props) => props.theme.textTertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// The frame takes the height of the card, so the image does not change it.
const ImageFrame = styled.span<{ $loaded: boolean }>`
  display: ${(props) => (props.$loaded ? "block" : "none")};
  position: relative;
  flex-shrink: 0;
  width: 30%;
  max-width: 200px;
  border-left: 1px solid ${(props) => props.theme.divider};
`;

const Image = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
