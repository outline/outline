import { MoreIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton } from "reakit/Menu";
import NudeButton from "~/components/NudeButton";

type Props = React.ComponentProps<typeof MenuButton> & {
  className?: string;
};

export default function OverflowMenuButton({ className, ...rest }: Props) {
  const { t } = useTranslation();

  return (
    <MenuButton {...rest}>
      {(props) => (
        <NudeButton
          className={className}
          aria-label={t("More options")}
          {...props}
        >
          <MoreIcon />
        </NudeButton>
      )}
    </MenuButton>
  );
}
