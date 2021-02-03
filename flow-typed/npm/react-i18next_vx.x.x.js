// @flow
declare module "react-i18next" {
  declare type TFunction = (key?: ?string, data?: ?Object) => string;

  declare type TranslatorProps = {|
    t: TFunction,
    i18nLoadedAt: Date,
    i18n: Object,
  |};

  declare type TranslatorPropsVoid = {
    t: TFunction | void,
    i18nLoadedAt: Date | void,
    i18n: Object | void,
  };

  declare type Translator<P: {}, Component: React$ComponentType<P>> = (
    WrappedComponent: Component
  ) => React$Element<
    $Diff<React$ElementConfig<Component>, TranslatorPropsVoid>
  >;

  declare type TranslateOptions = $Shape<{
    wait: boolean,
    nsMode: "default" | "fallback",
    bindi18n: false | string,
    bindStore: false | string,
    withRef: boolean,
    translateFuncName: string,
    i18n: Object,
    usePureComponent: boolean,
  }>;

  declare type UseTranslationResponse = {
    t: TFunction,
    i18n: Object,
    ready: boolean,
  };

  declare type Namespace =
    | string
    | Array<string>
    | (($Diff<P, TranslatorPropsVoid>) => string | Array<string>);

  declare function useTranslation(
    ns?: Namespace,
    options?: TranslateOptions
  ): UseTranslationResponse;

  declare function withTranslation(
    ns?: Namespace,
    options?: {
      withRef?: boolean,
    }
  ): <P>(component: React.ComponentType<P>) => Translator<P, Component>;

  declare type I18nProps = {
    i18n?: Object,
    ns?: string | Array<string>,
    children: (t: TFunction, { i18n: Object, t: TFunction }) => React$Node,
    initialI18nStore?: Object,
    initialLanguage?: string,
  };
  declare var I18n: React$ComponentType<I18nProps>;

  declare type InterpolateProps = {
    className?: string,
    dangerouslySetInnerHTMLPartElement?: string,
    i18n?: Object,
    i18nKey?: string,
    options?: Object,
    parent?: string,
    style?: Object,
    t?: TFunction,
    useDangerouslySetInnerHTML?: boolean,
  };
  declare var Interpolate: React$ComponentType<InterpolateProps>;

  declare type TransProps = {
    count?: number,
    parent?: string,
    i18n?: Object,
    i18nKey?: string,
    t?: TFunction,
  };
  declare var Trans: React$ComponentType<TransProps>;

  declare type ProviderProps = { i18n: Object, children: React$Element<*> };
  declare var I18nextProvider: React$ComponentType<ProviderProps>;

  declare type NamespacesProps = {
    components: Array<React$ComponentType<*>>,
    i18n: { loadNamespaces: Function },
  };
  declare function loadNamespaces(props: NamespacesProps): Promise<void>;

  declare var initReactI18next: {
    type: "3rdParty",
    init: (instance: Object) => void,
  };

  declare function setDefaults(options: TranslateOptions): void;

  declare function getDefaults(): TranslateOptions;

  declare function getI18n(): Object;

  declare function setI18n(instance: Object): void;
}
