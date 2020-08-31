// flow-typed signature: a6917bccc2ed0addf099c12e33358113
// flow-typed version: c6154227d1/jsonwebtoken_v8.3.x/flow_>=v0.104.x

declare module "jsonwebtoken" {

  declare class JsonWebTokenError extends Error {
    name: string;
    message: string;
    inner: Error;
  }

  declare class TokenExpiredError extends Error {
    name: string;
    expiredAt: number;
    inner: Error;
  }

  declare class NotBeforeError extends Error {
    name: string;
    date: Date;
    inner: Error;
  }

  declare type Encodable = String | Buffer | Object;
  declare type Key = {
    key: string | Buffer,
    passphrase: string | Buffer,
    ...
  };
  declare type Algorithm =
    'RS256'
    | 'RS384'
    | 'RS512'
    | 'ES256'
    | 'ES384'
    | 'ES512'
    | 'HS256'
    | 'HS384'
    | 'HS512'
    | 'none';

  declare type SignCallback = (err: Error, token: string) => void;
  declare type SigningOptions<Headers> = $Shape<{
    algorithm: Algorithm,
    expiresIn: number | string,
    notBefore: number | string,
    audience: string | string[],
    issuer: string | string[],
    jwtid: string,
    subject: string,
    noTimestamp: boolean,
    header: Headers,
    keyid: string,
    ...
  }>;

  declare type SigningOptionsWithAlgorithm<H> = SigningOptions<H> & { algorithm: Algorithm, ... };

  declare type VerifyCallback = (err: JsonWebTokenError | NotBeforeError | TokenExpiredError | null, decoded: Payload) => void;
  declare type VerifyOptionsWithAlgorithm = VerifyOptions & { algorithms: Array<Algorithm>, ... };
  declare type VerifyOptions = $Shape<{
    algorithms: Array<Algorithm>,
    audience: string | string[],
    issuer: string | string[],
    ignoreExpiration: boolean,
    ignoreNotBefore: boolean,
    subject: string | string[],
    clockTolerance: number,
    maxAge: string | number,
    clockTimestamp: number,
    ...
  }>;

  declare type DecodingOptions = $Shape<{
    complete: boolean,
    json: boolean,
    ...
  }>;

  declare interface Sign {
    <P: Encodable>
    (payload: P, secretOrPrivateKey: string | Buffer): string;

    <P: Encodable>
    (payload: P, secretOrPrivateKey: string | Buffer, callback: SignCallback): string;

    <P: Encodable, H>
    (payload: P, secretOrPrivateKey: Key, options: SigningOptionsWithAlgorithm<H>): string;

    <P: Encodable, H>
    (payload: P, secretOrPrivateKey: string | Buffer, options: $Shape<SigningOptions<H>>): string;

    <P: Encodable, H>
    (payload: P, secretOrPrivateKey: string | Buffer, options: $Shape<SigningOptions<H>>, callback: SignCallback): string;

    <P: Encodable, H>
    (payload: P, secretOrPrivateKey: Key, options: SigningOptionsWithAlgorithm<H>, callback: SignCallback): string;
  }

  declare type Payload = Object & {
    jti?: string,
    iss?: string,
    sub?: string,
    aud?: string | string[],
    exp?: number,
    iat?: number,
    nbf?: number,
    ...
  }

  declare type Token = {
    header: {
      typ: 'JWT',
      alg: Algorithm,
      ...
    },
    payload: Payload,
    signature?: string,
    ...
  }

  declare interface Decode {
    (jwt: string): Payload;

    (jwt: string, options: DecodingOptions): Payload;

    (jwt: string, options: DecodingOptions & { complete: true, ... }): Token;
  }

  declare interface Verify {
    (jwt: string, secretOrPrivateKey: string | Buffer): Payload;

    (jwt: string, secretOrPrivateKey: string | Buffer, options: VerifyOptions | VerifyCallback): Payload;

    (jwt: string, secretOrPrivateKey: string | Buffer, options: VerifyOptions, callback: VerifyCallback): Payload;

    (jwt: string, secretOrPrivateKey: Key, options: VerifyOptionsWithAlgorithm): Payload;

    (jwt: string, secretOrPrivateKey: Key, options: VerifyOptionsWithAlgorithm, callback: VerifyCallback): Payload;

    (jwt: string, getKey: (header: { kid: ?string, ... }, callback: (err: ?Error, key?: string) => any) => any, callback: VerifyCallback): Payload;

    (jwt: string, getKey: (header: { kid: ?string, ... }, callback: (err: ?Error, key?: string) => any) => any, options: VerifyOptionsWithAlgorithm, callback: VerifyCallback): Payload;
  }

  declare class TokenExpiredError extends Error {
  }

  declare class WebTokenError extends Error {
  }

  declare class NotBeforeError extends Error {
  }

  declare module.exports: {
    sign: Sign,
    decode: Decode,
    verify: Verify,
    JsonWebTokenError: Class<WebTokenError>,
    NotBeforeError: Class<NotBeforeError>,
    TokenExpiredError: Class<TokenExpiredError>,
    ...
  }
}
