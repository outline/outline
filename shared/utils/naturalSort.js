// @flow

import _ from 'lodash';
import naturalSort from 'natural-sort';

export default (sortableArray: Object[], key: string) => {
  let keys = sortableArray.map(object => object[key]);
  keys.sort(naturalSort());
  return _.sortBy(sortableArray, object => keys.indexOf(object[key]));
};
