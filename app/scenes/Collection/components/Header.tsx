import { IconTitleWrapper } from "@shared/components/Icon";
import breakpoint from "styled-components-breakpoint";
import first from "lodash/first";
import { Suspense, useCallback } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { s } from "@shared/styles";
import Heading from "~/components/Heading";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import Text from "~/components/Text";
import type Collection from "~/models/Collection";
import { colorPalette } from "@shared/utils/collections";
import usePolicy from "~/hooks/usePolicy";
import { observer } from "mobx-react";
import lazyWithRetry from "~/utils/lazyWithRetry";

const IconPicker = lazyWithRetry(() => import("~/components/IconPicker"));

type Props = {
  /** The collection for which to render a header */
  collection: Collection;
};

export const Header = observer(function Header_({ collection }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(collection);
  const handleIconChange = useCallback(
    (icon: string | null, color: string | null) =>
      collection?.save({ icon, color }),
    [collection]
  );

  const fallbackIcon = collection ? (
    <CollectionIcon collection={collection} size={40} expanded />
  ) : null;

  const ownerName = collection.createdBy?.name;

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
      {ownerName && (
        <OwnerLabel type="secondary" size="small">
          {t("Owner")}: {ownerName}
        </OwnerLabel>
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

const OwnerLabel = styled(Text)`
  color: ${s("textTertiary")};
  margin-left: 40px;
  margin-top: 4px;

  ${breakpoint("tablet")`
    margin-left: 0;
  `}
`;
