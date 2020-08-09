// flow-typed signature: 9fd1ed52c746a31b4121d9a2c4503cfd
// flow-typed version: c6154227d1/@babel/register_v7.x.x/flow_>=v0.104.x

declare module '@babel/register' {
  declare type Ignore = boolean | string | RegExp | (filename: string) => boolean;
  declare type Options = {|
    ast?: boolean,
    auxiliaryCommentAfter?: ?string,
    auxiliaryCommentBefore?: ?string,
    babelrc?: boolean,
    code?: boolean,
    comments?: boolean,
    compact?: 'auto' | boolean,
    configFile?: string | boolean,
    env?: Object,
    extends?: ?string,
    extensions?: Array<string>,
    filename?: string,
    filenameRelative?: string,
    generatorOpts?: Object,
    getModuleId?: void | null | (moduleName: string) => string,
    highlightCode?: boolean,
    ignore?: Ignore | Array<Ignore>,
    inputSourceMap?: Object,
    minified?: boolean,
    moduleId?: string,
    moduleIds?: boolean,
    moduleRoot?: string,
    only?: RegExp,
    parserOpts?: Object,
    plugins?: Array<[string, Object] | string>,
    presets?: Array<string>,
    retainLines?: boolean,
    resolveModuleSource?: null | (source: string, filename: string) => boolean,
    shouldPrintComment?: null | (commentContents: string) => string,
    sourceFileName?: string,
    sourceMaps?: boolean | 'inline' | 'both',
    sourceMapTarget?: string,
    sourceRoot?: string,
    sourceType?: 'script' | 'module',
    wrapPluginVisitorMethod?: null | (pluginAlias: string, visitorType: string, callback: Function) => boolean,
    extensions?: Array<string>,
    cache?: boolean,
  |};

  declare module.exports: (options?: Options) => void;
}
