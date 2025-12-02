import { chainCommands, toggleMark } from "prosemirror-commands";
import { Attrs } from "prosemirror-model";
import {
  Command,
  NodeSelection,
  Selection,
  TextSelection,
} from "prosemirror-state";
import { getMarkRange } from "../queries/getMarkRange";
import { toast } from "sonner";
import { sanitizeUrl } from "@shared/utils/urls";
import { addMark } from "./addMark";
import { getMarkRangeNodeSelection } from "../queries/getMarkRange";
import { collapseSelection } from "./collapseSelection";
import { chainTransactions } from "../lib/chainTransactions";

const addLinkTextSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof TextSelection)) {
      return false;
    }

    chainTransactions(
      addMark(state.schema.marks.link, attrs),
      collapseSelection()
    )(state, dispatch);

    return true;
  };

const addLinkNodeSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof NodeSelection)) {
      return false;
    }
    const { selection } = state;
    const existingMarks = selection.node.attrs.marks ?? [];
    const newMark = {
      type: "link",
      attrs,
    };
    const updatedMarks = [...existingMarks, newMark];
    dispatch?.(
      state.tr.setNodeAttribute(selection.from, "marks", updatedMarks)
    );
    return true;
  };

const openLinkTextSelection =
  (attrs: Attrs): Command =>
  (state) => {
    if (!(state.selection instanceof TextSelection)) {
      return false;
    }

    const range = getMarkRange(state.selection.$from, state.schema.marks.link);
    if (range && range.mark && attrs.onClickLink) {
      try {
        const event = new KeyboardEvent("keydown", { metaKey: false });
        attrs.onClickLink(sanitizeUrl(range.mark.attrs.href), event);
      } catch (_err) {
        toast.error(attrs.dictionary.openLinkError);
      }
      return true;
    }
    return false;
  };

const openLinkNodeSelection =
  (attrs: Attrs): Command =>
  (state) => {
    if (!(state.selection instanceof NodeSelection)) {
      return false;
    }

    if (!attrs.onClickLink) {
      return false;
    }

    const marks = state.selection.node.attrs.marks ?? [];
    const linkMark = marks.find((mark: any) => mark.type === "link");
    if (!linkMark) {
      return false;
    }

    try {
      const event = new KeyboardEvent("keydown", { metaKey: false });
      attrs.onClickLink(sanitizeUrl(linkMark.attrs.href), event);
    } catch (_err) {
      toast.error(attrs.dictionary.openLinkError);
    }
    return true;
  };

const updateLinkTextSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof TextSelection)) {
      return false;
    }

    const range = getMarkRange(state.selection.$from, state.schema.marks.link);

    if (range && range.mark) {
      const nextSelection =
        Selection.findFrom(state.doc.resolve(range.to), 1, true) ??
        TextSelection.create(state.tr.doc, 0);
      dispatch?.(
        state.tr
          .setSelection(nextSelection)
          .removeMark(range.from, range.to, state.schema.marks.link)
          .addMark(range.from, range.to, state.schema.marks.link.create(attrs))
      );
      return true;
    }
    return false;
  };

const updateLinkNodeSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof NodeSelection)) {
      return false;
    }

    const markRange = getMarkRangeNodeSelection(
      state.selection,
      state.schema.marks.link
    );
    if (!markRange) {
      return false;
    }

    const existingMarks = state.selection.node.attrs.marks ?? [];
    const updatedMarks = existingMarks.map((mark: any) =>
      mark.type === "link"
        ? { ...mark, attrs: { ...mark.attrs, ...attrs } }
        : mark
    );
    const nextValidSelection =
      Selection.findFrom(state.doc.resolve(markRange.to), 1, true) ??
      TextSelection.create(state.tr.doc, 0);
    dispatch?.(
      state.tr
        .setSelection(nextValidSelection)
        .setNodeAttribute(state.selection.from, "marks", updatedMarks)
    );
    return true;
  };

const removeLinkTextSelection = (): Command => (state, dispatch) => {
  if (!(state.selection instanceof TextSelection)) {
    return false;
  }
  const range = getMarkRange(state.selection.$from, state.schema.marks.link);
  if (range && range.mark) {
    const nextSelection =
      Selection.findFrom(state.doc.resolve(range.to), 1, true) ??
      TextSelection.create(state.tr.doc, 0);
    dispatch?.(
      state.tr
        .setSelection(nextSelection)
        .removeMark(range.from, range.to, range.mark)
    );
    return true;
  }
  return false;
};

const removeLinkNodeSelection = (): Command => (state, dispatch) => {
  if (!(state.selection instanceof NodeSelection)) {
    return false;
  }

  const markRange = getMarkRangeNodeSelection(
    state.selection,
    state.schema.marks.link
  );
  if (!markRange) {
    return false;
  }

  const existingMarks = state.selection.node.attrs.marks ?? [];
  const updatedMarks = existingMarks.filter(
    (mark: any) => mark.type !== "link"
  );

  const nextValidSelection =
    Selection.findFrom(state.doc.resolve(markRange.to), 1, true) ??
    TextSelection.create(state.tr.doc, 0);
  dispatch?.(
    state.tr
      .setSelection(nextValidSelection)
      .setNodeAttribute(state.selection.from, "marks", updatedMarks)
  );
  return true;
};

const toggleLinkTextSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof TextSelection)) {
      return false;
    }

    return toggleMark(state.schema.marks.link, attrs)(state, dispatch);
  };

const toggleLinkNodeSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof NodeSelection)) {
      return false;
    }

    const existingMarks = state.selection.node.attrs.marks ?? [];
    const linkMark = existingMarks.find((mark: any) => mark.type === "link");
    if (linkMark) {
      return removeLinkNodeSelection()(state, dispatch);
    } else {
      return addLinkNodeSelection(attrs)(state, dispatch);
    }
  };

export const toggleLink = (attrs: Attrs): Command =>
  chainCommands(toggleLinkTextSelection(attrs), toggleLinkNodeSelection(attrs));

export const addLink = (attrs: Attrs): Command =>
  chainCommands(addLinkTextSelection(attrs), addLinkNodeSelection(attrs));

export const openLink = (attrs: Attrs): Command =>
  chainCommands(openLinkTextSelection(attrs), openLinkNodeSelection(attrs));

export const updateLink = (attrs: Attrs): Command =>
  chainCommands(updateLinkTextSelection(attrs), updateLinkNodeSelection(attrs));

export const removeLink = (): Command =>
  chainCommands(removeLinkTextSelection(), removeLinkNodeSelection());
