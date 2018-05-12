// flow-typed signature: 3ec9bf9b258f375a8abeff95acd8b2ad
// flow-typed version: cd78efc61a/js-cookie_v2.x.x/flow_>=v0.38.x

declare module 'js-cookie' {
    declare type CookieOptions = {
        expires?: number | Date,
        path?: string,
        domain?: string,
        secure?: boolean
    }
    declare type ConverterFunc = (value: string, name: string) => string;
    declare type ConverterObj = {
        read: ConverterFunc,
        write: ConverterFunc
    };
    declare class Cookie {
        defaults: CookieOptions;
        set(name: string, value: mixed, options?: CookieOptions): void;
        get(...args: Array<void>): { [key: string]: string };
        get(name: string, ...args: Array<void>): string | void;
        remove(name: string, options?: CookieOptions): void;
        getJSON(name: string): mixed;
        withConverter(converter: ConverterFunc | ConverterObj): this;
        noConflict(): this;
    }

    declare module.exports: Cookie;
}
