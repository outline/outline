import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import ListItem from "~/components/List/Item";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
import { formatDate } from "~/utils/format";
/**
 * Who changed what.
 *
 * Entries are written from whether the data actually changed rather than from
 * a list of endpoints, so anything refused leaves no trace here.
 *
 * @returns the rendered audit page.
 */
function Audit() {
  const { t } = useTranslation();
  const fetchAll = useShop((state) => state.fetchAll);
  const audit = useShop((state) => state.audit);
  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);
  return (
    <Scene title={t("Activity")}>
      <Heading>{t("Activity")}</Heading>
      <Text as="p" type="secondary">
        {t("Every change made to the shop's records, and who made it.")}
      </Text>

      {audit.map((entry) => (
        <ListItem
          key={entry.id}
          title={entry.summary}
          subtitle={
            <>
              {entry.actor} · {t(entry.role)} · {formatDate(entry.at)}
            </>
          }
          actions={
            <Text type="tertiary" size="small">
              {entry.action}
            </Text>
          }
          border
        />
      ))}
      {audit.length === 0 ? (
        <Empty>{t("Nothing has been changed yet.")}</Empty>
      ) : null}
    </Scene>
  );
}
export default Audit;
