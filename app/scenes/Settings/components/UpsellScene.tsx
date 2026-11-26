import { StarredIcon } from "outline-icons";
import type * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Plan } from "@shared/types";
import type { PlanFeature } from "@shared/types";
import { s } from "@shared/styles";
import { breakpoint } from "@shared/styles/breakpoint";
import { PlanHelper } from "@shared/utils/PlanHelper";
import { UrlHelper } from "@shared/utils/UrlHelper";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import isCloudHosted from "~/utils/isCloudHosted";
import { usePlanName } from "~/hooks/usePlanName";

interface Props {
  /** The title of the settings page. */
  title: string;
  /** The icon displayed alongside the title. */
  icon: React.ReactNode;
  /** A short description of the feature being advertised. */
  description?: React.ReactNode;
  /** The plan feature that unlocks this page. */
  feature: PlanFeature;
}

/**
 * A placeholder settings page that advertises a feature from a higher plan. It
 * renders the same chrome as a real settings page, a short pitch, and a call
 * to action to upgrade.
 *
 * @param props - the component props.
 * @returns the rendered upsell scene.
 */
export function UpsellScene({ title, icon, description, feature }: Props) {
  const { t } = useTranslation();
  const plan = PlanHelper.getMinimumPlan(feature) ?? Plan.Enterprise;
  const planName = usePlanName(plan);

  return (
    <Scene title={title} textTitle={title} icon={icon}>
      <Title>{title}</Title>
      {description && (
        <Text as="p" type="secondary">
          {description}
        </Text>
      )}

      <Callout align="center" gap={12}>
        <StarredIcon />
        <CalloutText column gap={4} auto>
          <Text as="span" weight="bold">
            {t("Available on {{ planName }}", { planName })}
          </Text>
          <Text as="span" type="secondary">
            <Trans>
              This feature is included in {{ planName }} and above. Upgrade your
              workspace to unlock it for your team.
            </Trans>
          </Text>
        </CalloutText>
        {isCloudHosted ? (
          <Button as={Link} to="/settings/billing">
            {t("View plans")}
          </Button>
        ) : (
          <Button
            as="a"
            href={UrlHelper.pricing}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("View plans")}
          </Button>
        )}
      </Callout>
    </Scene>
  );
}

const Title = styled(Heading)`
  gap: 12px;
`;

const Callout = styled(Flex)`
  margin: 24px 0 8px;
  padding: 20px 24px 20px 20px;
  border-radius: 8px;
  border: 1px solid ${s("divider")};
  background: ${s("backgroundSecondary")};

  > svg {
    flex-shrink: 0;
    align-self: flex-start;
    color: ${s("accent")};
  }

  > a {
    flex-shrink: 0;
  }

  /* On small screens the button moves below the text, aligned with it. */
  ${breakpoint("mobile", "tablet")`
    flex-wrap: wrap;

    > a {
      margin-left: 36px;
    }
  `};
`;

const CalloutText = styled(Flex)`
  ${breakpoint("mobile", "tablet")`
    flex-basis: calc(100% - 36px);
  `};
`;
