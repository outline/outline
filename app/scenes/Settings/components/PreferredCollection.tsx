import { CheckmarkIcon, HomeIcon } from "outline-icons";
import React from "react";
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

  if (fetching) return null;

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

  return (
    <InputSelect
      value={preferredCollectionId ? preferredCollectionId : "home"}
      label={t("Collection")}
      options={options}
      labelRenderer={(options) => {
        if (options.value === "home") {
          return (
            <Flex align="center">
              <IconWrapper>
                <HomeIcon color="currentColor" />
              </IconWrapper>
              {options.label}
            </Flex>
          );
        }
        const collection = collections.find((c) => c.id === options.value);
        if (!collection) return;
        return (
          <Flex align="center">
            <IconWrapper>
              <CollectionIcon
                color={collection.color}
                collection={collection}
              />
            </IconWrapper>
            {options.label}
          </Flex>
        );
      }}
      renderer={(options, select) => {
        if (options.value === "home") {
          return (
            <Flex align="center">
              {options.value === select.selectedValue ? (
                <>
                  <CheckmarkIcon color="currentColor" />
                </>
              ) : (
                <>
                  <Spacer />
                  &nbsp;
                </>
              )}
              <IconWrapper>
                <HomeIcon color="currentColor" />
              </IconWrapper>
              {options.label}
            </Flex>
          );
        }
        const collection = collections.find((c) => c.id === options.value);
        if (!collection) return;
        return (
          <Flex align="center">
            {options.value === select.selectedValue ? (
              <>
                <CheckmarkIcon color="currentColor" />
              </>
            ) : (
              <>
                <Spacer />
                &nbsp;
              </>
            )}
            <IconWrapper>
              <CollectionIcon collection={collection} />
            </IconWrapper>
            {options.label}
          </Flex>
        );
      }}
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
