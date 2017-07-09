// flow-typed signature: aa2cc901101dc881d88fa9b82d248a4e
// flow-typed version: dbef68335c/slug_v0.9.x/flow_>=v0.28.x

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
