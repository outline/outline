// @flow
import { sortBy } from 'lodash';
import naturalSort from 'natural-sort';

export default (sortableArray: Object[], key: string) => {
  if (!sortableArray) return [];

  let keys = sortableArray.map(object => object[key]);
  keys.sort(naturalSort());
  return sortBy(sortableArray, object => keys.indexOf(object[key]));
};
