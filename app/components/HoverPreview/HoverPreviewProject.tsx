import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { Backticks } from "@shared/components/Backticks";
import Squircle from "@shared/components/Squircle";
import Editor from "~/components/Editor";
import type { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import Text from "../Text";
import Time from "../Time";
import {
  Preview,
  Title,
  Card,
  CardContent,
  Label,
  Description,
} from "./Components";
import { richExtensions } from "@shared/editor/nodes";

type Props = Pick<
  UnfurlResponse[UnfurlResourceType.Project],
  | "url"
  | "name"
  | "color"
  | "lead"
  | "labels"
  | "state"
  | "targetDate"
  | "description"
>;

const HoverPreviewProject = React.forwardRef(function HoverPreviewProject_(
  { url, name, color, lead, labels, state, description, targetDate }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  const { t } = useTranslation();

  return (
    <Preview as="a" href={url} target="_blank" rel="noopener noreferrer">
      <Flex column ref={ref}>
        <Card fadeOut={false}>
          <CardContent>
            <Flex gap={4} column>
              <Title>
                <StyledSquircle color={color} size={16} />
                <span>
                  <Backticks content={name} />
                </span>
              </Title>
              {description && (
                <Description as="div" $margin="0">
                  <React.Suspense fallback={<div />}>
                    <Editor
                      extensions={richExtensions}
                      defaultValue={description}
                      embedsDisabled
                      readOnly
                    />
                  </React.Suspense>
                </Description>
              )}
              <Text type="tertiary" size="small">
                {state.name}
              </Text>

              {(lead || targetDate) && (
                <>
                  <Divider />

                  {lead && (
                    <MetadataRow>
                      <MetadataLabel>{t("Lead")}</MetadataLabel>
                      <Flex align="center" gap={6}>
                        <Avatar src={lead.avatarUrl} size={AvatarSize.Toast} />
                        <Text size="small">{lead.name}</Text>
                      </Flex>
                    </MetadataRow>
                  )}

                  {targetDate && (
                    <MetadataRow>
                      <MetadataLabel>{t("Target date")}</MetadataLabel>
                      <Text size="small">
                        <Time dateTime={targetDate} addSuffix />
                      </Text>
                    </MetadataRow>
                  )}
                </>
              )}

              {labels.length > 0 && (
                <>
                  <Divider />
                  <MetadataRow>
                    <MetadataLabel>{t("Labels")}</MetadataLabel>
                    <Flex wrap gap={6}>
                      {labels.map((label, index) => (
                        <Label key={index} color={label.color}>
                          {label.name}
                        </Label>
                      ))}
                    </Flex>
                  </MetadataRow>
                </>
              )}
            </Flex>
          </CardContent>
        </Card>
      </Flex>
    </Preview>
  );
});

const StyledSquircle = styled(Squircle)`
  flex-shrink: 0;
  margin-top: 4px;
`;

const Divider = styled.div`
  height: 1px;
  background: ${s("divider")};
  margin: 4px 0;
`;

const MetadataRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 28px;
`;

const MetadataLabel = styled(Text).attrs({
  type: "tertiary",
  size: "small",
})`
  flex-shrink: 0;
  min-width: 80px;
`;

export default HoverPreviewProject;
