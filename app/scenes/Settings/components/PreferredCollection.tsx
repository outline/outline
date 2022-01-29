import { SelectStateReturn } from "@renderlesskit/react";
import { CheckmarkIcon, HomeIcon } from "outline-icons";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Collection from "~/models/Collection";
import CollectionIcon from "~/components/CollectionIcon";
import Flex from "~/components/Flex";
import InputSelect from "~/components/InputSelect";
import { IconWrapper } from "~/components/Sidebar/components/SidebarLink";

type PreferredCollectionProps = {
  collections: Collection[];
  fetching: boolean;
  onPreferredCollectionChange: (value: string) => void;
  preferredCollectionId: string | null;
};

const PreferredCollection = ({
  collections,
  fetching,
  onPreferredCollectionChange,
  preferredCollectionId,
}: PreferredCollectionProps) => {
  const { t } = useTranslation();

  const options = collections.reduce(
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
      const collection = collections.find((c) => c.id === option.value);

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
      const collection = collections.find((c) => c.id === option.value);

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
      value={preferredCollectionId ? preferredCollectionId : "home"}
      label={t("Collection")}
      options={options}
      renderLabel={renderLabel}
      renderOption={renderOption}
      onChange={onPreferredCollectionChange}
      ariaLabel={t("Perferred collection")}
      note={t(
        "Users will be redirect to the selected collection when they sign in."
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

export default PreferredCollection;
