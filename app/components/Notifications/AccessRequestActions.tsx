import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { DocumentPermission } from "@shared/types";
import type Notification from "~/models/Notification";
import { client } from "~/utils/ApiClient";
import Button from "../Button";
import Flex from "../Flex";
import { SplitButton } from "../primitives/SplitButton";

type Props = {
  notification: Notification;
};

function AccessRequestActions({ notification }: Props) {
  const { t } = useTranslation();
  const [processing, setProcessing] = React.useState(false);
  const [selectedPermission, setSelectedPermission] =
    React.useState<DocumentPermission>(DocumentPermission.Read);

  const permissionOptions = React.useMemo(
    () => [
      {
        label: t("View only"),
        value: DocumentPermission.Read,
        description: t("Can view the document"),
      },
      {
        label: t("Can edit"),
        value: DocumentPermission.ReadWrite,
        description: t("Can view and edit the document"),
      },
      {
        label: t("Manage"),
        value: DocumentPermission.Admin,
        description: t("Full access including sharing"),
      },
    ],
    [t]
  );

  const selectedLabel = permissionOptions.find(
    (o) => o.value === selectedPermission
  )?.label;

  const handleApprove = React.useCallback(async () => {
    if (!notification.actor || processing) {
      return;
    }

    setProcessing(true);
    try {
      await client.post("/accessRequests.approve", {
        id: notification.accessRequestId,
        permission: selectedPermission,
      });
      notification.accessRequestStatus = "approved";
      toast.success(
        t(`Permissions for {{ userName }} updated`, {
          userName: notification.actor?.name,
        })
      );
      void notification.markAsRead();
    } catch {
      toast.error(t("Failed to approve access request"));
    } finally {
      setProcessing(false);
    }
  }, [notification, processing, selectedPermission, t]);

  const handleDismiss = React.useCallback(async () => {
    if (processing) {
      return;
    }

    setProcessing(true);
    try {
      await client.post("/accessRequests.dismiss", {
        id: notification.accessRequestId,
      });
      notification.accessRequestStatus = "dismissed";
      toast.success(t("Access request dismissed"));
      void notification.markAsRead();
    } catch {
      toast.error(t("Failed to dismiss access request"));
    } finally {
      setProcessing(false);
    }
  }, [notification, processing, t]);

  const handleContainerClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <Container gap={8} align="center" onClick={handleContainerClick}>
      <Button onClick={handleDismiss} disabled={processing} neutral>
        {t("Dismiss")}
      </Button>
      <SplitButton
        options={permissionOptions}
        selectedValue={selectedPermission}
        onSelect={(value) => setSelectedPermission(value as DocumentPermission)}
        onClick={handleApprove}
        disabled={processing}
      >
        {t("Approve")} · {selectedLabel}
      </SplitButton>
    </Container>
  );
}

const Container = styled(Flex)`
  margin-top: 8px;
  flex-wrap: wrap;
`;

export default observer(AccessRequestActions);
