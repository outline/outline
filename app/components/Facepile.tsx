import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import { s } from "@shared/styles";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

type Props = {
  /** The users to display */
  users: User[];
  /** The size of the avatars, defaults to AvatarSize.Large */
  size?: number;
  /** A number to show as the number of additional users */
  overflow?: number;
  /** The maximum number of users to display, defaults to 8 */
  limit?: number;
  /** A component to render the avatar, defaults to Avatar. */
  renderAvatar?: React.ComponentType<
    React.ComponentProps<typeof Avatar> & {
      model: User;
    }
  >;
  /** Whether to show tooltips on hover, defaults to true */
  showTooltip?: boolean;
};

function Facepile({
  users,
  overflow = 0,
  size = AvatarSize.Large,
  limit = 8,
  renderAvatar = Avatar,
  showTooltip = true,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const filtered = users.filter(Boolean).slice(-limit);
  const Component = renderAvatar;

  if (overflow > 0) {
    filtered.unshift({
      id: "overflow",
      initial: `${users.length ? "+" : ""}${overflow}`,
      name: t(`{{count}} more user`, { count: overflow }),
    } as User);
  }

  return (
    <Avatars {...rest}>
      {filtered.map((model, index) => {
        const lastChild = index === 0;
        return (
          <Component
            key={model.id}
            {...{
              showTooltip,
              model,
              size,
              style: {
                marginRight: lastChild ? 0 : -4,
                ...(lastChild || filtered.length === 1
                  ? {}
                  : { clipPath: `url(#${clipPathId(size)})` }),
              },
            }}
          />
        );
      })}
      <VisuallyHidden>
        <FacepileClip size={size} />
      </VisuallyHidden>
    </Avatars>
  );
}

function FacepileClip({ size }: { size: number }) {
  return (
    <SVG
      width="25"
      height="28"
      viewBox="0 0 25 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <clipPath id={clipPathId(size)}>
        <path
          transform={size !== 28 ? `scale(${size / 28})` : ""}
          d="M14.0633 0.5C18.1978 0.5 21.8994 2.34071 24.3876 5.24462C22.8709 7.81315 22.0012 10.8061 22.0012 14C22.0012 17.1939 22.8709 20.1868 24.3876 22.7554C21.8994 25.6593 18.1978 27.5 14.0633 27.5C6.57035 27.5 0.5 21.4537 0.5 14C0.5 6.54628 6.57035 0.5 14.0633 0.5Z"
        />
      </clipPath>
    </SVG>
  );
}

function clipPathId(size: number) {
  return `facepile-${size}`;
}

const SVG = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
`;

const Avatars = styled(Flex)`
  align-items: center;
  flex-direction: row-reverse;
  cursor: var(--pointer);

  *:hover {
    clip-path: none !important;
    box-shadow: 0 0 0 2px ${s("background")};
  }
`;

export default observer(Facepile);
