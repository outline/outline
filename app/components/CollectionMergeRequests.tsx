import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { s } from "@shared/styles";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { Avatar, AvatarSize } from "~/components/Avatar";

type MergeRequest = {
  id: string;
  newCollectionName: string;
  sourceCollectionIds: string[];
  status: "pending" | "approved" | "rejected" | "completed";
  approvals: Record<string, { userId: string; approvedAt: string }>;
  rejections: Record<string, { userId: string; rejectedAt: string; reason?: string }>;
  requestedBy?: { id: string; name: string; avatarUrl?: string };
  createdAt: string;
};

const RequestItem = styled.div`
  padding: 12px;
  border: 1px solid ${s("inputBorder")};
  border-radius: 4px;
  margin-bottom: 8px;
`;

type Props = {
  collectionId?: string;
};

function CollectionMergeRequests({ collectionId }: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { collections } = useStores();
  const [requests, setRequests] = React.useState<MergeRequest[]>([]);

  const { loading, request: fetchRequests } = useRequest(
    React.useCallback(async () => {
      const res = await client.post("/collections.mergeRequest.list", {
        status: collectionId ? undefined : "pending",
      });
      setRequests(res.data.data || []);
    }, [collectionId])
  );

  React.useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: string, collectionId: string) => {
    try {
      await client.post("/collections.mergeRequest.approve", {
        requestId,
        collectionId,
      });
      toast.success(t("Merge request approved"));
      void fetchRequests();
    } catch (err: any) {
      toast.error(err?.message || t("Failed to approve merge request"));
    }
  };

  const handleReject = async (
    requestId: string,
    collectionId: string,
    reason?: string
  ) => {
    try {
      await client.post("/collections.mergeRequest.reject", {
        requestId,
        collectionId,
        reason,
      });
      toast.success(t("Merge request rejected"));
      void fetchRequests();
    } catch (err: any) {
      toast.error(err?.message || t("Failed to reject merge request"));
    }
  };

  const handleExecute = async (requestId: string) => {
    try {
      await client.post("/collections.mergeRequest.execute", {
        requestId,
      });
      toast.success(t("Collections merged successfully"));
      void fetchRequests();
      // Reload collections to reflect changes
      await collections.fetchAll();
    } catch (err: any) {
      toast.error(err?.message || t("Failed to execute merge"));
    }
  };

  // Filter requests relevant to this collection or user
  const relevantRequests = React.useMemo(() => {
    if (collectionId) {
      return requests.filter((req) =>
        req.sourceCollectionIds.includes(collectionId)
      );
    }
    // Show requests where user is owner of at least one collection
    return requests.filter((req) => {
      return req.sourceCollectionIds.some((id) => {
        const collection = collections.get(id);
        return collection?.createdBy?.id === user.id;
      });
    });
  }, [requests, collectionId, collections, user.id]);

  if (loading) {
    return <Text>{t("Loading merge requests")}…</Text>;
  }

  if (relevantRequests.length === 0) {
    return (
      <Text type="secondary">{t("No pending merge requests")}</Text>
    );
  }

  return (
    <Flex column gap={16}>
      <Heading>{t("Merge Requests")}</Heading>
      {relevantRequests.map((request) => {
        // Find collections where user is owner
        const userOwnedCollections = request.sourceCollectionIds.filter(
          (id) => {
            const collection = collections.get(id);
            return collection?.createdBy?.id === user.id;
          }
        );

        const isApproved = request.status === "approved";
        const isPending = request.status === "pending";
        const hasUserOwnedCollections = userOwnedCollections.length > 0;

        return (
          <RequestItem key={request.id}>
            <Flex column gap={8}>
              <Flex justify="space-between" align="center">
                <Flex column gap={4}>
                  <Text weight="bold">{request.newCollectionName}</Text>
                  {request.requestedBy && (
                    <Flex gap={4} align="center">
                      <Avatar
                        model={request.requestedBy}
                        size={AvatarSize.Small}
                      />
                      <Text size="small" type="secondary">
                        {t("Requested by {{name}}", {
                          name: request.requestedBy.name,
                        })}
                      </Text>
                    </Flex>
                  )}
                </Flex>
                <Text size="small" type="secondary">
                  {new Date(request.createdAt).toLocaleDateString()}
                </Text>
              </Flex>

              <Text size="small" type="secondary">
                {t("Merging {{count}} collections", {
                  count: request.sourceCollectionIds.length,
                })}
              </Text>

              {isPending && hasUserOwnedCollections && (
                <Flex gap={8}>
                  <Button
                    onClick={() => {
                      // Approve for user's collections
                      for (const id of userOwnedCollections) {
                        void handleApprove(request.id, id);
                      }
                    }}
                  >
                    {t("Approve")}
                  </Button>
                  <Button
                    onClick={() => {
                      // Reject for user's collections
                      for (const id of userOwnedCollections) {
                        void handleReject(request.id, id);
                      }
                    }}
                    neutral
                  >
                    {t("Reject")}
                  </Button>
                </Flex>
              )}

              {isPending && !hasUserOwnedCollections && (
                <Text size="small" type="secondary">
                  {t("Waiting for owner approvals")}
                </Text>
              )}

              {isApproved && (
                <Button onClick={() => handleExecute(request.id)}>
                  {t("Execute merge")}
                </Button>
              )}

              {request.status === "rejected" && (
                <Text type="secondary">{t("Rejected")}</Text>
              )}
            </Flex>
          </RequestItem>
        );
      })}
    </Flex>
  );
}

export default observer(CollectionMergeRequests);
