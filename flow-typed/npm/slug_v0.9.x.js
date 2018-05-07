// flow-typed signature: c499686d8ed4b3da5bd13133389c6088
// flow-typed version: b43dff3e0e/slug_v0.9.x/flow_>=v0.25.x

type SlugMode = 'rfc3986' | 'pretty'

declare module 'slug' {
  declare type SlugOptions = {
    mode?: SlugMode,
    replacement?: string,
    multicharmap?: { [key: string]: string },
    charmap?: { [key: string]: string },
    remove?: ?RegExp,
    lower?: boolean,
    symbols?: boolean,
  }
  declare module.exports: {
      (input: string, optionOrReplacement?: string | SlugOptions): string,
      defaults: {
        mode: 'pretty',
        charmap: { [key: string]: string },
        multicharmap: { [key: string]: string },
        modes: { [key: SlugMode]: SlugOptions }
      }
  }
}
