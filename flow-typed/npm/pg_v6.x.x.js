// flow-typed signature: 054aac13189fe3a826a6d6c3a5952f6c
// flow-typed version: 14df781cee/pg_v6.x.x/flow_>=v0.28.x

declare module pg {
  // Note: Currently There are some issues in Function overloading.
  // https://github.com/facebook/flow/issues/2423
  // So i temporarily remove the
  // `((event: string, listener: Function) => EventEmitter );`
  // from all overloading for EventEmitter.on().

  // `any` types exised in this file, cause of currently `mixed` did not work well
  // in Function Overloading.

  // `Function` types exised in this file, cause of they come from another
  // untyped npm lib.

  /* Cause of <flow 0.36 did not support export type very well,
  // so copy the types from pg-pool
  // https://github.com/flowtype/flow-typed/issues/16
  // https://github.com/facebook/flow/commit/843389f89c69516506213e298096a14867a45061
  const Pool = require('pg-pool');
  import type {
    PgPoolConfig,
    PoolConnectCallback,
    DoneCallback,
    PoolClient
  } from 'pg-pool';
  */

  // ------------- copy from 'pg-pool' ------------>>
  /*
   * PgPoolConfig's properties are passed unchanged to both
   * the node-postgres Client constructor and the node-pool constructor
   * allowing you to fully configure the behavior of both
   * node-pool (https://github.com/coopernurse/node-pool)
  */
  declare type PgPoolConfig = {
    // node-pool ----------------
    name: string,
    create: Function,
    destroy: Function,
    max: number,
    min: number,
    refreshIdle: boolean,
    idleTimeoutMillis: number,
    reapIntervalMillis: number,
    returnToHead: boolean,
    priorityRange: number,
    validate: Function,
    validateAsync: Function,
    log: Function,

    // node-postgres Client ------
    //database user's name
    user: string,
    //name of database to connect
    database: string,
    //database user's password
    password: string,
    //database port
    port: number,
    // database host. defaults to localhost
    host?: string,
    // whether to try SSL/TLS to connect to server. default value: false
    ssl?: boolean,
    // name displayed in the pg_stat_activity view and included in CSV log entries
    // default value: process.env.PGAPPNAME
    application_name?: string,
    // fallback value for the application_name configuration parameter
    // default value: false
    fallback_application_name?: string,

    // pg-pool
    Client: mixed,
    Promise: mixed,
    onCreate: Function,
  };

  /*
   * Not extends from Client, cause some of Client's functions(ex: connect and end)
   * should not be used by PoolClient (which returned from Pool.connect).
  */
  declare type PoolClient = {
    release(error?: mixed): void,

    query:
    ( (query: QueryConfig|string, callback?: QueryCallback) => Query ) &
    ( (text: string, values: Array<any>, callback?: QueryCallback) => Query ),

    on:
    ((event: 'drain', listener: () => void) => events$EventEmitter )&
    ((event: 'error', listener: (err: PG_ERROR) => void) => events$EventEmitter )&
    ((event: 'notification', listener: (message: any) => void) => events$EventEmitter )&
    ((event: 'notice', listener: (message: any) => void) => events$EventEmitter )&
    ((event: 'end', listener: () => void) => events$EventEmitter ),
  }

  declare type PoolConnectCallback = (error: PG_ERROR|null,
    client: PoolClient|null, done: DoneCallback) => void;
  declare type DoneCallback = (error?: mixed) => void;
  // https://github.com/facebook/flow/blob/master/lib/node.js#L581
  // on() returns a events$EventEmitter
  declare class Pool extends events$EventEmitter {
    constructor(options: $Shape<PgPoolConfig>, Client?: Class<Client>): void;
    connect(cb?: PoolConnectCallback): Promise<PoolClient>;
    take(cb?: PoolConnectCallback): Promise<PoolClient>;
    end(cb?: DoneCallback): Promise<void>;

  // Note: not like the pg's Client, the Pool.query return a Promise,
  // not a Thenable Query which Client returned.
  // And there is a flow(<0.34) issue here, when Array<mixed>,
  // the overloading will not work
    query:
    ( (query: QueryConfig|string, callback?: QueryCallback) => Promise<ResultSet> ) &
    ( (text: string, values: Array<any>, callback?: QueryCallback) => Promise<ResultSet>);

    /* flow issue: https://github.com/facebook/flow/issues/2423
     * When this fixed, this overloading can be used.
    */
    /*
      on:
      ((event: 'connect', listener: (client: PoolClient) => void) => events$EventEmitter )&
      ((event: 'acquire', listener: (client: PoolClient) => void) => events$EventEmitter )&
      ((event: "error", listener: (err: PG_ERROR) => void) => events$EventEmitter )&
      ((event: string, listener: Function) => events$EventEmitter);
    */
  }

  // <<------------- copy from 'pg-pool' ------------------------------


  // error
  declare type PG_ERROR = {
    name: string,
    length: number,
    severity: string,
    code: string,
    detail: string|void,
    hint: string|void,
    position: string|void,
    internalPosition: string|void,
    internalQuery: string|void,
    where: string|void,
    schema: string|void,
    table: string|void,
    column: string|void,
    dataType: string|void,
    constraint: string|void,
    file: string|void,
    line: string|void,
    routine: string|void
  };

  declare type ClientConfig = {
    //database user's name
    user?: string,
    //name of database to connect
    database?: string,
    //database user's password
    password?: string,
    //database port
    port?: number,
    // database host. defaults to localhost
    host?: string,
    // whether to try SSL/TLS to connect to server. default value: false
    ssl?: boolean,
    // name displayed in the pg_stat_activity view and included in CSV log entries
    // default value: process.env.PGAPPNAME
    application_name?: string,
    // fallback value for the application_name configuration parameter
    // default value: false
    fallback_application_name?: string,
  }

  declare type Row = {
    [key: string]: mixed,
  };
  declare type ResultSet = {
    command: string,
    rowCount: number,
    oid: number,
    rows: Array<Row>,
  };
  declare type ResultBuilder = {
    command: string,
    rowCount: number,
    oid: number,
    rows: Array<Row>,
    addRow: (row: Row) => void,
  };
  declare type QueryConfig = {
    name?: string,
    text: string,
    values?: any[],
  };

  declare type QueryCallback = (err: PG_ERROR|null, result: ResultSet|void) => void;
  declare type ClientConnectCallback = (err: PG_ERROR|null, client: Client|void) => void;

  /*
   * lib/query.js
   * Query extends from EventEmitter in source code.
   * but in Flow there is no multiple extends.
   * And in Flow await is a `declare function $await<T>(p: Promise<T> | T): T;`
   * seems can not resolve a Thenable's value type directly
   * so `Query extends Promise` to make thing temporarily work.
   * like this:
   * const q = client.query('select * from some');
   * q.on('row',cb); // Event
   * const result = await q; // or await
   *
   * ToDo: should find a better way.
  */
  declare class Query extends Promise<ResultSet> {
    then<U>(
      onFulfill?: ?((value: ResultSet) => Promise<U> | U),
      onReject?: ?((error: PG_ERROR) => Promise<U> | U)
    ): Promise<U>;
    // Because then and catch return a Promise,
    // .then.catch will lose catch's type information PG_ERROR.
    catch<U>(
      onReject?: ?((error: PG_ERROR) => Promise<U> | U)
    ): Promise<U>;

    on :
    ((event: 'row', listener: (row: Row, result: ResultBuilder) => void) => events$EventEmitter )&
    ((event: 'end', listener: (result: ResultBuilder) => void) => events$EventEmitter )&
    ((event: 'error', listener: (err: PG_ERROR) => void) => events$EventEmitter );
  }

  /*
   * lib/client.js
   * Note: not extends from EventEmitter, for This Type returned by on().
   * Flow's EventEmitter force return a EventEmitter in on().
   * ToDo: Not sure in on() if return events$EventEmitter or this will be more suitable
   * return this will restrict event to given literial when chain on().on().on().
   * return a events$EventEmitter will fallback to raw EventEmitter, when chains
  */
  declare class Client {
    constructor(config?: string | ClientConfig): void;
    connect(callback?: ClientConnectCallback):void;
    end(): void;

    escapeLiteral(str: string): string;
    escapeIdentifier(str: string): string;

    query:
    ( (query: QueryConfig|string, callback?: QueryCallback) => Query ) &
    ( (text: string, values: Array<any>, callback?: QueryCallback) => Query );

    on:
    ((event: 'drain', listener: () => void) => this )&
    ((event: 'error', listener: (err: PG_ERROR) => void) => this )&
    ((event: 'notification', listener: (message: any) => void) => this )&
    ((event: 'notice', listener: (message: any) => void) => this )&
    ((event: 'end', listener: () => void) => this );
  }

  /*
   * require('pg-types')
  */
  declare type TypeParserText = (value: string) => any;
  declare type TypeParserBinary = (value: Buffer) => any;
  declare type Types = {
    getTypeParser:
      ((oid: number, format?: 'text') => TypeParserText )&
      ((oid: number, format: 'binary') => TypeParserBinary );

    setTypeParser:
      ((oid: number, format?: 'text', parseFn: TypeParserText) => void )&
      ((oid: number, format: 'binary', parseFn: TypeParserBinary) => void)&
      ((oid: number, parseFn: TypeParserText) => void),
  }

  /*
   * lib/index.js ( class PG)
  */
  declare class PG extends events$EventEmitter {
    types: Types;
    Client: Class<Client>;
    Pool: Class<Pool>;
    Connection: mixed; //Connection is used internally by the Client.
    constructor(client: Client): void;
    native: { // native binding, have the same capability like PG
      types: Types;
      Client: Class<Client>;
      Pool: Class<Pool>;
      Connection: mixed;
    };
  // The end(),connect(),cancel() in PG is abandoned ?
  }

  // These class are not exposed by pg.
  declare type PoolType = Pool;
  declare type PGType = PG;
  declare type QueryType = Query;
  // module export, keep same structure with index.js
  declare module.exports: PG;
}
