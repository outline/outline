import { MathView } from "@benrbray/prosemirror-math";
import { Plugin, PluginKey, PluginSpec } from "prosemirror-state";
import { NodeViewConstructor } from "prosemirror-view";

export interface IMathPluginState {
  macros: { [cmd: string]: string };
  activeNodeViews: MathView[];
  prevCursorPos: number;
}

const MATH_PLUGIN_KEY = new PluginKey<IMathPluginState>("prosemirror-math");

export function createMathView(displayMode: boolean): NodeViewConstructor {
  return (node, view, getPos) => {
    // dynamically load katex styles and fonts
    import("katex/dist/katex.min.css");

    const pluginState = MATH_PLUGIN_KEY.getState(view.state);
    if (!pluginState) {
      throw new Error("no math plugin!");
    }
    const nodeViews = pluginState.activeNodeViews;

    // set up NodeView
    const nodeView = new MathView(
      node,
      view,
      getPos as () => number,
      {
        katexOptions: {
          displayMode,
          output: "html",
          macros: pluginState.macros,
        },
      },
      MATH_PLUGIN_KEY,
      () => {
        nodeViews.splice(nodeViews.indexOf(nodeView));
      }
    );

    nodeViews.push(nodeView);
    return nodeView;
  };
}

const mathPluginSpec: PluginSpec<IMathPluginState> = {
  key: MATH_PLUGIN_KEY,
  state: {
    init() {
      return {
        macros: {},
        activeNodeViews: [],
        prevCursorPos: 0,
      };
    },
    apply(tr, value, oldState) {
      return {
        activeNodeViews: value.activeNodeViews,
        macros: value.macros,
        prevCursorPos: oldState.selection.from,
      };
    },
  },
  props: {
    nodeViews: {
      math_inline: createMathView(false),
      math_block: createMathView(true),
    },
  },
};

export default new Plugin(mathPluginSpec);
