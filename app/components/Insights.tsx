import { useTranslation } from "react-i18next";
import Empty from "~/components/Empty";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { StatusChip } from "~/components/StatusChip";
import { useShop } from "~/stores/shop";

interface Props {
  /** How many to show; the rest stay on the list behind them. */
  limit?: number;
}

/**
 * What the records say is worth attention.
 *
 * These are worked out from the shop's own data by explicit rules – there is
 * no model behind them. Each one names the record it came from so a reader
 * can go and check rather than take it on trust.
 *
 * @returns the rendered insights list.
 */
export function Insights({ limit }: Props) {
  const { t } = useTranslation();
  const insights = useShop((state) => state.insights);
  const shown = limit ? insights.slice(0, limit) : insights;

  return (
    <>
      <Subheading>
        {t("Worth a look")} · {insights.length}
      </Subheading>
      {shown.map((insight) => (
        <ListItem
          key={insight.id}
          title={insight.title}
          subtitle={insight.description}
          actions={
            <>
              <StatusChip status={insight.severity} />
              <Text type="tertiary" size="small">
                {t(insight.module)}
              </Text>
            </>
          }
          border
        />
      ))}
      {insights.length === 0 ? (
        <Empty>{t("Nothing needs attention.")}</Empty>
      ) : null}
    </>
  );
}
