import { endOfDay } from "date-fns";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { ApiKeyValidation } from "@shared/validations";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import InputSelect, { Option } from "~/components/InputSelect";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import { dateToExpiry } from "~/utils/date";
import "react-day-picker/dist/style.css";
import ExpiryDatePicker from "./components/ExpiryDatePicker";
import { ExpiryType, calculateExpiryDate } from "./utils";

type Props = {
  onSubmit: () => void;
};

function ApiKeyNew({ onSubmit }: Props) {
  const [name, setName] = React.useState("");
  const [expiryType, setExpiryType] = React.useState<ExpiryType>(
    ExpiryType.Week
  );
  const currentDate = React.useRef<Date>(new Date());
  const [expiryAt, setExpiryAt] = React.useState<Date | undefined>(() =>
    calculateExpiryDate(currentDate.current, expiryType)
  );
  const [isSaving, setIsSaving] = React.useState(false);

  const { apiKeys } = useStores();
  const { t } = useTranslation();
  const userLocale = useUserLocale();

  const submitDisabled =
    isSaving || !name || (!expiryAt && expiryType !== ExpiryType.NoExpiration);

  const expiryOptions = React.useMemo<Option[]>(
    () =>
      Object.values(ExpiryType).map((value) => ({
        label: value,
        value,
      })),
    []
  );

  const handleNameChange = React.useCallback((event) => {
    setName(event.target.value);
  }, []);

  const handleExpiryTypeChange = React.useCallback((value: string) => {
    const expiry = value as ExpiryType;
    setExpiryType(expiry);
    setExpiryAt(calculateExpiryDate(currentDate.current, expiry));
  }, []);

  const handleSelectCustomDate = React.useCallback((date: Date) => {
    setExpiryAt(endOfDay(date));
  }, []);

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);

      try {
        await apiKeys.create({
          name,
          expiryAt: expiryAt?.toISOString(),
        });
        toast.success(t("API Key created"));
        onSubmit();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [t, name, expiryAt, onSubmit, apiKeys]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Text as="p" type="secondary">
        {t(
          `Name your key something that will help you to remember it's use in the future, for example "local development" or "continuous integration".`
        )}
      </Text>
      <Flex column>
        <Input
          type="text"
          label={t("Name")}
          onChange={handleNameChange}
          value={name}
          minLength={ApiKeyValidation.minNameLength}
          maxLength={ApiKeyValidation.maxNameLength}
          required
          autoFocus
          flex
        />
        <Flex align="center" gap={16}>
          <StyledExpirySelect
            ariaLabel={t("API key expiry")}
            label={t("Expiration")}
            value={expiryType}
            options={expiryOptions}
            onChange={handleExpiryTypeChange}
            skipBodyScroll={true}
          />
          {expiryType === ExpiryType.Custom ? (
            <ExpiryDatePicker
              selectedDate={expiryAt}
              onSelect={handleSelectCustomDate}
            />
          ) : (
            <StyledExpiryText type="secondary" size="small">
              {expiryAt
                ? `${dateToExpiry(expiryAt.toString(), t, userLocale)}.`
                : t("Never expires!")}
            </StyledExpiryText>
          )}
        </Flex>
      </Flex>
      <Flex justify="flex-end">
        <Button type="submit" disabled={submitDisabled}>
          {isSaving ? `${t("Creating")}…` : t("Create")}
        </Button>
      </Flex>
    </form>
  );
}

const StyledExpirySelect = styled(InputSelect)`
  width: 150px;
`;

const StyledExpiryText = styled(Text)`
  position: relative;
  top: 4px;
`;

export default ApiKeyNew;
