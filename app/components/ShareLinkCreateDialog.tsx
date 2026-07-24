import { differenceInCalendarDays, endOfDay } from "date-fns";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { ShareTypes } from "@shared/types";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import type Share from "~/models/Share";
import ExpiryDatePicker from "~/scenes/ApiKeyNew/components/ExpiryDatePicker";
import {
  calculateExpiryDate,
  ExpiryType,
  ExpiryValues,
} from "~/scenes/ApiKeyNew/utils";
import { dateToExpiry } from "~/utils/date";
import Switch from "./Switch";
import { InputSelect, type Option } from "./InputSelect";
import { HStack } from "./primitives/HStack";

interface Props {
  share?: Share;
  onSubmit: () => void;
}

type ShareTargetType = "document" | "collection";

interface FormData {
  title: string;
  targetType: ShareTargetType;
  targetId: string | undefined;
  expiresAt: Date | undefined;
  expiryType: ExpiryType;
  published: boolean;
  includeChildren: boolean;
}

export function ShareLinkCreateDialog({ share, onSubmit }: Props) {
  const { t } = useTranslation();
  const userLocale = useUserLocale();
  const { shares, documents, collections } = useStores();

  const defaultValues = React.useMemo<FormData>(
    () => ({
      title: share?.title ?? "",
      targetType: share?.documentId ? "document" : "collection",
      targetId: share?.documentId ?? share?.collectionId,
      expiresAt: share?.expiresAt ? new Date(share.expiresAt) : undefined,
      expiryType: getExpiryType(share?.expiresAt),
      published: share?.published ?? false,
      includeChildren: share?.includeChildDocuments ?? false,
    }),
    [
      share?.collectionId,
      share?.documentId,
      share?.expiresAt,
      share?.includeChildDocuments,
      share?.published,
      share?.title,
    ]
  );

  const { register, control, getValues, reset, setValue, watch } =
    useForm<FormData>({
      mode: "all",
      defaultValues,
    });

  React.useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const [documentOptions, setDocumentOptions] = React.useState<Option[]>([]);
  const [collectionOptions, setCollectionOptions] = React.useState<Option[]>(
    []
  );

  const targetTypeOptions = React.useMemo<Option[]>(
    () => [
      { type: "item", label: t("Document"), value: "document" },
      { type: "item", label: t("Collection"), value: "collection" },
    ],
    [t]
  );

  React.useEffect(() => {
    const getDocumentOptions = async () => {
      const shareable = await documents.fetchCanShare();
      const options = shareable.map(({ id, title, collectionId }) => {
        const collectionName = collectionId
          ? collections.find({ id: collectionId })?.name
          : undefined;

        return {
          value: id,
          type: "item" as const,
          label: title || t("Untitled"),
          description: collectionName,
        };
      });
      setDocumentOptions(options);
    };

    void getDocumentOptions();
  }, [collections, documents, t]);

  React.useEffect(() => {
    const getCollectionOptions = async () => {
      const shareable = await collections.fetchCanShare();
      const options = shareable.map(({ id, name }) => ({
        value: id,
        label: name,
        type: "item" as const,
      }));
      setCollectionOptions(options);
    };

    void getCollectionOptions();
  }, [collections]);

  const isEditing = !!share;
  const selectedTargetType = watch("targetType");
  const selectedTargetId = watch("targetId");
  const expiresAt = watch("expiresAt");
  const expiryType = watch("expiryType");

  const expiryOptions = React.useMemo<Option[]>(
    () =>
      [...ExpiryValues.entries()].map(([expType, { label }]) => ({
        type: "item",
        label,
        value: expType,
      })),
    []
  );

  const handleTargetTypeChange = React.useCallback(
    (value: string) => {
      const nextType = value as ShareTargetType;
      setValue("targetType", nextType);
      setValue("targetId", undefined);
    },
    [setValue]
  );

  const handleTargetChange = React.useCallback(
    (value: string) => {
      setValue("targetId", value);
    },
    [setValue]
  );

  const handleExpiryTypeChange = React.useCallback(
    (value: string) => {
      const selectedType = value as ExpiryType;
      setValue("expiryType", selectedType);

      if (selectedType === ExpiryType.NoExpiration) {
        setValue("expiresAt", undefined);
        return;
      }

      if (selectedType === ExpiryType.Custom) {
        return;
      }

      const nextExpiry = calculateExpiryDate(new Date(), selectedType);
      setValue("expiresAt", nextExpiry);
    },
    [setValue]
  );

  const handleSelectCustomDate = React.useCallback(
    (date: Date) => {
      const selected = endOfDay(date);
      setValue("expiryType", ExpiryType.Custom);
      setValue("expiresAt", selected);
    },
    [setValue]
  );

  const handleSubmit = React.useCallback(async () => {
    const {
      expiresAt: formExpiresAt,
      includeChildren,
      published,
      targetId,
      targetType,
      title,
    } = getValues();

    const expiresAt = formExpiresAt?.toISOString() ?? null;
    const titleValue = title.trim() || null;

    try {
      if (share) {
        await share.save({
          expiresAt,
          title: titleValue,
          published,
          includeChildDocuments: includeChildren,
        });
      } else if (targetType === "document") {
        const targetDocument = documents.get(targetId ?? "");
        if (!targetDocument) {
          toast.error(t("Please choose a document"));
          return false;
        }

        await shares.create({
          type: ShareTypes.Private,
          targetType: "document",
          documentId: targetDocument.id,
          published: true,
          expiresAt,
          title: titleValue,
          includeChildDocuments: includeChildren,
        });
      } else {
        const targetCollection = collections.get(targetId ?? "");
        if (!targetCollection) {
          toast.error(t("Please choose a collection"));
          return false;
        }

        await shares.create({
          type: ShareTypes.Private,
          targetType: "collection",
          collectionId: targetCollection.id,
          published: true,
          expiresAt,
          title: titleValue,
          includeChildDocuments: includeChildren,
        });
      }

      onSubmit();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("Something went wrong")
      );
      return false;
    }
  }, [collections, documents, getValues, onSubmit, share, shares, t]);

  const submitText = share ? t("Save link") : t("Create link");

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={submitText}
      disabled={!share && !selectedTargetId}
    >
      <Text as="p" type="secondary">
        {!share &&
          t("Create a private link to share specific collections or documents")}
      </Text>

      <Input
        label={t("Link title")}
        placeholder={t("Optional title to identify this link")}
        maxLength={255}
        {...register("title")}
      />

      {!isEditing && (
        <>
          <Text as="h3" weight="bold" style={{ marginTop: 16 }}>
            {t("Share target")}
          </Text>
          <HStack align="center" spacing={8}>
            <StyledTargetTypeSelect
              options={targetTypeOptions}
              value={selectedTargetType}
              onChange={handleTargetTypeChange}
              label={t("Target type")}
              labelHidden
              short
            />
            <StyledTargetSelect
              options={
                selectedTargetType === "document"
                  ? documentOptions
                  : collectionOptions
              }
              value={selectedTargetId}
              onChange={handleTargetChange}
              label={
                selectedTargetType === "document"
                  ? t("Document")
                  : t("Collection")
              }
              labelHidden
            />
          </HStack>
        </>
      )}

      {isEditing && (
        <Text type="secondary" size="small">
          {t("Editing an existing share link")}
        </Text>
      )}

      <Text as="h3" weight="bold" style={{ marginTop: 16, marginBottom: -5 }}>
        {t("Link expiration")}
      </Text>
      <HStack align="center" spacing={8} style={{ marginBottom: 20 }}>
        <StyledExpirySelect
          options={expiryOptions}
          value={expiryType}
          onChange={handleExpiryTypeChange}
          label={t("Expiration")}
          labelHidden
        />
        {expiryType === ExpiryType.Custom ? (
          <ExpiryDatePicker
            selectedDate={expiresAt}
            onSelect={handleSelectCustomDate}
          />
        ) : (
          <Text type="secondary" size="small" style={{ marginTop: 12 }}>
            {expiresAt
              ? `${dateToExpiry(expiresAt.toISOString(), t, userLocale)}.`
              : `${t("Never expires")}.`}
          </Text>
        )}
      </HStack>
      <Controller
        control={control}
        name="includeChildren"
        render={({ field }) => (
          <Switch
            label={t("Include Child Documents")}
            checked={field.value}
            onChange={field.onChange}
          />
        )}
      />
      {share && (
        <Controller
          control={control}
          name="published"
          render={({ field }) => (
            <Switch
              label={t("Published")}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      )}
    </ConfirmationDialog>
  );
}

function getExpiryType(expiresAt?: string | null): ExpiryType {
  if (!expiresAt) {
    return ExpiryType.NoExpiration;
  }

  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiry = differenceInCalendarDays(expiry, now);

  if (daysUntilExpiry <= 7) {
    return ExpiryType.Week;
  }
  if (daysUntilExpiry <= 30) {
    return ExpiryType.Month;
  }
  if (daysUntilExpiry <= 60) {
    return ExpiryType.TwoMonths;
  }
  if (daysUntilExpiry <= 90) {
    return ExpiryType.ThreeMonths;
  }

  return ExpiryType.Custom;
}

const StyledExpirySelect = styled(InputSelect)`
  width: 170px;
  margin-bottom: 0;
  margin-top: 12px;
`;

const StyledTargetTypeSelect = styled(InputSelect)`
  width: 160px;
  margin-bottom: 0;
`;

const StyledTargetSelect = styled(InputSelect)`
  flex: 1;
  margin-bottom: 0;
`;
