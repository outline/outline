import { HomeIcon } from "outline-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Optional } from "utility-types";
import Flex from "~/components/Flex";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import InputSelect from "~/components/InputSelect";
import { IconWrapper } from "~/components/Sidebar/components/SidebarLink";
import useStores from "~/hooks/useStores";

type DefaultCollectionInputSelectProps = Optional<
  React.ComponentProps<typeof InputSelect>
> & {
  onSelectCollection: (collection: string) => void;
  defaultCollectionId: string | null;
};

const DefaultCollectionInputSelect = ({
  onSelectCollection,
  defaultCollectionId,
  ...rest
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

  const options = React.useMemo(
    () =>
      collections.nonPrivate.reduce(
        (acc, collection) => [
          ...acc,
          {
            label: (
              <Flex align="center">
                <IconWrapper>
                  <CollectionIcon collection={collection} />
                </IconWrapper>
                {collection.name}
              </Flex>
            ),
            value: collection.id,
          },
        ],
        [
          {
            label: (
              <Flex align="center">
                <IconWrapper>
                  <HomeIcon />
                </IconWrapper>
                {t("Home")}
              </Flex>
            ),
            value: "home",
          },
        ]
      ),
    [collections.nonPrivate, t]
  );

  if (fetching) {
    return null;
  }

  return (
    <InputSelect
      value={defaultCollectionId ?? "home"}
      options={options}
      onChange={onSelectCollection}
      ariaLabel={t("Default collection")}
      short
      {...rest}
    />
  );
};

export default DefaultCollectionInputSelect;
