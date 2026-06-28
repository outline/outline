import { StarredIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { UrlHelper } from "@shared/utils/UrlHelper";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import env from "~/env";
import { EnterpriseBadge } from "~/scenes/Settings/components/EnterpriseBadge";
import { UpsellSettingRow } from "~/scenes/Settings/components/UpsellSettingRow";

/** A single Enterprise-only setting to preview within an upsell page. */
export type UpsellFeature = {
  /** A unique name used to associate the row's label. */
  name: string;
  /** The label of the setting. */
  label: React.ReactNode;
  /** An optional description of what the setting does. */
  description?: React.ReactNode;
  /** The kind of locked control to preview (default: "switch"). */
  control?: "switch" | "none";
};

type Props = {
  /** The title of the settings page. */
  title: string;
  /** The icon displayed alongside the title. */
  icon: React.ReactNode;
  /** A short description of the feature being advertised. */
  description: React.ReactNode;
  /** A preview of the Enterprise-only settings unlocked by this feature. */
  features?: UpsellFeature[];
};

/**
 * A placeholder settings page that advertises an Enterprise-only feature. It
 * renders the same chrome as a real settings page, a short pitch, a call to
 * action to upgrade, and an optional preview of the locked settings.
 *
 * @param props - The component props.
 * @returns The rendered upsell scene.
 */
export function UpsellScene({ title, icon, description, features }: Props) {
  const { t } = useTranslation();
  const appName = env.APP_NAME;

  return (
    <Scene
      title={
        <>
          {title} <EnterpriseBadge />
        </>
      }
      textTitle={title}
      icon={icon}
    >
      <Heading>
        {title} <EnterpriseBadge />
      </Heading>
      <Text as="p" type="secondary">
        {description}
      </Text>

      <Callout column gap={12}>
        <Flex align="center" gap={8}>
          <StarredIcon />
          <Text as="span" weight="bold">
            {t("Available in the Enterprise edition")}
          </Text>
        </Flex>
        <Text as="p" type="secondary">
          <Trans>
            This feature is part of the Enterprise edition of {{ appName }}.
            Upgrade your workspace to unlock it for your team.
          </Trans>
        </Text>
        <Flex gap={8}>
          <Button
            as="a"
            href={UrlHelper.pricing}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("View plans")}
          </Button>
          <Button
            as="a"
            href={UrlHelper.contact}
            target="_blank"
            rel="noopener noreferrer"
            neutral
          >
            {t("Contact sales")}
          </Button>
        </Flex>
      </Callout>

      {features && features.length > 0 && (
        <>
          {features.map((feature, index) => (
            <UpsellSettingRow
              key={feature.name}
              name={feature.name}
              label={feature.label}
              description={feature.description}
              control={feature.control}
              border={index !== features.length - 1}
            />
          ))}
        </>
      )}
    </Scene>
  );
}

const Callout = styled(Flex)`
  margin: 1em 0 1.5em;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid ${s("divider")};
  background: ${s("backgroundSecondary")};
`;
