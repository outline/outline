import Extension from "@shared/editor/lib/Extension";
import { isRemoteTransaction } from "@shared/editor/lib/multiplayer";
import { recreateTransform } from "@shared/editor/lib/prosemirror-recreate-transform";
import { isInCode } from "@shared/editor/queries/isInCode";
import { MentionType, UnfurlResourceType, UnfurlResponse } from "@shared/types";
import { action, observable } from "mobx";
import {
  Command,
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
} from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import React from "react";
import { Primitive } from "utility-types";
import { v4 } from "uuid";
import stores from "~/stores";
import { CreateIssueDialog } from "../components/CreateIssueDialog";

export default class CreateIssue extends Extension {
  private state: {
    open: boolean;
    title: string;
  } = observable({
    open: false,
    title: "",
  });

  private key = new PluginKey(this.name);

  get name() {
    return "issue";
  }

  get plugins() {
    return [
      new Plugin({
        key: this.key,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set) => {
            let mapping = tr.mapping;

            // See if the transaction adds or removes any placeholders
            const meta = tr.getMeta(this.key);
            const hasDecorations = set.find().length;

            // We only want a single paste placeholder at a time, so if we're adding a new
            // placeholder we can just return a new DecorationSet and avoid mapping logic.
            if (meta?.add) {
              const { from, to, id } = meta.add;
              const decorations = [
                Decoration.inline(
                  from,
                  to,
                  {
                    class: "create-issue-placeholder",
                  },
                  {
                    id,
                  }
                ),
              ];
              return DecorationSet.create(tr.doc, decorations);
            }

            if (hasDecorations && (isRemoteTransaction(tr) || meta)) {
              try {
                mapping = recreateTransform(tr.before, tr.doc, {
                  complexSteps: true,
                  wordDiffs: false,
                  simplifyDiff: true,
                }).mapping;
              } catch (err) {
                // eslint-disable-next-line no-console
                console.warn("Failed to recreate transform: ", err);
              }
            }

            set = set.map(mapping, tr.doc);

            if (meta?.remove) {
              const { id } = meta.remove;
              const decorations = set.find(
                undefined,
                undefined,
                (spec) => spec.id === id
              );
              return set.remove(decorations);
            }

            return set;
          },
        },
      }),
    ];
  }

  keys(): Record<string, Command> {
    return {
      "Mod-Alt-i": (state, dispatch) => {
        const isCode = isInCode(state);
        const isEmpty = state.selection.empty;

        if (isCode || isEmpty) {
          return false;
        }

        const title = state.doc.cut(
          state.selection.from,
          state.selection.to
        ).textContent;
        const { from } = state.selection;
        const to = from + title.length;

        const tr = state.tr
          .setSelection(TextSelection.near(state.doc.resolve(from)))
          .setMeta(this.key, { add: { from, to, id: title } });
        dispatch?.(tr);

        this.openDialog(title);

        return true;
      },
    };
  }

  commands() {
    return (attrs: Record<string, Primitive>): Command =>
      (state, dispatch) => {
        const title = attrs.title as string;
        const { from } = state.selection;
        const to = from + title.length;

        const tr = state.tr
          .setSelection(TextSelection.near(state.doc.resolve(from)))
          .setMeta(this.key, { add: { from, to, id: title } });
        dispatch?.(tr);

        this.openDialog(title);

        return true;
      };
  }

  widget = () => (
    <CreateIssueDialog
      issueTitle={this.state.title}
      open={this.state.open}
      onCreate={this.createIssue}
      onClose={this.closeDialog}
    />
  );

  private createIssue = action(
    (issue: UnfurlResponse[UnfurlResourceType.Issue]) => {
      const { view } = this.editor;
      const { state } = view;

      const result = this.findPlaceholder(state, this.state.title);

      if (result) {
        const tr = state.tr.deleteRange(result[0], result[1]);
        view.dispatch(
          tr.setSelection(TextSelection.near(tr.doc.resolve(result[0])))
        );
      }

      this.editor.commands.mention({
        id: v4(),
        type: MentionType.Issue,
        label: this.state.title,
        href: issue.url,
        modelId: v4(),
        actorId: stores.auth.currentUserId,
      });
    }
  );

  private openDialog = action((title: string) => {
    this.state.title = title;
    this.state.open = true;
  });

  private closeDialog = action(() => {
    const { view } = this.editor;
    const { state } = view;

    const result = this.findPlaceholder(state, this.state.title);

    if (result) {
      const tr = state.tr
        .setSelection(TextSelection.near(state.doc.resolve(result[0])))
        .setMeta(this.key, {
          remove: { id: this.state.title },
        });
      view.dispatch(tr);
    }

    this.state.title = "";
    this.state.open = false;
  });

  private findPlaceholder = (
    state: EditorState,
    id: string
  ): [number, number] | null => {
    const decos = this.key.getState(state) as DecorationSet;
    const found = decos?.find(undefined, undefined, (spec) => spec.id === id);
    return found?.length ? [found[0].from, found[0].to] : null;
  };
}
