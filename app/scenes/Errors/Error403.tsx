import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import { navigateToHome } from "~/actions/definitions/navigation";
import { HStack } from "~/components/primitives/HStack";
import { VStack } from "~/components/primitives/VStack";
import Loading from "~/scenes/Document/components/Loading";
import { client } from "~/utils/ApiClient";

type Props = {
  /** The document ID to request access to. */
  documentId?: string;
};

const Error403 = ({ documentId }: Props) => {
  const { t } = useTranslation();
  const location = useLocation<{ title?: string }>();
  const history = useHistory();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(!!documentId);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    const checkRequested = async () => {
      try {
        const request = await client.post("/accessRequests.info", {
          documentId,
        });
        setRequested(request?.data?.status === "pending");
      } catch {
        // No pending request or error — leave as not requested
      } finally {
        setLoading(false);
      }
    };

    void checkRequested();
  }, [documentId]);

  const handleRequestAccess = useCallback(async () => {
    if (!documentId || requesting || requested) {
      return;
    }

    setRequesting(true);
    try {
      await client.post("/accessRequests.create", { documentId });
      setRequested(true);
      toast.success(t("Access request sent"));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRequesting(false);
    }
  }, [documentId, t, requested, requesting]);

  const handleGoBack = useCallback(() => history.goBack(), [history]);

  if (loading) {
    return <Loading location={location} />;
  }

  return (
    <Scene title={t("No access to this doc")}>
      <Heading>{t("No access to this doc")}</Heading>
      <VStack spacing={20} style={{ maxWidth: 500 }} align="initial">
        {requested ? (
          <Empty size="large">
            {t(
              "Your request to access this document has been sent. You will be notified once access is granted."
            )}{" "}
          </Empty>
        ) : (
          <Empty size="large">
            {t(
              "It doesn't look like you have permission to access this document. You can request access."
            )}
          </Empty>
        )}
        <HStack gap={8}>
          {documentId && (
            <Button
              onClick={handleRequestAccess}
              disabled={requesting || requested}
              neutral={requesting || requested}
            >
              {requested
                ? t("Access requested")
                : requesting
                  ? t("Requesting…")
                  : t("Request access")}
            </Button>
          )}
          <Button action={navigateToHome} hideIcon neutral={!!documentId}>
            {t("Home")}
          </Button>
          <Button onClick={handleGoBack} neutral>
            {t("Go back")}
          </Button>
        </HStack>
      </VStack>
    </Scene>
  );
};

export default Error403;
