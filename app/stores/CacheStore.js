// @flow
import localForage from 'localforage';

class CacheStore {
  key: string;
  version: number = 1;

  cacheKey = (key: string): string => {
    return `CACHE_${this.key}_${this.version}_${key}`;
  };

  getItem = (key: string): any => {
    return localForage.getItem(this.cacheKey(key));
  };

  setItem = (key: string, value: any): any => {
    return localForage.setItem(this.cacheKey(key), value);
  };

  removeItem = (key: string) => {
    return localForage.removeItem(this.cacheKey(key));
  };

  constructor(cacheKey: string) {
    this.key = cacheKey;
  }
}

export default CacheStore;
