// flow-typed signature: 1a33220ead1c6b6e3205a55b2a2ec3a0
// flow-typed version: 18b7d8b101/koa_v2.x.x/flow_>=v0.47.x

/*
 * Type def from from source code of koa.
 * this: https://github.com/koajs/koa/commit/08eb1a20c3975230aa1fe1c693b0cd1ac7a0752b
 * previous: https://github.com/koajs/koa/commit/fabf5864c6a5dca0782b867a263b1b0825a05bf9
 * 
 * Changelog
 * breaking: remove unused app.name
 * breaking: ctx.throw([status], [msg], [properties]) (caused by http-errors (#957) )
**/
declare module 'koa' {
  // Currently, import type doesnt work well ?
  // so copy `Server` from flow/lib/node.js#L820
  declare class Server extends net$Server {
    listen(port?: number, hostname?: string, backlog?: number, callback?: Function): Server,
    listen(path: string, callback?: Function): Server,
    listen(handle: Object, callback?: Function): Server,
    close(callback?: Function): Server,
    maxHeadersCount: number,
    setTimeout(msecs: number, callback: Function): Server,
    timeout: number,
  }
  declare type ServerType = Server;

  declare type JSON = | string | number | boolean | null | JSONObject | JSONArray;
  declare type JSONObject = { [key: string]: JSON };
  declare type JSONArray = Array<JSON>;

  declare type SimpleHeader = {
    'set-cookie'?: Array<string>,
    [key: string]: string,
  };

  declare type RequestJSON = {
    'method': string,
    'url': string,
    'header': SimpleHeader,
  };
  declare type RequestInspect = void|RequestJSON;
  declare type Request = {
    app: Application,
    req: http$IncomingMessage,
    res: http$ServerResponse,
    ctx: Context,
    response: Response,

    fresh: boolean,
    header: SimpleHeader,
    headers: SimpleHeader, // alias as header
    host: string,
    hostname: string,
    href: string,
    idempotent: boolean,
    ip: string,
    ips: string[],
    method: string,
    origin: string,
    originalUrl: string,
    path: string,
    protocol: string,
    query: {[key: string]: string}, // always string
    querystring: string,
    search: string,
    secure: boolean, // Shorthand for ctx.protocol == "https" to check if a request was issued via TLS.
    socket: net$Socket,
    stale: boolean,
    subdomains: string[],
    type: string,
    url: string,

    charset: string|void,
    length: number|void,

//  Those functions comes from https://github.com/jshttp/accepts/blob/master/index.js
//  request.js$L445
//  https://github.com/jshttp/accepts/blob/master/test/type.js
    accepts: ((args: string[]) => string|false)&
    // ToDo: There is an issue https://github.com/facebook/flow/issues/3009
    // if you meet some error here, temporarily add an additional annotation
    // like: `request.accepts((['json', 'text']:Array<string>))` to fix it.
    ((arg: string, ...args: string[]) => string|false) &
    ( () => string[] ) , // return the old value.

//  https://github.com/jshttp/accepts/blob/master/index.js#L153
//  https://github.com/jshttp/accepts/blob/master/test/charset.js
    acceptsCharsets: ( (args: string[]) => buffer$Encoding|false)&
    // ToDo: https://github.com/facebook/flow/issues/3009
    // if you meet some error here, see L70.
    ( (arg: string, ...args: string[]) => buffer$Encoding|false ) &
    ( () => string[] ),

//  https://github.com/jshttp/accepts/blob/master/index.js#L119
//  https://github.com/jshttp/accepts/blob/master/test/encoding.js
    acceptsEncodings: ( (args: string[]) => string|false)&
    // ToDo: https://github.com/facebook/flow/issues/3009
    // if you meet some error here, see L70.
    ( (arg: string, ...args: string[]) => string|false ) &
    ( () => string[] ),

//  https://github.com/jshttp/accepts/blob/master/index.js#L185
//  https://github.com/jshttp/accepts/blob/master/test/language.js
    acceptsLanguages: ( (args: string[]) => string|false) &
    // ToDo: https://github.com/facebook/flow/issues/3009
    // if you meet some error here, see L70.
    ( (arg: string, ...args: string[]) => string|false ) &
    ( () => string[] ),

    get: (field: string) => string,

/* https://github.com/jshttp/type-is/blob/master/test/test.js
* Check if the incoming request contains the "Content-Type"
* header field, and it contains any of the give mime `type`s.
* If there is no request body, `null` is returned.
* If there is no content type, `false` is returned.
* Otherwise, it returns the first `type` that matches.
*/
    is: ( (args: string[]) => null|false|string)&
    ( (arg: string, ...args: string[]) => null|false|string ) &
    ( () => string ), // should return the mime type

    toJSON: () => RequestJSON,
    inspect: () => RequestInspect,

    [key: string]: mixed, // props added by middlewares.
  };

  declare type ResponseJSON = {
    'status': mixed,
    'message': mixed,
    'header': mixed,
  };
  declare type ResponseInspect = {
    'status': mixed,
    'message': mixed,
    'header': mixed,
    'body': mixed,
  };
  declare type Response = {
    app: Application,
    req: http$IncomingMessage,
    res: http$ServerResponse,
    ctx: Context,
    request: Request,

    // docs/api/response.md#L113.
    body: string|Buffer|stream$Stream|Object|Array<mixed>|null, // JSON contains null
    etag: string,
    header: SimpleHeader,
    headers: SimpleHeader, // alias as header
    headerSent: boolean,
    // can be set with string|Date, but get with Date.
    // set lastModified(v: string|Date), // 0.36 doesn't support this.
    lastModified: Date,
    message: string,
    socket: net$Socket,
    status: number,
    type: string,
    writable: boolean,

    // charset: string,  // doesn't find in response.js
    length: number|void,

    append: (field: string, val: string | string[]) => void,
    attachment: (filename?: string) => void,
    get: (field: string) => string,
    // https://github.com/jshttp/type-is/blob/master/test/test.js
    // https://github.com/koajs/koa/blob/v2.x/lib/response.js#L382
    is: ( (arg: string[]) => false|string) &
    ( (arg: string, ...args: string[]) => false|string ) &
    ( () => string ), // should return the mime type
    redirect: (url: string, alt?: string) => void,
    remove: (field: string) => void,
    // https://github.com/koajs/koa/blob/v2.x/lib/response.js#L418
    set: ((field: string, val: string | string[]) => void)&
      ((field: {[key: string]: string | string[]}) => void),

    vary: (field: string) => void,

    // https://github.com/koajs/koa/blob/v2.x/lib/response.js#L519
    toJSON(): ResponseJSON,
    inspect(): ResponseInspect,

    [key: string]: mixed, // props added by middlewares.
  }

  declare type ContextJSON = {
    request: RequestJSON,
    response: ResponseJSON,
    app: ApplicationJSON,
    originalUrl: string,
    req: '<original node req>',
    res: '<original node res>',
    socket: '<original node socket>',
  };
  // https://github.com/pillarjs/cookies
  declare type CookiesSetOptions = {
    maxAge: number, // milliseconds from Date.now() for expiry
    expires: Date, //cookie's expiration date (expires at the end of session by default).
    path: string, //  the path of the cookie (/ by default).
    domain: string, // domain of the cookie (no default).
    secure: boolean, // false by default for HTTP, true by default for HTTPS
    httpOnly: boolean, //  a boolean indicating whether the cookie is only to be sent over HTTP(S),
    // and not made available to client JavaScript (true by default).
    signed: boolean, // whether the cookie is to be signed (false by default)
    overwrite: boolean, //  whether to overwrite previously set cookies of the same name (false by default).
  };
  declare type Cookies = {
    get: (name: string, options?: {signed: boolean}) => string|void,
    set: ((name: string, value: string, options?: CookiesSetOptions) => Context)&
    // delete cookie (an outbound header with an expired date is used.)
    ( (name: string) => Context),
  };
  // The default props of context come from two files
  // `application.createContext` & `context.js`
  declare type Context = {
    accept: $PropertyType<Request, 'accept'>,
    app: Application,
    cookies: Cookies,
    name?: string, // ?
    originalUrl: string,
    req: http$IncomingMessage,
    request: Request,
    res: http$ServerResponse,
    respond?: boolean, // should not be used, allow bypassing koa application.js#L193
    response: Response,
    state: Object,

    // context.js#L55
    assert: (test: mixed, status: number, message?: string, opts?: mixed) => void,
    // context.js#L107
    // if (!(err instanceof Error)) err = new Error(`non-error thrown: ${err}`);
    onerror: (err?: mixed) => void,
    // context.md#L88
    throw: ( status: number, msg?: string, opts?: Object) => void,
    toJSON(): ContextJSON,
    inspect(): ContextJSON,

    // ToDo: add const for some props,
    // while the `const props` feature of Flow is landing in future
    // cherry pick from response
    attachment: $PropertyType<Response, 'attachment'>,
    redirect: $PropertyType<Response, 'redirect'>,
    remove: $PropertyType<Response, 'remove'>,
    vary: $PropertyType<Response, 'vary'>,
    set: $PropertyType<Response, 'set'>,
    append: $PropertyType<Response, 'append'>,
    flushHeaders: $PropertyType<Response, 'flushHeaders'>,
    status: $PropertyType<Response, 'status'>,
    message: $PropertyType<Response, 'message'>,
    body: $PropertyType<Response, 'body'>,
    length: $PropertyType<Response, 'length'>,
    type: $PropertyType<Response, 'type'>,
    lastModified: $PropertyType<Response, 'lastModified'>,
    etag: $PropertyType<Response, 'etag'>,
    headerSent: $PropertyType<Response, 'headerSent'>,
    writable: $PropertyType<Response, 'writable'>,

    // cherry pick from request
    acceptsLanguages: $PropertyType<Request, 'acceptsLanguages'>,
    acceptsEncodings: $PropertyType<Request, 'acceptsEncodings'>,
    acceptsCharsets: $PropertyType<Request, 'acceptsCharsets'>,
    accepts: $PropertyType<Request, 'accepts'>,
    get: $PropertyType<Request, 'get'>,
    is: $PropertyType<Request, 'is'>,
    querystring: $PropertyType<Request, 'querystring'>,
    idempotent: $PropertyType<Request, 'idempotent'>,
    socket: $PropertyType<Request, 'socket'>,
    search: $PropertyType<Request, 'search'>,
    method: $PropertyType<Request, 'method'>,
    query: $PropertyType<Request, 'query'>,
    path: $PropertyType<Request, 'path'>,
    url: $PropertyType<Request, 'url'>,
    origin: $PropertyType<Request, 'origin'>,
    href: $PropertyType<Request, 'href'>,
    subdomains: $PropertyType<Request, 'subdomains'>,
    protocol: $PropertyType<Request, 'protocol'>,
    host: $PropertyType<Request, 'host'>,
    hostname: $PropertyType<Request, 'hostname'>,
    header: $PropertyType<Request, 'header'>,
    headers: $PropertyType<Request, 'headers'>,
    secure: $PropertyType<Request, 'secure'>,
    stale: $PropertyType<Request, 'stale'>,
    fresh: $PropertyType<Request, 'fresh'>,
    ips: $PropertyType<Request, 'ips'>,
    ip: $PropertyType<Request, 'ip'>,

    [key: string]: any, // props added by middlewares.
  }

  declare type Middleware =
    (ctx: Context, next: () => Promise<void>) => Promise<void>|void;
  declare type ApplicationJSON = {
    'subdomainOffset': mixed,
    'proxy': mixed,
    'env': string,
  };
  declare class Application extends events$EventEmitter {
    context: Context,
    // request handler for node's native http server.
    callback: () => (req: http$IncomingMessage, res: http$ServerResponse) => void,
    env: string,
    keys?: Array<string>|Object, // https://github.com/crypto-utils/keygrip
    middleware: Array<Middleware>,
    proxy: boolean, // when true proxy header fields will be trusted
    request: Request,
    response: Response,
    server: Server,
    subdomainOffset: number,

    listen: $PropertyType<Server, 'listen'>,
    toJSON(): ApplicationJSON,
    inspect(): ApplicationJSON,
    use(fn: Middleware): this,
  }

  declare module.exports: Class<Application>;
}
