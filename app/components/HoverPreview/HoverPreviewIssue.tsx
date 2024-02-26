import { t } from "i18next";
import * as React from "react";
import Flex from "~/components/Flex";
import Avatar from "../Avatar";
import Divider from "../Divider";
import Text from "../Text";
import {
  Preview,
  Title,
  Description,
  Card,
  CardContent,
  Label,
  LabelContainer,
  MetaInfoContainer,
  Status,
} from "./Components";

type Props = {
  /** Issue url */
  url: string;
  /** Issue title */
  title: string;
  /** Issue description */
  description: string;
  /** Author of the issue */
  author: { name: string; avatarUrl: string };
  /** Labels attached to the issue */
  labels: Array<{ name: string; color: string }>;
  /** Issue status */
  status: { name: string };
};

const HoverPreviewIssue = React.forwardRef(function _HoverPreviewIssue(
  { url, title, description, author, labels, status }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  return (
    <Preview as="a" href={url} target="_blank" rel="noopener noreferrer">
      <Flex column ref={ref}>
        <Card fadeOut={false}>
          <CardContent>
            <Flex column>
              <Title>{title}</Title>
              <Description>{description}</Description>
              <LabelContainer wrap>
                {labels.map((label, index) => (
                  <Label key={index} color={label.color}>
                    {label.name}
                  </Label>
                ))}
              </LabelContainer>
              <Divider />
              <MetaInfoContainer column gap={12}>
                <Flex gap={8}>
                  <Avatar src={author.avatarUrl} />
                  <Text type="secondary" size="xsmall" weight="bold">
                    {author.name}{" "}
                  </Text>
                  <Text type="secondary" size="xsmall" weight="bold">
                    {t("created this issue")}
                  </Text>
                </Flex>
                <Status type={status.name}>status: {status.name}</Status>
              </MetaInfoContainer>
            </Flex>
          </CardContent>
        </Card>
      </Flex>
    </Preview>
  );
});

export default HoverPreviewIssue;
