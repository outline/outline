import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { richExtensions } from "@shared/editor/nodes";
import { s } from "@shared/styles";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { CollectionValidation } from "@shared/validations";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import Editor from "~/components/Editor";
import LoadingIndicator from "~/components/LoadingIndicator";
import Text from "~/components/Text";
import { withUIExtensions } from "~/editor/extensions";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { Properties } from "~/types";

const extensions = withUIExtensions(richExtensions);

type Props = {
  collection: Collection;
};

function Overview({ collection }: Props) {
  const { documents, collections } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: true });
  const can = usePolicy(collection);

  const handleSave = React.useMemo(
    () =>
      debounce(async (getValue) => {
        try {
          await collection.save({
            data: getValue(false),
          });
        } catch (err) {
          toast.error(t("Sorry, an error occurred saving the collection"));
          throw err;
        }
      }, 1000),
    [collection, t]
  );

  const childRef = React.useRef<HTMLDivElement>(null);
  const childOffsetHeight = childRef.current?.offsetHeight || 0;
  const editorStyle = React.useMemo(
    () => ({
      padding: "0 32px",
      margin: "0 -32px",
      paddingBottom: `calc(50vh - ${childOffsetHeight}px)`,
    }),
    [childOffsetHeight]
  );

  const onCreateLink = React.useCallback(
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
        <React.Suspense fallback={<Placeholder>Loading…</Placeholder>}>
          <Editor
            defaultValue={collection.data}
            onChange={handleSave}
            placeholder={`${t("Add a description")}…`}
            extensions={extensions}
            maxLength={CollectionValidation.maxDescriptionLength}
            onCreateLink={onCreateLink}
            canUpdate={can.update}
            readOnly={!can.update}
            userId={user.id}
            editorStyle={editorStyle}
          />
          <div ref={childRef} />
        </React.Suspense>
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
