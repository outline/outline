import * as React from "react";
import { EmailIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { NotificationChannelType } from "@shared/types";
import { faSlack } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  value: NotificationChannelType[];
  onChange: (key: string | undefined | null) => void;
  slackDisabled?: boolean;
};

/**
 * A dropdown selector for managing notification channel preferences.
 * Displays enabled channels and allows toggling via a popover menu.
 */
function ChannelSelector({ value, onChange, slackDisabled = false }: Props) {
  const { t } = useTranslation();

  const channels = React.useMemo(() => {
    const availableChannels = [
      {
        key: NotificationChannelType.Email,
        label: t("Email"),
        icon: <EmailIcon size={16} />,
      },
    ];

    if (!slackDisabled) {
      availableChannels.push({
        key: NotificationChannelType.Slack,
        label: t("Slack"),
        icon: <FontAwesomeIcon icon={faSlack} size="xs" />,
      });
    }

    return availableChannels;
  }, [t, slackDisabled]);

  const handleToggle = React.useCallback(
    (key: string | undefined | null) => {
      onChange(key);
    },
    [onChange]
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
