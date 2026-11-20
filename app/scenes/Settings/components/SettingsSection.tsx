import * as RadixCollapsible from "@radix-ui/react-collapsible";
import { ExpandedIcon } from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import { breakpoint } from "@shared/styles/breakpoint";
import { CollapsibleContent } from "~/components/Collapsible";
import Text from "~/components/Text";

interface Props {
  /** The section heading. */
  title: React.ReactNode;
  /** Optional text shown below the heading. */
  description?: React.ReactNode;
  /** An optional control shown on the right of the heading. */
  action?: React.ReactNode;
  /** Whether a click on the heading shows or hides the rows. */
  collapsible?: boolean;
  /** Whether a collapsible section is open on first render. Defaults to true. */
  defaultOpen?: boolean;
  /** Whether the section holds destructive actions. */
  danger?: boolean;
  /** The rows in the section, usually SettingRow components. */
  children: React.ReactNode;
}

/**
 * A titled group of setting rows on a settings screen.
 *
 * @param props the section props.
 * @returns the section element.
 */
export function SettingsSection({
  title,
  description,
  action,
  collapsible,
  defaultOpen = true,
  danger,
  children,
}: Props) {
  const titleId = React.useId();
  const descriptionNode = description && (
    <Description as="p" type="secondary">
      {description}
    </Description>
  );
  const rows = <Rows $danger={danger}>{children}</Rows>;

  if (!collapsible) {
    return (
      <Section aria-labelledby={titleId}>
        <Header>
          <HeaderText>
            <Title id={titleId}>{title}</Title>
            {descriptionNode}
          </HeaderText>
          {action}
        </Header>
        {rows}
      </Section>
    );
  }

  return (
    <RadixCollapsible.Root asChild defaultOpen={defaultOpen}>
      <Section aria-labelledby={titleId}>
        <Header>
          <HeaderText>
            <Title>
              <Trigger id={titleId}>
                {title}
                <DisclosureIcon aria-hidden="true" />
              </Trigger>
            </Title>
            {descriptionNode}
          </HeaderText>
          {action}
        </Header>
        <Content>{rows}</Content>
      </Section>
    </RadixCollapsible.Root>
  );
}

const Section = styled.section`
  margin-top: 32px;

  ${breakpoint("tablet")`
    margin-top: 48px;
  `}

  /* Less space after a collapsed section. */
  &[data-state="closed"] + & {
    margin-top: 24px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const HeaderText = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

const DisclosureIcon = styled(ExpandedIcon)`
  flex-shrink: 0;
  color: ${s("textTertiary")};
  transition: transform 150ms ease-out;
`;

const Trigger = styled(RadixCollapsible.Trigger)`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: var(--pointer);

  &:hover ${DisclosureIcon} {
    color: ${s("textSecondary")};
  }

  &[data-state="closed"] ${DisclosureIcon} {
    transform: rotate(-90deg);
  }

  [dir="rtl"] &[data-state="closed"] ${DisclosureIcon} {
    transform: rotate(90deg);
  }
`;

const Content = styled(CollapsibleContent)`
  padding-inline-start: 8px;
`;

const Description = styled(Text)`
  margin: 4px 0 8px;
`;

const Rows = styled.div<{ $danger?: boolean }>`
  ${(props) =>
    props.$danger &&
    css`
      /* Inset by the shadow width so the shadow aligns with the content. */
      margin: 24px 8px 8px;
      padding: 0 16px;
      border: 1px solid ${transparentize(0.6, props.theme.danger)};
      border-radius: 8px;
      box-shadow: 0 0 0 8px ${transparentize(0.9, props.theme.danger)};
    `}
`;
