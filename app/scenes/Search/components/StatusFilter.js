// @flow
import * as React from 'react';
import FilterOptions from './FilterOptions';

const options = [
  {
    key: undefined,
    label: 'Active documents',
    note: 'Documents in collections you are able to access',
  },
  {
    key: 'true',
    label: 'All documents',
    note: 'Include documents that are in the archive',
  },
];

type Props = {
  includeArchived: boolean,
  onSelect: (key: ?string) => void,
};

const StatusFilter = ({ includeArchived, onSelect }: Props) => {
  return (
    <FilterOptions
      options={options}
      activeKey={includeArchived ? 'true' : undefined}
      onSelect={onSelect}
      defaultLabel="Active documents"
    />
  );
};

export default StatusFilter;
