// flow-typed signature: 894f3b1365c9be6233fea8986db04c5f
// flow-typed version: c55c288299/react-color_v2.x.x/flow_>=v0.104.x

declare module "react-color" {
  import type { ComponentType, Component } from 'react';
  declare export type HexColor = string;

  declare export type HSLColor = {|
    h: number,
    s: number,
    l: number,
    a?: number
  |};

  declare export type HSVColor = {|
    h: number,
    s: number,
    v: number,
    a?: number
  |};

  declare export type RGBColor = {|
    r: number,
    g: number,
    b: number,
    a?: number
  |};

  declare export type Color = HexColor | HSLColor | HSVColor | RGBColor;

  declare export type ColorResult = {|
    hex: HexColor,
    hsl: HSLColor,
    hsv: HSVColor,
    rgb: RGBColor
  |};

  declare export type ColorChangeHandler = (color: ColorResult) => void;

  declare export type ColorPickerProps = {|
    color?: Color,
    onChange?: ColorChangeHandler,
    onChangeComplete?: ColorChangeHandler
  |};

  declare export type AlphaPickerProps = {|
    ...ColorPickerProps,
    width?: string,
    height?: string,
    direction?: "horizontal" | "vertical",
    renderers?: Object,
    pointer?: ComponentType<any>
  |};

  declare export type BlockPickerProps = {|
    ...ColorPickerProps,
    width?: string,
    colors?: Array<string>,
    triangle?: "hide" | "top",
    onSwatchHover?: (color: Color, event: SyntheticMouseEvent<*>) => void
  |};

  declare export type ChromePickerProps = {|
    ...ColorPickerProps,
    className?: string,
    defaultView?: "hex" | "hsl" | "rgb",
    disableAlpha?: boolean,
    renderers?: Object,
    width?: number | string,
    styles?: {
      ...
    },
  |};

  declare export type CirclePickerProps = {|
    ...ColorPickerProps,
    width?: string,
    colors?: Array<string>,
    circleSize?: number,
    circleSpacing?: number,
    onSwatchHover?: (color: Color, event: SyntheticMouseEvent<*>) => void
  |};

  declare export type CompactPickerProps = {|
    ...ColorPickerProps,
    colors?: Array<string>,
    onSwatchHover?: (color: Color, event: SyntheticMouseEvent<*>) => void
  |};

  declare export type GithubPickerProps = {|
    ...ColorPickerProps,
    width?: string,
    colors?: Array<string>,
    triangle?: "hide" | "top-left" | "top-right",
    onSwatchHover?: (color: Color, event: SyntheticMouseEvent<*>) => void
  |};

  declare export type HuePickerProps = {|
    ...ColorPickerProps,
    width?: string,
    height?: string,
    direction?: "horizontal" | "vertical",
    pointer?: ComponentType<any>
  |};

  declare export type MaterialPickerProps = {|
    ...ColorPickerProps
  |};

  declare export type PhotoshopPickerProps = {|
    ...ColorPickerProps,
    header?: string,
    onAccept?: () => void,
    onCancel?: () => void
  |};

  declare export type SketchPickerProps = {|
    ...ColorPickerProps,
    disableAlpha?: boolean,
    presetColors?: Array<string | {| color: string, title: string |}>,
    width?: number,
    renderers?: Object,
    onSwatchHover?: (color: Color, event: SyntheticMouseEvent<*>) => void
  |};

  declare export type SliderPickerProps = {|
    ...ColorPickerProps,
    pointer?: ComponentType<any>
  |};

  declare export type SwatchesPickerProps = {|
    ...ColorPickerProps,
    width?: number,
    height?: number,
    colors?: Array<Array<string>>,
    onSwatchHover?: (color: Color, event: SyntheticMouseEvent<*>) => void
  |};

  declare export type TwitterPickerProps = {|
    ...ColorPickerProps,
    width?: string,
    colors?: Array<string>,
    triangle?: "hide" | "top-left" | "top-right",
    onSwatchHover?: (color: Color, event: SyntheticMouseEvent<*>) => void
  |};

  declare export type ColorWrapChangeHandler = (
    color: Color | ColorResult
  ) => void;

  declare export type InjectedColorProps = {
    hex: string,
    hsl: HSLColor,
    hsv: HSVColor,
    rgb: RGBColor,
    oldHue: number,
    onChange?: ColorWrapChangeHandler,
    source: string,
    ...
  };

  declare export var AlphaPicker: Class<Component<AlphaPickerProps>>;
  declare export var BlockPicker: Class<Component<BlockPickerProps>>;
  declare export var ChromePicker: Class<Component<ChromePickerProps>>;
  declare export var CirclePicker: Class<Component<CirclePickerProps>>;
  declare export var CompactPicker: Class<Component<CompactPickerProps>>;
  declare export var GithubPicker: Class<Component<GithubPickerProps>>;
  declare export var HuePicker: Class<Component<HuePickerProps>>;
  declare export var MaterialPicker: Class<Component<MaterialPickerProps>>;
  declare export var PhotoshopPicker: Class<Component<PhotoshopPickerProps>>;
  declare export var SketchPicker: Class<Component<SketchPickerProps>>;
  declare export var SliderPicker: Class<Component<SliderPickerProps>>;
  declare export var SwatchesPicker: Class<Component<SwatchesPickerProps>>;
  declare export var TwitterPicker: Class<Component<TwitterPickerProps>>;

  declare export function CustomPicker<
    Props: InjectedColorProps,
    Comp: ComponentType<Props>,
  >(
    Component: Comp
  ): ComponentType<$Diff<React$ElementConfig<Comp>, InjectedColorProps>>;
}

declare module "react-color/lib/components/common" {
  import type { ComponentType, Component } from 'react';
  import type {
    HexColor,
    RGBColor,
    HSLColor,
    HSVColor,
    ColorChangeHandler
  } from "react-color";

  declare type PartialColorResult = {|
    hex?: HexColor,
    hsl?: HSLColor,
    hsv?: HSVColor,
    rgb?: RGBColor
  |};

  declare export type AlphaProps = {|
    ...PartialColorResult,
    pointer?: ComponentType<any>,
    onChange?: ColorChangeHandler
  |};

  declare export type EditableInputProps = {|
    label?: string,
    value?: any,
    onChange?: ColorChangeHandler,
    style?: {|
      input?: Object,
      label?: Object,
      wrap?: Object
    |}
  |};

  declare export type HueProps = {|
    ...PartialColorResult,
    pointer?: ComponentType<any>,
    onChange?: ColorChangeHandler,
    direction?: "horizontal" | "vertical"
  |};

  declare export type SaturationProps = {|
    ...PartialColorResult,
    pointer?: ComponentType<any>,
    onChange?: ColorChangeHandler
  |};

  declare export type CheckboardProps = {|
    size?: number,
    white?: string,
    grey?: string
  |};

  declare export var Alpha: Class<Component<AlphaProps>>;
  declare export var EditableInput: Class<Component<EditableInputProps>>;
  declare export var Hue: Class<Component<HueProps>>;
  declare export var Saturation: Class<Component<SaturationProps>>;
  declare export var Checkboard: Class<Component<CheckboardProps>>;
}
