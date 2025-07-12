declare module 'cookie' {
  export interface CookieParseOptions {
    decode?: (str: string) => string;
  }

  export interface CookieSerializeOptions {
    encode?: (val: string) => string;
    maxAge?: number;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    priority?: 'low' | 'medium' | 'high';
    sameSite?: boolean | 'lax' | 'strict' | 'none';
  }

  export function parse(str: string, options?: CookieParseOptions): Record<string, string>;
  export function serialize(name: string, val: string, options?: CookieSerializeOptions): string;
}
