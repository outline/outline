import { observer } from "mobx-react";
import { useMemo, useRef, useCallback, Suspense } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { richExtensions } from "@shared/editor/nodes";
import { s } from "@shared/styles";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { CollectionValidation } from "@shared/validations";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import CollectionMultiplayerEditor from "./CollectionMultiplayerEditor";
import LoadingIndicator from "~/components/LoadingIndicator";
import Text from "~/components/Text";
import { MeasuredContainer } from "~/components/MeasuredContainer";
import { withUIExtensions } from "~/editor/extensions";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type { Properties } from "~/types";

const extensions = withUIExtensions(richExtensions);

type Props = {
  collection: Collection;
  readOnly?: boolean;
};

function Overview({ collection, readOnly }: Props) {
  const { documents, collections } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const can = usePolicy(collection);



  const childRef = useRef<HTMLDivElement>(null);
  const childOffsetHeight = childRef.current?.offsetHeight || 0;
  const editorStyle = useMemo(
    () => ({
      padding: "0 32px",
      margin: "0 -32px",
      paddingBottom: `calc(50vh - ${childOffsetHeight}px)`,
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

  return (
    <>
      {collections.isSaving && <LoadingIndicator />}
      {(collection.hasDescription || can.update) && (
        <Suspense fallback={<Placeholder>Loading…</Placeholder>}>
          <MeasuredContainer name="document">
            {/* 
              We use the collaborative editor for collections descriptions. 
              Manual saving is handled by the provider.
            */}
            <CollectionMultiplayerEditor
              id={collection.id}
              placeholder={`${t("Add a description")}…`}
              extensions={extensions}
              maxLength={CollectionValidation.maxDescriptionLength}
              onCreateLink={onCreateLink}
              readOnly={!can.update || readOnly}
              userId={user?.id}
              editorStyle={editorStyle}
              // Pass initial content for the very first load if needed?
              // The component handles caching via IndexedDB.
              defaultValue={collection.data}
            />
            <div ref={childRef} />
          </MeasuredContainer>
        </Suspense>
      )}
    </>
  );
}

const Placeholder = styled(Text)`
  color: ${s("placeholder")};
  cursor: text;
  min-height: 27px;
`;

export default observer(Overview);
