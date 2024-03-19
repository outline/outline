import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import { GlobeIcon, WarningIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import { PAGINATION_SYMBOL } from "~/stores/base/Store";
import Share from "~/models/Share";
import Fade from "~/components/Fade";
import Heading from "~/components/Heading";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import SharesTable from "./components/SharesTable";

function Shares() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { shares, auth } = useStores();
  const canShareDocuments = auth.team && auth.team.sharing;
  const can = usePolicy(team);
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = React.useState<Share[]>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const [shareIds, setShareIds] = React.useState<string[]>([]);
  const params = useQuery();
  const query = params.get("query") || "";
  const sort = params.get("sort") || "createdAt";
  const direction = (params.get("direction") || "desc").toUpperCase() as
    | "ASC"
    | "DESC";
  const page = parseInt(params.get("page") || "0", 10);
  const limit = 25;

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        const response = await shares.fetchPage({
          offset: page * limit,
          limit,
          sort,
          direction,
        });
        setTotalPages(Math.ceil(response[PAGINATION_SYMBOL].total / limit));
        setShareIds(response.map((u: Share) => u.id));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [query, sort, page, direction, shares]);

  React.useEffect(() => {
    // sort the resulting data by the original order from the server
    setData(
      sortBy(
        shares.orderedData.filter((item) => shareIds.includes(item.id)),
        (item) => shareIds.indexOf(item.id)
      )
    );
  }, [shares.orderedData, shareIds]);

  return (
    <Scene title={t("Shared Links")} icon={<GlobeIcon />} wide>
      <Heading>{t("Shared Links")}</Heading>

      {can.update && !canShareDocuments && (
        <>
          <Notice icon={<WarningIcon />}>
            {t("Sharing is currently disabled.")}{" "}
            <Trans
              defaults="You can globally enable and disable public document sharing in the <em>security settings</em>."
              components={{
                em: <Link to="/settings/security" />,
              }}
            />
          </Notice>
          <br />
        </>
      )}

      <Text as="p" type="secondary">
        <Trans>
          Documents that have been shared are listed below. Anyone that has the
          public link can access a read-only version of the document until the
          link has been revoked.
        </Trans>
      </Text>

      {data.length ? (
        <Fade>
          <SharesTable
            data={data}
            canManage={can.update}
            isLoading={isLoading}
            page={page}
            pageSize={limit}
            totalPages={totalPages}
            defaultSortDirection="ASC"
          />
        </Fade>
      ) : null}
    </Scene>
  );
}

export default observer(Shares);
