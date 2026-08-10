import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import { formatCurrency } from "~/utils/format";

/** One line's sales. */
export interface Seller {
  name: string;
  units: number;
  revenue: number;
}

interface Props {
  sellers: Seller[];
  /** How many to show. */
  limit?: number;
}

const Row = styled(Flex)`
  padding: 6px 0;
`;

const Track = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: ${s("backgroundSecondary")};
  overflow: hidden;
`;

const Fill = styled.div<{ $share: number }>`
  width: ${(props) => Math.max(2, props.$share * 100)}%;
  height: 100%;
  background: ${s("accent")};
  opacity: 0.7;
`;

/**
 * What is selling, as bars against the best seller.
 *
 * Bars are drawn relative to the top line rather than to a fixed scale, so
 * the comparison is between the products rather than against a number nobody
 * chose.
 *
 * @returns the rendered list.
 */
export function TopSellers({ sellers, limit = 5 }: Props) {
  const { t } = useTranslation();
  // Anything fully returned nets to nothing and is not worth a row.
  const selling = sellers.filter((seller) => seller.units > 0);
  const shown = selling.slice(0, limit);
  const best = shown[0]?.units ?? 0;

  if (shown.length === 0) {
    return <Empty>{t("Nothing has sold yet.")}</Empty>;
  }

  return (
    <>
      {shown.map((seller) => (
        <Row key={seller.name} align="center" gap={8}>
          <Text size="small" style={{ minWidth: 160 }}>
            {seller.name}
          </Text>
          <Track>
            <Fill $share={best === 0 ? 0 : seller.units / best} />
          </Track>
          <Text size="small" type="tertiary" style={{ minWidth: 130 }}>
            {seller.units} {seller.units === 1 ? t("sold") : t("sold")} ·{" "}
            {formatCurrency(seller.revenue)}
          </Text>
        </Row>
      ))}
    </>
  );
}
