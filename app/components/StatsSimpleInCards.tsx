import styled from "styled-components";
import { s } from "@shared/styles";
import Text from "~/components/Text";

/** One figure on the card row. */
export interface StatCard {
  name: string;
  stat: string;
  /** A quieter line under the figure, e.g. what it is out of. */
  hint?: string;
}

interface Props {
  /** The figures to show; the sample is used when none is given. */
  stats?: StatCard[];
  /** Heading above the row; omitted when not given. */
  title?: string;
}

/**
 * Column counts, spelled out.
 *
 * Tailwind only emits classes it can see in the source, so these cannot be
 * built by joining strings at runtime.
 */
const COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

const Card = styled.div`
  overflow: hidden;
  border-radius: 8px;
  padding: 20px 16px;
  background: ${s("backgroundSecondary")};
  border: 1px solid ${s("divider")};
`;

const Figure = styled.dd`
  margin: 4px 0 0;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: ${s("text")};
`;

const Label = styled.dt`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const sampleStats: StatCard[] = [
  { name: "Total Subscribers", stat: "71,897" },
  { name: "Avg. Open Rate", stat: "58.16%" },
  { name: "Avg. Click Rate", stat: "24.57%" },
];

/**
 * Tailwind UI – stats: simple in cards.
 *
 * @returns the rendered component.
 */
export function StatsSimpleInCards({ stats, title }: Props = {}) {
  const shown = stats ?? sampleStats;

  return (
    <div>
      {title === undefined || title ? (
        <Text as="h3" weight="bold">
          {title ?? "Last 30 days"}
        </Text>
      ) : null}
      <dl
        className={`grid grid-cols-1 gap-5 ${
          COLUMNS[Math.min(4, shown.length)] ?? COLUMNS[3]
        } ${title === "" ? "" : "mt-5"}`}
      >
        {shown.map((item) => (
          <Card key={item.name}>
            <Label>
              <Text type="secondary" size="small" weight="bold">
                {item.name}
              </Text>
            </Label>
            <Figure>{item.stat}</Figure>
            {item.hint ? (
              <dd style={{ margin: "4px 0 0" }}>
                <Text type="tertiary" size="small">
                  {item.hint}
                </Text>
              </dd>
            ) : null}
          </Card>
        ))}
      </dl>
    </div>
  );
}
