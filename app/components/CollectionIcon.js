// @flow
import * as React from 'react';
import {
  PrivateCollectionIcon,
  CollectionIcon,
  AcademicCapIcon,
  BeakerIcon,
  BuildingBlocksIcon,
  CloudIcon,
  CodeIcon,
  EyeIcon,
  PadlockIcon,
  PaletteIcon,
  MoonIcon,
  SunIcon,
} from 'outline-icons';
import Collection from 'models/Collection';

const icons = {
  collection: CollectionIcon,
  academicCap: AcademicCapIcon,
  beaker: BeakerIcon,
  buildingBlocks: BuildingBlocksIcon,
  cloud: CloudIcon,
  code: CodeIcon,
  eye: EyeIcon,
  padlock: PadlockIcon,
  palette: PaletteIcon,
  moon: MoonIcon,
  sun: SunIcon,
};

type Props = {
  collection: Collection,
  expanded?: boolean,
  size?: number,
};

export default function ResolvedCollectionIcon({
  collection,
  expanded,
  size,
}: Props) {
  if (collection.icon) {
    const Component = icons[collection.icon];
    return <Component color={collection.color} size={size} />;
  } else if (collection.private) {
    return (
      <PrivateCollectionIcon
        color={collection.color}
        expanded={expanded}
        size={size}
      />
    );
  }

  return (
    <CollectionIcon color={collection.color} expanded={expanded} size={size} />
  );
}
