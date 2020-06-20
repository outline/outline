// @flow
import * as React from "react";
import FilterOptions from "./FilterOptions";

const options = [
  { key: undefined, label: "Any time" },
  { key: "day", label: "Past day" },
  { key: "week", label: "Past week" },
  { key: "month", label: "Past month" },
  { key: "year", label: "Past year" },
];

type Props = {
  dateFilter: ?string,
  onSelect: (key: ?string) => void,
};

const DateFilter = ({ dateFilter, onSelect }: Props) => {
  return (
    <FilterOptions
      options={options}
      activeKey={dateFilter}
      onSelect={onSelect}
      defaultLabel="Any time"
    />
  );
};

export default DateFilter;
