import * as React from "react";
import { Trans } from "react-i18next";
import { FileOperationFormat } from "@shared/types";
import useStores from "~/hooks/useStores";
import DropToImport from "./DropToImport";
import Text from "@shared/components/Text";

type Props = {
    title: React.ReactNode;
    description: React.ReactNode;
    format: FileOperationFormat;
};

function ImportGenericZipDialog({ title, description, format }: Props) {
    const { dialogs } = useStores();

    return (
        <>
            <Text as="p">
                {description}
            </Text>
            <DropToImport
                onSubmit={dialogs.closeAllModals}
                format={format}
            >
                <Trans>
                    Drag and drop the export file, or click to upload
                </Trans>
            </DropToImport>
        </>
    );
}

export default ImportGenericZipDialog;
