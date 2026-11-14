import { observer } from "mobx-react";
import { UserIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import { useUserOptions } from "../filterOptions";

type Props = {
  /** The currently selected user ID */
  userId: string | undefined;
  /** Label for the option that matches every user, defaults to "Any author" */
  anyLabel?: string;
  /** Callback to call when a user is selected */
  onSelect: (key: string | undefined) => void;
};

function UserFilter(props: Props) {
  const { onSelect, userId } = props;
  const { t } = useTranslation();
  const source = useUserOptions();
  const anyLabel = props.anyLabel ?? t("Any author");

  const options = useMemo(
    () => [
      {
        key: "",
        label: anyLabel,
        icon: <UserIcon size={20} />,
      },
      ...source.options,
    ],
    [source.options, anyLabel]
  );

  return (
    <FilterOptions
      options={options}
      selectedKeys={[userId]}
      onSelect={onSelect}
      defaultLabel={anyLabel}
      fetchQuery={source.fetchQuery}
      fetchQueryOptions={source.fetchQueryOptions}
      showFilter
    />
  );
}

export default observer(UserFilter);
