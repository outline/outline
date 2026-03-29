import { observer } from "mobx-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import useStores from "~/hooks/useStores";

type Props = {
  activeKey: string;
  onSelect: (key: string | null | undefined) => void;
};

const GroupSourceFilter = ({ activeKey, onSelect, ...rest }: Props) => {
  const { t } = useTranslation();
  const { authenticationProviders } = useStores();

  useEffect(() => {
    void authenticationProviders.fetchPage({});
  }, [authenticationProviders]);

  const syncProviders = useMemo(
    () =>
      authenticationProviders.orderedData.filter(
        (p) => p.settings?.groupSyncEnabled
      ),
    [authenticationProviders.orderedData]
  );

  if (!syncProviders.length) {
    return null;
  }

  const options = [
    { key: "", label: t("All sources") },
    { key: "manual", label: t("Manual") },
    ...syncProviders.map((p) => ({
      key: p.name,
      label: p.displayName,
    })),
  ];

  return (
    <FilterOptions
      options={options}
      selectedKeys={[activeKey]}
      onSelect={onSelect}
      defaultLabel={t("All sources")}
      {...rest}
    />
  );
};

export default observer(GroupSourceFilter);
