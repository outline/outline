import { zodResolver } from "@hookform/resolvers/zod";
import invariant from "invariant";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";
import Integration from "~/models/Integration";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { userDetailsUrl } from "../../shared/url";

const formData = z.object({
  url: z.string().url().startsWith("http"),
  apiKey: z.string().min(1),
});

type FormData = z.infer<typeof formData>;

type UserData = {
  id: string;
  email: string;
  displayName: string;
};

type ConnectionData = FormData & { user: UserData };

type Props = {
  onSubmit: () => void;
};

const ConnectForm = ({ onSubmit }: Props) => {
  const { t } = useTranslation();
  const { integrations } = useStores();
  const [connData, setConnData] = useState<ConnectionData>();
  const serverDataRef = useRef<FormData>({
    url: "",
    apiKey: "",
  });

  const getUserData = React.useCallback(async (data: FormData) => {
    serverDataRef.current = data;
    try {
      const url = userDetailsUrl({ serverUrl: data.url });
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data.apiKey}`,
        },
      });

      if (res.ok) {
        const userData = await res.json();
        setConnData({
          url: data.url,
          apiKey: data.apiKey,
          user: {
            id: userData.id,
            email: userData.email,
            displayName: userData.username,
          },
        });
      } else if (res.status >= 400 && res.status < 500) {
        toast.error(t("Invalid API key"));
      } else {
        toast.error(
          t("Server error - please check the url and network configuration")
        );
      }
    } catch (err) {
      toast.error(
        t("Server error - please check the url and network configuration")
      );
    }
  }, []);

  const saveConnectionData = React.useCallback(async (data: ConnectionData) => {
    try {
      const res = await client.post("/mattermost.connect", {
        url: data.url,
        apiKey: data.apiKey,
        user: {
          id: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
        },
      });
      runInAction(`create#${Integration.modelName}`, () => {
        invariant(res?.data, "Data should be available");
        integrations.add(res.data);
        integrations.addPolicies(res.policies);
      });
      toast.success(t("Mattermost connection successful"));
      onSubmit();
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  return connData ? (
    <AccountDetails
      connData={connData}
      saveDetails={saveConnectionData}
      backToServerDetails={() => setConnData(undefined)}
    />
  ) : (
    <ServerDetails
      serverData={serverDataRef.current}
      getUserData={getUserData}
    />
  );
};

const ServerDetails = ({
  serverData,
  getUserData,
}: {
  serverData: FormData;
  getUserData: (data: FormData) => Promise<void>;
}) => {
  const { t } = useTranslation();

  const { register, formState, handleSubmit } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      url: serverData.url,
      apiKey: serverData.apiKey,
    },
    resolver: zodResolver(formData),
  });

  return (
    <form onSubmit={handleSubmit(getUserData)}>
      <Text as="p" type="secondary">
        <Trans>
          Provide the URL where the Mattermost server is hosted and the API key
          of the account which will be used to perform actions on Mattermost.
        </Trans>
      </Text>
      <Input
        type="text"
        label={t("Server URL")}
        placeholder={t("Server URL")}
        autoComplete="off"
        autoFocus
        {...register("url")}
      />
      <Input
        type="text"
        label={t("API key")}
        placeholder={t("API key")}
        autoComplete="off"
        autoFocus
        {...register("apiKey")}
      />
      <Flex justify="flex-end">
        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isValid}
        >
          {formState.isSubmitting ? `${t("Verifying")}…` : t("Verify Account")}
        </Button>
      </Flex>
    </form>
  );
};

const AccountDetails = ({
  connData,
  saveDetails,
  backToServerDetails,
}: {
  connData: ConnectionData;
  saveDetails: (connData: ConnectionData) => Promise<void>;
  backToServerDetails: () => void;
}) => {
  const { t } = useTranslation();
  const { user } = connData;
  const [saving, setSaving] = React.useState(false);

  const handleSave = React.useCallback(async () => {
    setSaving(true);
    await saveDetails(connData);
    setSaving(false);
  }, []);

  return (
    <Flex column gap={12}>
      <div>
        <Text as="h3">Account details</Text>
        <Text as="p" type="secondary">
          <Trans>
            Please ensure that this account has access to create{" "}
            <Text weight="bold" type="secondary">
              incoming webhooks
            </Text>{" "}
            and{" "}
            <Text weight="bold" type="secondary">
              custom slash commands
            </Text>
            .
          </Trans>
        </Text>
      </div>
      <Flex justify="space-between">
        <UserDataItem title={t("Username")} value={user.displayName} />
        <UserDataItem title={t("Email")} value={user.email} />
      </Flex>
      <Flex justify="flex-end" gap={12} style={{ marginTop: "12px" }}>
        <Button neutral onClick={() => backToServerDetails()}>
          {t("Back")}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </Flex>
    </Flex>
  );
};

const UserDataItem = ({ title, value }: { title: string; value: string }) => (
  <Flex column gap={4}>
    <Text weight="bold">{title}</Text>
    <Text type="secondary">{value}</Text>
  </Flex>
);

export default observer(ConnectForm);
