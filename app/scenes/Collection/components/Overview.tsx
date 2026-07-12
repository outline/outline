import { observer } from "mobx-react";
import { useMemo, useRef, useCallback, Suspense } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { MultiplayerEntityType } from "@shared/collaboration/EntityName";
import { richExtensions } from "@shared/editor/nodes";
import { s } from "@shared/styles";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { CollectionValidation } from "@shared/validations";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import Editor from "~/components/Editor";
import Text from "~/components/Text";
import { MeasuredContainer } from "~/components/MeasuredContainer";
import { withUIExtensions } from "~/editor/extensions";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import MultiplayerEditor from "~/scenes/Document/components/AsyncMultiplayerEditor";
import type { Properties } from "~/types";
import CodeWordBreak from "@shared/editor/extensions/CodeWordBreak";

const extensions = [CodeWordBreak, ...withUIExtensions(richExtensions)];

type Props = {
  collection: Collection;
  readOnly?: boolean;
};

function Overview({ collection, readOnly }: Props) {
  const { documents } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const can = usePolicy(collection);

  // Collaborative editing is only available to signed-in users on active
  // collections – public shares and archived collections render a snapshot.
  const multiplayer = !!user && !readOnly && collection.isActive;

  const childRef = useRef<HTMLDivElement>(null);
  const childOffsetHeight = childRef.current?.offsetHeight || 0;
  const editorStyle = useMemo(
    () => ({
      padding: "0 32px",
      margin: "0 -32px",
      paddingBottom: `calc(30vh - ${childOffsetHeight}px)`,
    }),
    [childOffsetHeight]
  );

  const onCreateLink = useCallback(
    async (params: Properties<Document>) => {
      const newDocument = await documents.create(
        {
          collectionId: collection.id,
          data: ProsemirrorHelper.getEmptyDocument(),
          ...params,
        },
        {
          publish: true,
        }
      );

      return newDocument.url;
    },
    [collection, documents]
  );

  const editorProps = {
    defaultValue: collection.data,
    placeholder: `${t("Add a description")}…`,
    extensions,
    maxLength: CollectionValidation.maxDescriptionLength,
    onCreateLink,
    canUpdate: can.update,
    userId: user?.id,
    editorStyle,
  };

  return (
    <Suspense fallback={<Placeholder>Loading…</Placeholder>}>
      <MeasuredContainer name="document">
        {multiplayer ? (
          <MultiplayerEditor
            {...editorProps}
            id={collection.id}
            entityType={MultiplayerEntityType.Collection}
            readOnly={!can.update}
          />
        ) : (
          <Editor {...editorProps} readOnly />
        )}
        <div ref={childRef} />
      </MeasuredContainer>
    </Suspense>
  );
}

const Placeholder = styled(Text)`
  color: ${s("placeholder")};
  cursor: text;
  min-height: 27px;
`;

export default observer(Overview);
