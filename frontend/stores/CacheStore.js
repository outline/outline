import _ from 'lodash';
import { action, toJS } from 'mobx';

const CACHE_STORE = 'CACHE_STORE';

class CacheStore {
  cache = {};

  /* Computed */

  get asJson() {
    return JSON.stringify({
      cache: this.cache,
    });
  }

  /* Actions */

  @action cacheWithId = (id, data) => {
    this.cache[id] = toJS(data);
    _.defer(() => localStorage.setItem(CACHE_STORE, this.asJson));
  };

  @action cacheList = data => {
    data.forEach(item => this.cacheWithId(item.id, item));
  };

  @action fetchFromCache = id => {
    return this.cache[id];
  };

  constructor() {
    // Rehydrate
    const data = JSON.parse(localStorage.getItem(CACHE_STORE) || '{}');
    this.cache = data.cache || {};
  }
}

export default CacheStore;
export { CACHE_STORE };
