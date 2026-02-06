import { IconTitleWrapper } from "@shared/components/Icon";
import breakpoint from "styled-components-breakpoint";
import first from "lodash/first";
import { Suspense, useCallback, useMemo } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { CollectionPermission } from "@shared/types";
import { s } from "@shared/styles";
import Heading from "~/components/Heading";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import Facepile from "~/components/Facepile";
import Flex from "~/components/Flex";
import { AvatarSize } from "~/components/Avatar";
import type Collection from "~/models/Collection";
import { colorPalette } from "@shared/utils/collections";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { observer } from "mobx-react";
import lazyWithRetry from "~/utils/lazyWithRetry";

const IconPicker = lazyWithRetry(() => import("~/components/IconPicker"));

type Props = {
  /** The collection for which to render a header */
  collection: Collection;
};

export const Header = observer(function Header_({ collection }: Props) {
  const { t } = useTranslation();
  const { memberships } = useStores();
  const can = usePolicy(collection);
  const handleIconChange = useCallback(
    (icon: string | null, color: string | null) =>
      collection?.save({ icon, color }),
    [collection]
  );

  const fallbackIcon = collection ? (
    <CollectionIcon collection={collection} size={40} expanded />
  ) : null;

  const owners = useMemo(() => {
    return memberships.orderedData
      .filter(
        (m) =>
          m.collectionId === collection.id &&
          m.permission === CollectionPermission.Owner
      )
      .map((m) => m.user)
      .filter(Boolean);
  }, [memberships.orderedData, collection.id]);

  return (
    <HeaderWrapper>
      <StyledHeading>
        <IconTitleWrapper>
          {can.update ? (
            <Suspense fallback={fallbackIcon}>
              <IconPicker
                icon={collection.icon ?? "collection"}
                color={collection.color ?? (first(colorPalette) as string)}
                initial={collection.initial}
                size={40}
                popoverPosition="bottom-start"
                onChange={handleIconChange}
                borderOnHover
              >
                {fallbackIcon}
              </IconPicker>
            </Suspense>
          ) : (
            fallbackIcon
          )}
        </IconTitleWrapper>
        {collection.name}
      </StyledHeading>
      {owners.length > 0 && (
        <OwnerSection gap={8}>
          <OwnerLabel>{t("Owner")}:</OwnerLabel>
          <Facepile users={owners} size={AvatarSize.Medium} limit={5} />
        </OwnerSection>
      )}
    </HeaderWrapper>
  );
});

const HeaderWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const StyledHeading = styled(Heading)`
  display: flex;
  align-items: center;
  position: relative;
  margin-left: 40px;

  ${breakpoint("tablet")`
    margin-left: 0;
  `}
`;

const OwnerSection = styled(Flex)`
  align-items: center;
  margin-left: 40px;
  margin-top: 8px;

  ${breakpoint("tablet")`
    margin-left: 0;
  `}
`;

const OwnerLabel = styled.span`
  color: ${s("textTertiary")};
  font-size: 14px;
`;
