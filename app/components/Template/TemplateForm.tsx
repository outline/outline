import { debounce } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { InputIcon, ShapesIcon } from "outline-icons";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Prompt } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import type { ProsemirrorData } from "@shared/types";
import { errToString } from "@shared/utils/error";
import type Template from "~/models/Template";
import Editor from "~/scenes/Document/components/Editor";
import { DocumentContextProvider } from "~/components/DocumentContext";
import LoadingIndicator from "~/components/LoadingIndicator";
import Notice from "~/components/Notice";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import useEventListener from "~/hooks/useEventListener";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

const AUTOSAVE_DELAY = 1000;

/** The fields this form is able to edit. */
type TemplateEdits = Pick<Template, "title" | "data" | "icon" | "color">;

export const TemplateForm = observer(function TemplateForm_({
  handleSubmit,
  template,
}: {
  handleSubmit: (template: Template) => void;
  template: Template;
}) {
  const { dialogs } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser();
  const can = usePolicy(template);
  const editsRef = useRef<Partial<TemplateEdits>>({});
  const ref = useRef(null);
  const [isUploading, handleStartUpload, handleStopUpload] = useBoolean();
  const readOnly = !can.update && !template.isNew;

  const saveRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const saveFailedRef = useRef(false);

  const autosave = useMemo(
    () => debounce(() => void saveRef.current(), AUTOSAVE_DELAY),
    []
  );

  // The API response is applied back over the model, so anything edited while a
  // request is in flight has to be re-applied once it lands.
  const applyEdits = useCallback(() => {
    Object.assign(template, editsRef.current);
  }, [template]);

  const save = useCallback(async () => {
    if (template.isSaving) {
      return;
    }

    applyEdits();
    if (!template.isDirty()) {
      return;
    }

    try {
      await template.save();
      saveFailedRef.current = false;
    } catch (error) {
      saveFailedRef.current = true;
      toast.error(errToString(error));
      return;
    }

    applyEdits();
    if (template.isDirty()) {
      autosave();
    }
  }, [template, applyEdits, autosave]);

  useEffect(() => {
    saveRef.current = save;
  });

  const handleChangeTitle = (title: string) => {
    editsRef.current.title = title;
    applyEdits();
    autosave();
  };

  const handleChangeIcon = (icon: string, color: string) => {
    editsRef.current.icon = icon;
    editsRef.current.color = color;
    applyEdits();
    autosave();
  };

  const handleChange = (value: (asString: boolean) => ProsemirrorData) => {
    editsRef.current.data = value(false);
    applyEdits();
    autosave();
  };

  const handleSave = (options: { done?: boolean; autosave?: boolean }) => {
    if (options.done) {
      handleSubmit(template);
      return;
    }

    autosave.cancel();
    void save();
  };

  const handleCancel = () => {
    dialogs.closeAllModals();
  };

  const handleUnload = (event: BeforeUnloadEvent) => {
    if (template.isDirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  };

  // Changes are flushed on unmount, so navigation is only worth blocking when
  // saving them has already failed.
  const handleBlockNavigation = () =>
    saveFailedRef.current && template.isDirty()
      ? t(`Your changes couldn’t be saved.\nAre you sure you want to leave?`)
      : true;

  useEventListener("beforeunload", handleUnload);

  // Flush anything the debounce hasn't caught yet, and clean up after a draft
  // that was opened but never written to.
  useEffect(
    () => () => {
      autosave.cancel();

      if (readOnly) {
        return;
      }

      applyEdits();

      if (
        template.isDraft &&
        template.isEmpty &&
        template.createdBy?.id === user.id
      ) {
        void template.delete();
      } else if (template.isDirty()) {
        void saveRef.current();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  if (!template) {
    return null;
  }

  return (
    <DocumentContextProvider>
      <Prompt message={handleBlockNavigation} />
      <React.Suspense fallback={null}>
        {isUploading && <LoadingIndicator />}
        <EditingNotice
          icon={<ShapesIcon />}
          description={
            <Trans>
              Highlight some text and use the <PlaceholderIcon /> control to add
              placeholders that can be filled out when creating new documents
            </Trans>
          }
        >
          {t("You’re editing a template")}
        </EditingNotice>
        <Editor
          id={template.id}
          ref={ref}
          isDraft={false}
          document={template}
          value={readOnly ? template.data : undefined}
          defaultValue={template.data}
          onFileUploadStart={handleStartUpload}
          onFileUploadStop={handleStopUpload}
          onChangeTitle={handleChangeTitle}
          onChangeIcon={handleChangeIcon}
          onSave={handleSave}
          onCancel={handleCancel}
          onChange={handleChange}
          readOnly={readOnly}
          canUpdate={can.update}
          autoFocus={template.createdAt === template.updatedAt}
          template
        />
      </React.Suspense>
    </DocumentContextProvider>
  );
});

const EditingNotice = styled(Notice)`
  @media print {
    display: none;
  }
`;

const PlaceholderIcon = styled(InputIcon)`
  position: relative;
  top: 6px;
  margin-top: -6px;
`;
