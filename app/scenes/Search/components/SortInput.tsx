import type { DirectionFilter, SortFilter as TSortFilter } from "@shared/types";
import {
  DisclosureIcon,
  SortAscendingIcon,
  SortDescendingIcon,
} from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  /** The selected sort field */
  sort?: TSortFilter | null;
  /** The selected sort direction */
  direction?: DirectionFilter | null;
  /** Callback when a sort option is selected */
  onSelect: (sort: string, direction: string) => void;
};

export const SortInput = ({ sort, direction, onSelect }: Props) => {
  const { t } = useTranslation();
  const options = useMemo(
    () => [
      {
        key: "relevance-DESC",
        label: t("Relevance"),
        icon: <SortDescendingIcon size={20} />,
      },
      {
        key: "updatedAt-DESC",
        label: t("Recently updated"),
        icon: <SortDescendingIcon size={20} />,
      },
      {
        key: "updatedAt-ASC",
        label: t("Least recently updated"),
        icon: <SortAscendingIcon size={20} />,
      },
      {
        key: "createdAt-DESC",
        label: t("Newest"),
        icon: <SortDescendingIcon size={20} />,
      },
      {
        key: "createdAt-ASC",
        label: t("Oldest"),
        icon: <SortAscendingIcon size={20} />,
      },
      {
        key: "title-ASC",
        label: t("A → Z"),
        icon: <SortAscendingIcon size={20} />,
      },
      {
        key: "title-DESC",
        label: t("Z → A"),
        icon: <SortDescendingIcon size={20} />,
      },
    ],
    [t]
  );

  const selectedKey =
    sort && direction ? `${sort}-${direction}` : "relevance-DESC";

  const handleSelect = (key: string) => {
    const [sortField, sortDirection] = key.split("-");
    onSelect(sortField, sortDirection);
  };

  const selectedLabel =
    options.find((option) => option.key === selectedKey)?.label ??
    t("Relevance");

  return (
    <Wrapper>
      {t("Sorted by")}
      <FilterOptions
        showFilter={false}
        showIcons={false}
        options={options}
        selectedKeys={[selectedKey]}
        onSelect={handleSelect}
        defaultLabel={t("Sort")}
        trigger={
          <Trigger>
            {selectedLabel}
            <DisclosureIcon size={20} aria-hidden />
          </Trigger>
        }
      />
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: ${s("textSecondary")};
`;

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  margin: 0;
  padding: 0 0 0 2px;
  border: 0;
  border-radius: 4px;
  background: none;
  font: inherit;
  font-weight: 500;
  color: ${s("accent")};
  cursor: var(--pointer);

  &:hover,
  &[aria-expanded="true"] {
    text-decoration: underline;
  }
`;
