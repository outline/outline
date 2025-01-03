import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { richExtensions } from "@shared/editor/nodes";
import { s } from "@shared/styles";
import Collection from "~/models/Collection";
import Arrow from "~/components/Arrow";
import ButtonLink from "~/components/ButtonLink";
import Editor from "~/components/Editor";
import LoadingIndicator from "~/components/LoadingIndicator";
import NudeButton from "~/components/NudeButton";
import BlockMenuExtension from "~/editor/extensions/BlockMenu";
import EmojiMenuExtension from "~/editor/extensions/EmojiMenu";
import HoverPreviewsExtension from "~/editor/extensions/HoverPreviews";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

const extensions = [
  ...richExtensions,
  BlockMenuExtension,
  EmojiMenuExtension,
  HoverPreviewsExtension,
];

type Props = {
  collection: Collection;
};

function CollectionDescription({ collection }: Props) {
  const { collections } = useStores();
  const { t } = useTranslation();
  const [isExpanded, setExpanded] = React.useState(false);
  const [isEditing, setEditing] = React.useState(false);
  const [isDirty, setDirty] = React.useState(false);
  const can = usePolicy(collection);

  const handleStartEditing = React.useCallback(() => {
    setEditing(true);
  }, []);

  const handleStopEditing = React.useCallback(() => {
    setEditing(false);
  }, []);

  const handleClickDisclosure = React.useCallback(
    (event) => {
      event.preventDefault();

      if (isExpanded && document.activeElement) {
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'blur' does not exist on type 'Element'.
        document.activeElement.blur();
      }

      setExpanded(!isExpanded);
    },
    [isExpanded]
  );

  const handleSave = React.useMemo(
    () =>
      debounce(async (getValue) => {
        try {
          await collection.save({
            data: getValue(false),
          });
          setDirty(false);
        } catch (err) {
          toast.error(t("Sorry, an error occurred saving the collection"));
          throw err;
        }
      }, 1000),
    [collection, t]
  );

  const handleChange = React.useCallback(
    async (getValue) => {
      setDirty(true);
      await handleSave(getValue);
    },
    [handleSave]
  );

  React.useEffect(() => {
    setEditing(false);
  }, [collection.id]);
  const placeholder = `${t("Add a description")}…`;
  const key = isEditing || isDirty ? "draft" : collection.updatedAt;

  return (
    <MaxHeight data-editing={isEditing} data-expanded={isExpanded}>
      <Input data-editing={isEditing} data-expanded={isExpanded}>
        <span onClick={can.update ? handleStartEditing : undefined}>
          {collections.isSaving && <LoadingIndicator />}
          {collection.hasDescription || isEditing || isDirty ? (
            <React.Suspense
              fallback={
                <Placeholder
                  onClick={() => {
                    //
                  }}
                >
                  Loading…
                </Placeholder>
              }
            >
              <Editor
                key={key}
                defaultValue={collection.data}
                onChange={handleChange}
                placeholder={placeholder}
                readOnly={!isEditing}
                autoFocus={isEditing}
                onBlur={handleStopEditing}
                extensions={extensions}
                maxLength={1000}
                embedsDisabled
                canUpdate
              />
            </React.Suspense>
          ) : (
            can.update && (
              <Placeholder
                onClick={() => {
                  //
                }}
              >
                {placeholder}
              </Placeholder>
            )
          )}
        </span>
      </Input>
      {!isEditing && (
        <Disclosure
          onClick={handleClickDisclosure}
          aria-label={isExpanded ? t("Collapse") : t("Expand")}
          size={30}
        >
          <Arrow />
        </Disclosure>
      )}
    </MaxHeight>
  );
}

const Disclosure = styled(NudeButton)`
  opacity: 0;
  color: ${s("divider")};
  position: absolute;
  top: calc(25vh - 50px);
  left: 50%;
  z-index: 1;
  transform: rotate(-90deg) translateX(-50%);
  transition: opacity 100ms ease-in-out;

  &:focus,
  &:hover {
    opacity: 1;
  }

  &:active {
    color: ${s("sidebarText")};
  }
`;

const Placeholder = styled(ButtonLink)`
  color: ${s("placeholder")};
  cursor: text;
  min-height: 27px;
`;

const MaxHeight = styled.div`
  position: relative;
  max-height: 25vh;
  overflow: hidden;
  margin: 8px -8px -8px;
  padding: 8px;

  &[data-editing="true"],
  &[data-expanded="true"] {
    max-height: initial;
    overflow: initial;

    ${Disclosure} {
      top: initial;
      bottom: 0;
      transform: rotate(90deg) translateX(-50%);
    }
  }

  &:hover ${Disclosure} {
    opacity: 1;
  }
`;

const Input = styled.div`
  margin: -8px;
  padding: 8px;
  border-radius: 8px;

  &:after {
    content: "";
    position: absolute;
    top: calc(25vh - 50px);
    left: 0;
    right: 0;
    height: 50px;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      ${(props) => transparentize(1, props.theme.background)} 0%,
      ${s("background")} 100%
    );
  }

  &[data-editing="true"],
  &[data-expanded="true"] {
    &:after {
      background: transparent;
    }
  }

  &[data-editing="true"] {
    background: ${s("backgroundSecondary")};
  }

  .block-menu-trigger,
  .heading-anchor {
    display: none !important;
  }
`;

export default observer(CollectionDescription);
