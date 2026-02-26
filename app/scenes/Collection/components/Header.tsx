import { IconTitleWrapper } from "@shared/components/Icon";
import breakpoint from "styled-components-breakpoint";
import first from "lodash/first";
import { Suspense, useCallback } from "react";
import styled from "styled-components";
import { CollectionValidation } from "@shared/validations";
import Heading from "~/components/Heading";
import ContentEditable from "~/components/ContentEditable";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import type Collection from "~/models/Collection";
import { colorPalette } from "@shared/utils/collections";
import usePolicy from "~/hooks/usePolicy";
import { observer } from "mobx-react";
import lazyWithRetry from "~/utils/lazyWithRetry";

const IconPicker = lazyWithRetry(() => import("~/components/IconPicker"));

type Props = {
  /** The collection for which to render a header */
  collection: Collection;
  /** Whether the header is in editing mode */
  isEditing?: boolean;
};

export const Header = observer(function Header_({
  collection,
  isEditing,
}: Props) {
  const can = usePolicy(collection);
  const canEdit = can.update && isEditing;
  const handleIconChange = useCallback(
    (icon: string | null, color: string | null) =>
      collection?.save({ icon, color }),
    [collection]
  );

  const handleTitleChange = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length > 0 && trimmed !== collection.name) {
        void collection.save({ name: trimmed });
      }
    },
    [collection]
  );

  const fallbackIcon = collection ? (
    <CollectionIcon collection={collection} size={40} expanded />
  ) : null;

  return (
    <StyledHeading>
      <IconTitleWrapper>
        {canEdit ? (
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
      {canEdit ? (
        <ContentEditable
          value={collection.name}
          onChange={handleTitleChange}
          maxLength={CollectionValidation.maxNameLength}
          dir="auto"
        />
      ) : (
        collection.name
      )}
    </StyledHeading>
  );
});

const StyledHeading = styled(Heading)`
  display: flex;
  align-items: center;
  position: relative;
  margin-left: 40px;

  ${breakpoint("tablet")`
    margin-left: 0;
  `}
`;
