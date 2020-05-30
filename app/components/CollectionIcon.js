// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { invert, getLuminance } from 'polished';
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
import UiStore from 'stores/UiStore';

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
  ui: UiStore,
};

function ResolvedCollectionIcon({ collection, expanded, size, ui }: Props) {
  // If the chosen icon color is very dark then we invert it in dark mode
  // otherwise it will be impossible to see against the dark background.
  const color =
    ui.resolvedTheme === 'dark'
      ? getLuminance(collection.color) > 0.1
        ? collection.color
        : invert(collection.color)
      : collection.color;

  if (collection.icon) {
    const Component = icons[collection.icon];
    return <Component color={color} size={size} />;
  } else if (collection.private) {
    return (
      <PrivateCollectionIcon color={color} expanded={expanded} size={size} />
    );
  }

  return <CollectionIcon color={color} expanded={expanded} size={size} />;
}

export default inject('ui')(observer(ResolvedCollectionIcon));
