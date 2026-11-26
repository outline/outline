import { useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import type { CollectionPermission } from "@shared/types";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { InputSelectPermission } from "~/components/InputSelectPermission";
import { EmptySelectValue } from "~/types";
import type { ImportDestination, ImportLocation } from "./ImportRootPicker";
import ImportRootPicker, { NewCollections } from "./ImportRootPicker";

/** The options chosen by the user in the import steps. */
export interface ImportOptions {
  /** The chosen destination, or null to create new collections. */
  destination: ImportDestination | null;
  /** The permission for new collections, always unset with a destination. */
  permission?: CollectionPermission;
}

enum Step {
  Upload = "upload",
  Location = "location",
}

interface Props {
  /** The content of the first step, omit when the import has no upload. */
  upload?: React.ReactNode;
  /** Whether the upload step is complete. */
  canContinue?: boolean;
  /** The permission that is initially selected. */
  defaultPermission?: CollectionPermission;
  /** Whether the import is being started. */
  isSubmitting: boolean;
  /** The button label to show while the import is being started. */
  submittingLabel: string;
  /** Called when the user starts the import. */
  onStart: (options: ImportOptions) => void;
}

/**
 * Walks the user through the steps to start an import within a single dialog:
 * the upload (when there is one), then the location. The location is either new
 * collections, which also need a default permission, or an existing collection
 * or document.
 *
 * @param props The component props.
 * @returns The rendered steps.
 */
export function ImportSteps({
  upload,
  canContinue = true,
  defaultPermission,
  isSubmitting,
  submittingLabel,
  onStart,
}: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(upload ? Step.Upload : Step.Location);
  const [location, setLocation] = useState<ImportLocation | null>(
    NewCollections
  );
  const [permission, setPermission] = useState(defaultPermission);

  const isNewCollections = location === NewCollections;
  const canSubmit = step === Step.Upload ? canContinue : !!location;

  const handleBack = () => {
    setStep(Step.Upload);
  };

  const handleContinue = () => {
    if (step === Step.Upload) {
      setStep(Step.Location);
      return;
    }
    if (!location) {
      return;
    }
    onStart(
      location === NewCollections
        ? { destination: null, permission }
        : { destination: location }
    );
  };

  const handlePermissionChange = (
    value: CollectionPermission | typeof EmptySelectValue
  ) => {
    setPermission(value === EmptySelectValue ? undefined : value);
  };

  return (
    <Container column gap={12} $fixedHeight={step === Step.Location}>
      {step === Step.Upload && upload}
      {step === Step.Location && (
        <>
          <ImportRootPicker defaultValue={location} onChange={setLocation} />
          <div>
            {isNewCollections ? (
              <InputSelectPermission
                value={permission}
                onChange={handlePermissionChange}
                disabled={isSubmitting || !isNewCollections}
                help={t(
                  "Set the default permission level for collections created from the import"
                )}
              />
            ) : null}
          </div>
        </>
      )}
      <Footer justify="flex-end" gap={8}>
        {upload && step === Step.Location && (
          <Button neutral disabled={isSubmitting} onClick={handleBack}>
            {t("Back")}
          </Button>
        )}
        <Button disabled={!canSubmit || isSubmitting} onClick={handleContinue}>
          {isSubmitting
            ? submittingLabel
            : step === Step.Upload
              ? t("Continue")
              : t("Import")}
        </Button>
      </Footer>
    </Container>
  );
}

// Matches the content height of the document move dialog, which is the height
// of the explorer list plus its search input and footer.
const Container = styled(Flex)<{ $fixedHeight: boolean }>`
  --import-steps-height: calc(65vh + 76px);
  min-height: var(--import-steps-height);
  height: ${(props) =>
    props.$fixedHeight ? "var(--import-steps-height)" : "auto"};

  ${breakpoint("tablet")`
    --import-steps-height: max(calc(40vh + 76px), 340px);
  `}
`;

const Footer = styled(Flex)`
  flex-shrink: 0;
  margin-top: auto;
`;
