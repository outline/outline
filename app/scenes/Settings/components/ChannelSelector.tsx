import * as React from "react";
import { EmailIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { NotificationChannelType } from "@shared/types";
import { faSlack } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  value: NotificationChannelType[];
  onChange: (channels: NotificationChannelType[]) => void;
  slackDisabled?: boolean;
};

/**
 * A dropdown selector for managing notification channel preferences.
 * Displays enabled channels and allows toggling via a popover menu.
 */
function ChannelSelector({ value, onChange, slackDisabled = false }: Props) {
  const { t } = useTranslation();

  const channels = React.useMemo(
    () => [
      {
        key: NotificationChannelType.Email,
        label: t("Email"),
        icon: <EmailIcon size={16} />,
      },
      {
        key: NotificationChannelType.Slack,
        label: t("Slack"),
        icon: <FontAwesomeIcon icon={faSlack} size="xs" />,
      },
    ],
    [t, slackDisabled]
  );

  const handleToggle = React.useCallback(
    (channelType: NotificationChannelType) => {
      const newValue = value.includes(channelType)
        ? value.filter((c) => c !== channelType)
        : [...value, channelType];
      onChange(newValue);
    },
    [value, onChange]
  );

  return (
    <FilterOptions
      defaultLabel={t("Select Channels")}
      options={channels}
      selectedKeys={value}
      onSelect={handleToggle}
    />
  );
}

export default ChannelSelector;
