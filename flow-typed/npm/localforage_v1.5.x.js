// flow-typed signature: 37b164ad4c10b3c89887d1fd5b7ca096
// flow-typed version: 9c854fa980/localforage_v1.5.x/flow_>=v0.25.x

type PartialConfig = {
  driver?: string | Array<string>,
  name?: string,
  size?: number,
  storeName?: string,
  version?: string,
  description?: string,
};

type Driver = {
  _driver: string,
  _initStorage(config: PartialConfig): void,

  getItem<T>(
    key: string,
    successCallback?: (err?: Error, value?: T) => mixed,
  ): ?Promise<?T>,
  setItem<T>(
    key: string,
    value: T,
    successCallback?: (err?: Error, value?: T) => mixed,
  ): ?Promise<T>,
  removeItem(
    key: string,
    successCallback?: (err?: Error) => mixed,
  ): ?Promise<void>,
  clear(successCallback?: ?(numberOfKeys: number) => mixed): ?Promise<number>,
  length(successCallback?: (numberOfKeys: number) => mixed): ?Promise<number>,
  key(
    keyIndex: number,
    successCallback?: (keyName: string) => mixed,
  ): ?Promise<string>,
  keys(
    successCallback?: (keyNames: Array<string>) => mixed,
  ): ?Promise<Array<string>>,
};

type localforageInstance = {
  INDEXEDDB: 'asyncStorage',
  WEBSQL: 'webSQLStorage',
  LOCALSTORAGE: 'localStorageWrapper',

  getItem<T>(
    key: string,
    successCallback?: (err?: Error, value?: T) => mixed,
  ): Promise<?T>,
  setItem<T>(
    key: string,
    value: T,
    successCallback?: (err?: Error, value?: T) => mixed,
  ): Promise<T>,
  removeItem(
    key: string,
    successCallback?: (err?: Error) => mixed,
  ): Promise<void>,
  clear(successCallback?: ?(numberOfKeys: number) => mixed): Promise<number>,
  length(successCallback?: (numberOfKeys: number) => mixed): Promise<number>,
  key(
    keyIndex: number,
    successCallback?: (keyName: string) => mixed,
  ): Promise<string>,
  keys(
    successCallback?: (keyNames: Array<string>) => mixed,
  ): Promise<Array<string>>,
  iterate<T>(
    iteratorCallback: (value: T, key: string, iterationNumber: number) => mixed,
    successCallback?: (result: void | [string, T]) => mixed,
  ): Promise<void | [string, T]>,
  setDriver(driverNames: string | Array<string>): void,
  config(config?: PartialConfig): boolean | PartialConfig,
  defineDriver(driver: Driver): void,
  driver(): string,
  ready(): Promise<void>,
  supports(driverName: string): boolean,
  createInstance(config?: PartialConfig): localforageInstance,
  dropInstance(config?: PartialConfig): Promise<void>,
};

declare module 'localforage' {
  declare module.exports: localforageInstance;
}
