import { InputIcon, ShapesIcon } from "outline-icons";
import React, { useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { ProsemirrorData } from "@shared/types";
import Template from "~/models/Template";
import Editor from "~/scenes/Document/components/Editor";
import { DocumentContextProvider } from "~/components/DocumentContext";
import LoadingIndicator from "~/components/LoadingIndicator";
import Notice from "~/components/Notice";
import useBoolean from "~/hooks/useBoolean";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  template: Template;
};

export default function TemplateEdit({ template }: Props) {
  const { dialogs } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(template);
  const dataRef = useRef(template.data);
  const [isUploading, handleStartUpload, handleStopUpload] = useBoolean();
  const readOnly = !can.update;

  const handleChangeTitle = (title: string) => {
    template.title = title;
    void template.save();
  };

  const handleChangeIcon = (icon: string, color: string) => {
    template.icon = icon;
    template.color = color;
    void template.save();
  };

  const handleChange = (value: (asString: boolean) => ProsemirrorData) => {
    dataRef.current = value(false);
  };

  const handleSave = () => {
    template.data = dataRef.current;
    void template.save();
  };

  const handleCancel = () => {
    dialogs.closeAllModals();
  };

  if (!template) {
    return null;
  }

  return (
    <DocumentContextProvider>
      <React.Suspense fallback={null}>
        {isUploading && <LoadingIndicator />}
        <Notice
          icon={<ShapesIcon />}
          description={
            <Trans>
              Highlight some text and use the <PlaceholderIcon /> control to add
              placeholders that can be filled out when creating new documents
            </Trans>
          }
        >
          {t("You’re editing a template")}
        </Notice>
        <Editor
          id={template.id}
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
}

const PlaceholderIcon = styled(InputIcon)`
  position: relative;
  top: 6px;
  margin-top: -6px;
`;
