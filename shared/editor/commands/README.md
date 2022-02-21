https://prosemirror.net/docs/ref/#commands

Commands are building block functions that encapsulate an editing action. A command function takes an editor state, optionally a dispatch function that it can use to dispatch a transaction and optionally an EditorView instance. It should return a boolean that indicates whether it could perform any action.

Additional commands that are not included as part of prosemirror-commands, but are often reused can be found in this folder.