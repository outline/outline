import { IconTitleWrapper } from "@shared/components/Icon";
import breakpoint from "styled-components-breakpoint";
import { first } from "es-toolkit/compat";
import { Suspense, useCallback } from "react";
import styled from "styled-components";
import { NotebookValidation } from "@shared/validations";
import { isRTL } from "@shared/utils/rtl";
import Heading from "~/components/Heading";
import ContentEditable from "~/components/ContentEditable";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import type Notebook from "~/models/Notebook";
import { colorPalette } from "@shared/constants";
import usePolicy from "~/hooks/usePolicy";
import { observer } from "mobx-react";
import lazyWithRetry from "~/utils/lazyWithRetry";
const IconPicker = lazyWithRetry(() => import("~/components/IconPicker"));
type Props = {
  /** The collection for which to render a header */
  notebook: Notebook;
  /** Whether the header is in editing mode */
  isEditing?: boolean;
};
export const Header = observer(function Header_({
  notebook,
  isEditing,
}: Props) {
  const can = usePolicy(notebook);
  const canEdit = can.update && isEditing;
  const handleIconChange = useCallback(
    (icon: string | null, color: string | null) =>
      notebook?.save({ icon, color }),
    [notebook]
  );
  const handleTitleChange = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length > 0 && trimmed !== notebook.name) {
        void notebook.save({ name: trimmed });
      }
    },
    [notebook]
  );
  const fallbackIcon = notebook ? (
    <CollectionIcon notebook={notebook} size={40} expanded />
  ) : null;
  const dir = isRTL(notebook.name) ? "rtl" : "ltr";
  return (
    <StyledHeading dir={dir}>
      <IconTitleWrapper dir={dir}>
        {canEdit ? (
          <Suspense fallback={fallbackIcon}>
            <IconPicker
              icon={notebook.icon ?? "collection"}
              color={notebook.color ?? (first(colorPalette) as string)}
              initial={notebook.initial}
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
          value={notebook.name}
          onChange={handleTitleChange}
          maxLength={NotebookValidation.maxNameLength}
          dir="auto"
        />
      ) : (
        notebook.name
      )}
    </StyledHeading>
  );
});
const StyledHeading = styled(Heading)`
  display: flex;
  align-items: center;
  position: relative;
  margin-left: 16px;

  ${breakpoint("tablet")`
    margin-left: 0;
  `}
`;
