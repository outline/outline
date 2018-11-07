// flow-typed signature: 1b39d667486345a987ed0a37e2ce3601
// flow-typed version: 79f2090f89/redis_v2.x.x/flow_>=v0.34.x

/* This module definition is by no means complete. A lot of methods of the RedisClient class are missing */

declare type $npm$redis$SetCallbackAllOk = (error: ?Error, result: 'OK') => void

declare type $npm$redis$SetCallback = (error: ?Error, result: ?'OK') => void

declare type $npm$redis$SetStandard = (
  key: string,
  value: string,
  callback?: $npm$redis$SetCallbackAllOk
) => void

declare type $npm$redis$SetWithCondition = (
  key: string,
  value: string,
  condition: 'NX' | 'XX',
  callback?: $npm$redis$SetCallbackAllOk
) => void

declare type $npm$redis$SetWithExpire = (
  key: string,
  value: string,
  expire: 'EX' | 'PX',
  time: number,
  callback?: $npm$redis$SetCallbackAllOk
) => void

declare type $npm$redis$SetWithExpireAndConditionBefore = (
  key: string,
  value: string,
  condition: 'NX' | 'XX',
  expire: 'EX' | 'PX',
  time: number,
  callback?: $npm$redis$SetCallback // When using XX or NX the result may be null
) => void

declare type $npm$redis$SetWithExpireAndConditionAfter = (
  key: string,
  value: string,
  expire: 'EX' | 'PX',
  time: number,
  condition: 'NX' | 'XX',
  callback?: $npm$redis$SetCallback // When using XX or NX the result may be null
) => void

declare type $npm$redis$SetF = $npm$redis$SetStandard
  & $npm$redis$SetWithExpire
  & $npm$redis$SetWithCondition
  & $npm$redis$SetWithExpireAndConditionBefore
  & $npm$redis$SetWithExpireAndConditionAfter

declare type $npm$redis$DelCallback = (error: ?Error, numRemoved: number) => void

declare type $npm$redis$DelWithArrayKeys =  (
  keys: Array<string>,
  callback?: $npm$redis$DelCallback
) => void

declare type $npm$redis$DelWithRestKeys =  (
  ...keys: Array<string>
) => void

declare type $npm$redis$DelWithRestKeys1 =  (
  key: string,
  callback: $npm$redis$DelCallback
) => void

declare type $npm$redis$DelWithRestKeys2 =  (
  key1: string,
  key2: string,
  callback: $npm$redis$DelCallback
) => void

declare type $npm$redis$DelWithRestKeys3 =  (
  key1: string,
  key2: string,
  key3: string,
  callback: $npm$redis$DelCallback
) => void

declare type $npm$redis$DelWithRestKeys4 =  (
  key1: string,
  key2: string,
  key3: string,
  key4: string,
  callback: $npm$redis$DelCallback
) => void

declare type $npm$redis$DelWithRestKeys5 =  (
  key1: string,
  key2: string,
  key3: string,
  key4: string,
  key5: string,
  callback: $npm$redis$DelCallback
) => void

declare type $npm$redis$DelF = $npm$redis$DelWithArrayKeys
  & $npm$redis$DelWithRestKeys
  & $npm$redis$DelWithRestKeys1
  & $npm$redis$DelWithRestKeys2
  & $npm$redis$DelWithRestKeys3
  & $npm$redis$DelWithRestKeys4
  & $npm$redis$DelWithRestKeys5

declare module "redis" {
  declare class RedisClient extends events$EventEmitter mixins RedisClientPromisified {
    connected: boolean,
    hmset: (
      key: string,
      map: {[key: string]: string},
      callback?: (error: ?Error) => void
    ) => void;
    rpush: (
      key: string,
      value: string,
      callback?: (error: ?Error) => void
    ) => void;
    lpush: (
      key: string,
      value: string,
      callback?: (error: ?Error, newLength: number) => void
    ) => void;
    lrem: (
      topic: string,
      count: number,
      value: string,
      callback?: (error: ?Error, entries: number) => void
    ) => void;
    lrange: (
      topic: string,
      cursor: number,
      cursor2: number,
      callback: (error: ?Error, entries: Array<string>) => void
    ) => void;
    llen: (
      key: string,
      callback: (error: ?Error, length: number) => void
    ) => void;
    hset: (
      topic: string,
      key: string,
      value: string,
      callback?: (error: ?Error, result: (0 | 1)) => void
    ) => void;
    hget: (
      topic: string,
      key: string,
      value: string,
      callback: (error: ?Error, result: ?string) => void
    ) => void;
    hgetall: (
      topic: string,
      callback: (error: ?Error, result: {[key: string]: string}) => void
    ) => void;
    hdel: (
      topic: string,
      key: string,
      callback?: (error: ?Error, numRemoved: number) => void
    ) => void;
    get: (
      key: string,
      callback: (error: ?Error, value: ?string) => void
    ) => void;
    set: $npm$redis$SetF;
    setex: (
      key: string,
      timeout: number,
      value: string,
      callback?: (error: ?Error, result: 'OK') => void
    ) => void;
    ttl: (
      key: string,
      callback: (error: ?Error, ttl: number) => void
    ) => void;
    del: $npm$redis$DelF;
    mget: (
      keys: Array<string>,
      callback: (error: ?Error, values: Array<?string>) => void
    ) => void;
    mset: (
      keysAndValues: Array<string>,
      callback?: (error: ?Error, result: 'OK') => void
    ) => void;
    rpoplpush: (
      source: string,
      destination: string,
      callback?: (error: ?Error, result: string) => void
    ) => void;
    flushall: (
      callback?: (error: ?Error, result: 'OK') => void
    ) => void;
    publish: (
      topic: string,
      value: any,
      callback?: (error: ?Error, numReceivers: number) => void
    ) => void;
    subscribe: (topic: string) => void;
    unsubscribe: (topic: string) => void;
    psubscribe: (pattern: string) => void;
    punsubscribe: (pattern: string) => void;
    duplicate: () => RedisClient;
    end: (flush: boolean) => void;
    quit: () => void;
    keys: (
      pattern: string,
      callback?: (error: ?Error, keys: string[]) => void
    ) => void;
    expire: (
      key: string,
      timeout: number,
      callback?: (error: ?Error, timeoutWasSet: number) => void
    ) => void;
    incr: (
      key: string,
      callback: (error: ?Error, result: ?number) => void
    ) => void;
    incrby: (
      key: string,
      increment: number,
      callback: (error: ?Error, result: ?number) => void
    ) => void;
    incrbyfloat: (
      key: string,
      increment: number,
      callback: (error: ?Error, result: ?string) => void
    ) => void;
    decr: (
      key: string,
      callback: (error: ?Error, result: ?number) => void
    ) => void;
    decrby: (
      key: string,
      decrement: number,
      callback: (error: ?Error, result: ?number) => void
    ) => void;
    hincrby: (
      key: string,
      field: string,
      increment: number,
      callback: (error: ?Error, result: ?number) => void
    ) => void;
    hincrbyfloat: (
      key: string,
      field: string,
      increment: number,
      callback: (error: ?Error, result: ?string) => void
    ) => void;
  }

  declare class RedisClientPromisified extends RedisClient {
    hmsetAsync: (
      key: string,
      map: {[key: string]: string},
      callback: (?Error) => void
    ) => Promise<void>;
    rpushAsync: (
      key: string,
      value: string,
      callback: (?Error) => void
    ) => Promise<void>;
    lpushAsync: (key: string, value: any) => Promise<void>;
    lremAsync: (
      topic: string,
      cursor: number,
      value: string
    ) => Promise<Array<string>> | Promise<void>;
    lrangeAsync: (
      topic: string,
      cursor: number,
      cursor2: number
    ) => Promise<Array<string>>;
    mgetAsync: (
      keys: Array<string>
    ) => Promise<Array<?string>>;
    msetAsync: (
      keysAndValues: Array<string>,
    ) => Promise<string>;
    hsetAsync: (topic: string, key: string, value: string) => Promise<number>;
    hgetAsync: (topic: string, key: string) => Promise<string> | Promise<void>;
    hgetallAsync: (
      topic: string,
    ) => Promise<{[key: string]: string}> | Promise<void>;
    hdelAsync: (topic: string, key: string) => Promise<number>;
    getAsync: (key: string) => Promise<any>;
    setAsync: (key: string, value: any) => Promise<void>;
    delAsync: (...keys: Array<string>) => Promise<void>;
    rpoplpushAsync: (
      source: string,
      destination: string
    ) => Promise<string> | Promise<void>;
    flushallAsync: () => Promise<void>;
    publishAsync: (topic: string, value: any) => Promise<void>;
    subscribeAsync: (topic: string) => Promise<void>;
    unsubscribeAsync: (topic: string) => Promise<void>;
    psubscribeAsync: (pattern: string) => Promise<void>;
    punsubscribeAsync: (pattern: string) => Promise<void>;
    duplicateAsync: () => Promise<RedisClientPromisified>;
    endAsync: (flush: boolean) => Promise<void>;
    quitAsync: () => Promise<void>;
    keysAsync: (pattern: string) => Promise<string[]>;
    expireAsync: (key: string, timeout: number) => Promise<number>;
    setexAsync: (key: string, timeout: number, value: string) => Promise<string>;
  }

  declare type CreateOptions = {
    host?: string,
    port?: number,
    path?: string,
    url?: string,
    parser?: "javascript" | "hiredis",
    string_numbers?: boolean,
    return_buffers?: boolean,
    detect_buffers?: boolean,
    socket_keepalive?: boolean,
    no_ready_check?: boolean,
    enable_offline_queue?: boolean,
    retry_max_delay?: ?number,
    connect_timeout?: number,
    max_attempts?: number,
    retry_unfulfilled_commands?: boolean,
    password?: string,
    db?: number,
    family?: "IPv4" | "IPv6",
    disable_resubscribing?: boolean,
    rename_commands?: { [name: string]: string },
    tls?: Object,
    prefix?: string,
    retry_strategy?: (options: {
      attempt: number,
      total_retry_time: number,
      error: Error,
      times_connected: number
    }) => any
  };

  declare type CreateClient = ((
    port: number,
    host?: string,
    options?: CreateOptions
  ) => RedisClient) &
    ((port: number, options?: CreateOptions) => RedisClient) &
    ((socketOrUrl: string, options?: CreateOptions) => RedisClient) &
    ((options?: CreateOptions) => RedisClient);

  declare module.exports: {
    RedisClient: typeof RedisClient,
    RedisClientPromisified: typeof RedisClientPromisified,
    createClient: CreateClient
  };
}
