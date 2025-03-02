import { HomeIcon } from "outline-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { InputSelectNew, Option } from "~/components/InputSelectNew";
import useStores from "~/hooks/useStores";

type DefaultCollectionInputSelectProps = {
  onSelectCollection: (collection: string) => void;
  defaultCollectionId: string | null;
};

const DefaultCollectionInputSelect = ({
  onSelectCollection,
  defaultCollectionId,
}: DefaultCollectionInputSelectProps) => {
  const { t } = useTranslation();
  const { collections } = useStores();
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState();

  React.useEffect(() => {
    async function fetchData() {
      if (!collections.isLoaded && !fetching && !fetchError) {
        try {
          setFetching(true);
          await collections.fetchPage({
            limit: 100,
          });
        } catch (error) {
          toast.error(
            t("Collections could not be loaded, please reload the app")
          );
          setFetchError(error);
        } finally {
          setFetching(false);
        }
      }
    }
    void fetchData();
  }, [fetchError, t, fetching, collections]);

  const options: Option[] = React.useMemo(
    () =>
      collections.nonPrivate.reduce(
        (acc, collection) => [
          ...acc,
          {
            type: "item",
            label: collection.name,
            value: collection.id,
            icon: <CollectionIcon collection={collection} />,
          },
        ],
        [
          {
            type: "item",
            label: t("Home"),
            value: "home",
            icon: <HomeIcon />,
          },
        ] satisfies Option[]
      ),
    [collections.nonPrivate, t]
  );

  if (fetching) {
    return null;
  }

  return (
    <InputSelectNew
      options={options}
      value={defaultCollectionId ?? "home"}
      onChange={onSelectCollection}
      ariaLabel={t("Default collection")}
      label={t("Start view")}
      hideLabel
      short
    />
  );
};

export default DefaultCollectionInputSelect;
