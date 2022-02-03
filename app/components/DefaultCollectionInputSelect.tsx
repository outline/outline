import { SelectStateReturn } from "@renderlesskit/react";
import { CheckmarkIcon, HomeIcon } from "outline-icons";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import CollectionIcon from "~/components/CollectionIcon";
import Flex from "~/components/Flex";
import InputSelect from "~/components/InputSelect";
import { IconWrapper } from "~/components/Sidebar/components/SidebarLink";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type DefaultCollectionInputSelectProps = {
  onSelectCollection: (value: string) => void;
  defaultCollectionId?: string | null;
};

const DefaultCollectionInputSelect = ({
  onSelectCollection,
  defaultCollectionId,
}: DefaultCollectionInputSelectProps) => {
  const { t } = useTranslation();
  const { collections } = useStores();
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

  const options = collections.publicCollections.reduce(
    (acc, collection) => [
      ...acc,
      {
        label: collection.name,
        value: collection.id,
      },
    ],
    [{ label: t("Home"), value: "home" }]
  );

  const renderLabel = useCallback(
    (option: { label: string; value: string }) => {
      const collection = collections.publicCollections.find(
        (c) => c.id === option.value
      );

      const Icon = collection ? (
        <CollectionIcon collection={collection} />
      ) : (
        <HomeIcon color="currentColor" />
      );

      return (
        <Flex align="center">
          <IconWrapper>{Icon}</IconWrapper>
          {option.label}
        </Flex>
      );
    },
    [collections]
  );

  const renderOption = useCallback(
    (option: { label: string; value: string }, select: SelectStateReturn) => {
      const collection = collections.publicCollections.find(
        (c) => c.id === option.value
      );

      const Icon = collection ? (
        <CollectionIcon collection={collection} />
      ) : (
        <HomeIcon color="currentColor" />
      );

      return (
        <Flex align="center">
          {option.value === select.selectedValue ? (
            <CheckmarkIcon color="currentColor" />
          ) : (
            <>
              <Spacer />
              &nbsp;
            </>
          )}
          <IconWrapper>{Icon}</IconWrapper>
          {option.label}
        </Flex>
      );
    },
    [collections]
  );

  if (fetching) return null;

  return (
    <InputSelect
      value={defaultCollectionId ?? "home"}
      label={t("Collection")}
      options={options}
      renderLabel={renderLabel}
      renderOption={renderOption}
      onChange={onSelectCollection}
      ariaLabel={t("Perferred collection")}
      note={t(
        "We will redirect users to the selected collection when they sign in."
      )}
      short
    />
  );
};

const Spacer = styled.div`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

export default DefaultCollectionInputSelect;
