import { HomeIcon } from "outline-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import CollectionIcon from "~/components/CollectionIcon";
import Flex from "~/components/Flex";
import InputSelect from "~/components/InputSelect";
import { IconWrapper } from "~/components/Sidebar/components/SidebarLink";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

const DefaultCollectionInputSelect = () => {
  const { t } = useTranslation();
  const { collections, auth } = useStores();
  const team = useCurrentTeam();
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState();
  const { showToast } = useToasts();

  React.useEffect(() => {
    async function load() {
      if (!collections.isLoaded && !fetching && !fetchError) {
        try {
          setFetching(true);
          await collections.fetchPage({
            limit: 100,
          });
        } catch (error) {
          showToast(
            t("Collections could not be loaded, please reload the app"),
            {
              type: "error",
            }
          );
          setFetchError(error);
        } finally {
          setFetching(false);
        }
      }
    }
    load();
  }, [showToast, fetchError, t, fetching, collections]);

  const onSelectCollection = React.useCallback(
    async (value: string) => {
      const defaultCollectionId = value === "home" ? null : value;
      try {
        await auth.updateTeam({
          defaultCollectionId,
        });
        showToast(t("Settings saved"), {
          type: "success",
        });
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [auth, showToast, t]
  );

  const options = React.useMemo(
    () =>
      collections.publicCollections.reduce(
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
                  <HomeIcon color="currentColor" />
                </IconWrapper>
                {t("Home")}
              </Flex>
            ),
            value: "home",
          },
        ]
      ),
    [collections.publicCollections, t]
  );

  if (fetching) {
    return null;
  }

  return (
    <InputSelect
      value={team.defaultCollectionId ?? "home"}
      label={t("Start view")}
      options={options}
      onChange={onSelectCollection}
      ariaLabel={t("Default collection")}
      note={t(
        "This is the screen that team members will first see when they sign in."
      )}
      short
    />
  );
};

export default DefaultCollectionInputSelect;
