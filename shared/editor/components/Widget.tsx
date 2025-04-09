import * as React from "react";
import styled, { css, DefaultTheme } from "styled-components"; // Removed unused imports
import { sanitizeUrl } from "../../utils/urls";

type Props = {
  theme: DefaultTheme; // Explicitly require theme prop
  /** Icon to display on the left side of the widget */
  icon: React.ReactNode;
  /** Title of the widget */
  title: React.ReactNode;
  /** Context, displayed to right of title */
  context?: React.ReactNode;
  /** URL to open when the widget is clicked */
  href?: string;
  /** Whether the widget is currently selected */
  isSelected: boolean;
  /** Children to display to the right of the context */
  children?: React.ReactNode;
  /** Callback fired when the widget is double clicked */
  onDoubleClick?: React.MouseEventHandler<HTMLElement>;
  /** Callback fired when the widget is clicked */
  onMouseDown?: React.MouseEventHandler<HTMLElement>;
  /** Callback fired when the widget is clicked */
  onClick?: React.MouseEventHandler<HTMLElement>;
};

// Remove ThemeProps<DefaultTheme> from here as theme is now explicitly in Props
export default function Widget(props: Props) {
  const { theme, isSelected, href, title, context, children, icon } = props;
  const className = isSelected ? "ProseMirror-selectednode widget" : "widget";
  const sanitizedHref = sanitizeUrl(href);

  if (sanitizedHref) {
    return (
      <Wrapper
        theme={theme}
        className={className}
        target="_blank"
        href={sanitizedHref}
        rel="noreferrer nofollow"
        onDoubleClick={props.onDoubleClick}
        onMouseDown={props.onMouseDown}
        onClick={props.onClick}
      >
        {icon}
        <Preview theme={theme}>
          <Title theme={theme}>{title}</Title>
          <Subtitle theme={theme}>{context}</Subtitle>
          <Children theme={theme}>{children}</Children>
        </Preview>
      </Wrapper>
    );
  } else {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: theme.background,
          color: theme.text,
          boxShadow: `0 0 0 1px ${theme.divider}`,
          whiteSpace: "nowrap",
          borderRadius: "8px",
          padding: "6px 8px",
          maxWidth: "840px",
          cursor: "default",
          userSelect: "none",
          textOverflow: "ellipsis",
          overflow: "hidden",
        }}
        onDoubleClick={props.onDoubleClick}
        onMouseDown={props.onMouseDown}
        onClick={props.onClick}
      >
        {icon}
        <Preview theme={theme}>
          <Title theme={theme}>{title}</Title>
          <Subtitle theme={theme}>{context}</Subtitle>
          <Children theme={theme}>{children}</Children>
        </Preview>
      </div>
    );
  }
}

const Children = styled.div`
  margin-left: auto;
  height: 20px;
  opacity: 0;

  &:hover {
    color: ${(props: StyledThemeProps) =>
      props.theme.text}; /* Use theme prop */
  }
`;

const Title = styled.strong<StyledThemeProps>`
  /* Add type annotation */
  font-weight: 500;
  font-size: 14px;
  color: ${(props: StyledThemeProps) => props.theme.text}; /* Use theme prop */
`;

const Preview = styled.div<StyledThemeProps>`
  /* Add type annotation */
  gap: 8px;
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  align-items: center;
  color: ${(props: StyledThemeProps) =>
    props.theme.textTertiary}; /* Use theme prop */
`;

const Subtitle = styled.span<StyledThemeProps>`
  /* Add type annotation */
  font-size: 13px;
  color: ${(props: StyledThemeProps) =>
    props.theme.textTertiary} !important; /* Use theme prop */
  line-height: 0;
`;

// Define ThemeProps type for styled components
type StyledThemeProps = { theme: DefaultTheme };

const Wrapper = styled.a<StyledThemeProps>`
  /* Add type annotation */
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${(props: StyledThemeProps) =>
    props.theme.background}; /* Use theme prop */
  color: ${(props: StyledThemeProps) =>
    props.theme.text} !important; /* Use theme prop */
  box-shadow: 0 0 0 1px ${(props: StyledThemeProps) => props.theme.divider}; /* Use theme prop */
  white-space: nowrap;
  border-radius: 8px;
  padding: 6px 8px;
  max-width: 840px;
  cursor: default;

  user-select: none;
  text-overflow: ellipsis;
  overflow: hidden;

  ${(
    props: StyledThemeProps & { href?: string } // Add type annotation for props
  ) =>
    props.href &&
    css`
      &:hover,
      &:active {
        cursor: pointer !important;
        text-decoration: none !important;
        background: ${props.theme.backgroundSecondary}; /* Use theme prop */

        /* Target Children correctly within the hover state */
        ${Children} {
          opacity: 1;
          color: ${props.theme.text}; /* Ensure hover color uses theme */
        }
      }
    `}
`;
