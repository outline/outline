import { EditorState, TextSelection, NodeSelection, Plugin } from "prosemirror-state";
import { Schema } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import SelectionToolbarExtension from "./SelectionToolbarExtension";
import SelectionToolbar from "~/app/editor/components/SelectionToolbar"; // Path to the actual component

// Mock the actual toolbar component
jest.mock("~/app/editor/components/SelectionToolbar", () => ({
  __esModule: true,
  default: jest.fn(() => null), // Mock component returns null
}));

// Define a basic schema for testing
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "text*", group: "block", toDOM: () => ["p", 0] },
    text: { inline: true }, // text is inline
    image: { group: "block", toDOM: () => ["img"] },
    hr: { group: "block", toDOM: () => ["hr"] }, // For NodeSelection hr test
    code_block: { content: "text*", group: "block", code: true, defining: true, toDOM: () => ["pre", ["code", 0]] },
    code_fence: { content: "text*", group: "block", code: true, defining: true, toDOM: () => ["pre", ["code", 0]] },
    // Minimal 'attachment' node for testing NodeSelection
    attachment: { group: "block", toDOM: () => ["div", { class: "attachment" }] },
  },
  marks: {
    link: { toDOM: () => ["a", { href: "" }] },
  }
});

// Helper to create a mock editor environment
const createMockEditor = (state: EditorState, editorProps: any = {}) => {
  const view = {
    state,
    props: {}, // ProseMirror view.props, not the React component props
    editable: !editorProps.readOnly,
    dispatch: jest.fn(),
    dom: document.createElement("div"),
    update: jest.fn(),
    // Add other EditorView properties if needed by the extension
  } as unknown as EditorView;

  return {
    state, // Current EditorState
    view,  // Mocked EditorView
    props: { // These are the props of the <Editor> React component
      dir: "ltr",
      isTemplate: false,
      readOnly: false,
      canComment: true,
      canUpdate: true,
      onClickLink: jest.fn(),
      ...editorProps,
    },
    // Mock other editor instance methods/properties if the extension uses them
    // e.g., commands: {}
  };
};

describe("SelectionToolbarExtension", () => {
  let extension: SelectionToolbarExtension;
  let initialEditorState: EditorState;
  let mockEditorView: EditorView;
  let mockEditor: ReturnType<typeof createMockEditor>;

  beforeEach(() => {
    (SelectionToolbar as jest.Mock).mockClear(); // Clear mock calls before each test
    extension = new SelectionToolbarExtension();
    
    initialEditorState = EditorState.create({ schema });
    mockEditor = createMockEditor(initialEditorState);
    mockEditorView = mockEditor.view;

    // Simulate the extension being initialized with an editor instance
    // This is crucial as the extension accesses `this.editor`
    extension.editor = mockEditor as any;

    // Initialize the plugin's view. This is what `EditorState.create` would do.
    // The plugin's `view` method is called when the plugin is first applied.
    const plugin = extension.plugins[0] as Plugin;
    if (plugin && plugin.spec && plugin.spec.view) {
      // Attach a mock state to the view before calling plugin.spec.view
      mockEditorView.state = initialEditorState;
      const pluginView = plugin.spec.view(mockEditorView);
      // If the plugin view has an update method, we might need to store it or re-evaluate
      // but for now, the view() call itself triggers the first updateSelectionToolbarVisibility
    }
  });

  // Helper to simulate plugin updates
  const updatePluginState = (newState: EditorState, oldState?: EditorState) => {
    const plugin = extension.plugins[0] as Plugin;
    if (plugin && plugin.spec && plugin.spec.view) {
      // The plugin view object is created once, its update method is called subsequently.
      // Prosemirror typically handles this. For tests, we directly call the update logic.
      // The extension's updateSelectionToolbarVisibility is called from plugin's update.
      
      // Update the view's state reference
      mockEditorView.state = newState;
      extension['updateSelectionToolbarVisibility'](mockEditorView, oldState || initialEditorState);
      initialEditorState = newState; // Keep track of the current state for subsequent calls
    }
  };

  it("should be inactive initially", () => {
    expect(extension.state.isActive).toBe(false);
    extension.widget(); // Call widget
    expect(SelectionToolbar).not.toHaveBeenCalled();
  });

  it("should become active on text selection", () => {
    const doc = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("Hello World")])]);
    const selection = TextSelection.create(doc, 1, 6); // Select "Hello"
    const newState = EditorState.create({ doc, schema, selection });
    
    updatePluginState(newState);

    expect(extension.state.isActive).toBe(true);
    extension.widget(); // Call widget to render
    expect(SelectionToolbar).toHaveBeenCalledTimes(1);
    expect(SelectionToolbar).toHaveBeenCalledWith(expect.objectContaining({ active: true }), {});
  });

  it("should become inactive when selection is collapsed", () => {
    // First, make it active
    const docActive = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("Hello")])]);
    const selectionActive = TextSelection.create(docActive, 1, 6); // Select "Hello"
    const stateActive = EditorState.create({ doc: docActive, schema, selection: selectionActive });
    updatePluginState(stateActive);
    expect(extension.state.isActive).toBe(true);
    extension.widget(); // Renders toolbar
    (SelectionToolbar as jest.Mock).mockClear(); // Clear calls for the next assertion

    // Then, collapse selection
    const selectionCollapsed = TextSelection.create(docActive, 1, 1); // Cursor at start of "Hello"
    const stateCollapsed = stateActive.apply(stateActive.tr.setSelection(selectionCollapsed)).state;
    updatePluginState(stateCollapsed, stateActive);

    expect(extension.state.isActive).toBe(false);
    extension.widget(); // Should return null, so SelectionToolbar not called again
    expect(SelectionToolbar).not.toHaveBeenCalled();
  });

  it("should become active on image node selection", () => {
    const doc = schema.node("doc", null, [schema.node("image")]);
    const selection = NodeSelection.create(doc, 0); // Position 0 for the image node
    const newState = EditorState.create({ doc, schema, selection });

    updatePluginState(newState);

    expect(extension.state.isActive).toBe(true);
    extension.widget();
    expect(SelectionToolbar).toHaveBeenCalledTimes(1);
    expect(SelectionToolbar).toHaveBeenCalledWith(expect.objectContaining({ active: true }), {});
  });
  
  it("should become active on hr node selection", () => {
    const doc = schema.node("doc", null, [schema.node("hr")]);
    const selection = NodeSelection.create(doc, 0);
    const newState = EditorState.create({ doc, schema, selection });
    updatePluginState(newState);
    expect(extension.state.isActive).toBe(true);
    extension.widget();
    expect(SelectionToolbar).toHaveBeenCalledWith(expect.objectContaining({ active: true }), {});
  });

  it("should become active on attachment node selection", () => {
    const doc = schema.node("doc", null, [schema.node("attachment")]);
    const selection = NodeSelection.create(doc, 0);
    const newState = EditorState.create({ doc, schema, selection });
    updatePluginState(newState);
    expect(extension.state.isActive).toBe(true);
    extension.widget();
    expect(SelectionToolbar).toHaveBeenCalledWith(expect.objectContaining({ active: true }), {});
  });


  it("should become inactive when selection is cleared (e.g., to an empty paragraph, collapsed)", () => {
    // Make it active first
    const docActive = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("Selected Text")])]);
    const selectionActive = TextSelection.create(docActive, 1, 13);
    const stateActive = EditorState.create({ doc: docActive, schema, selection: selectionActive });
    updatePluginState(stateActive);
    expect(extension.state.isActive).toBe(true);
    extension.widget(); // Renders toolbar
    (SelectionToolbar as jest.Mock).mockClear();

    // Clear selection / move to empty paragraph, collapsed
    const docEmpty = schema.node("doc", null, [schema.node("paragraph")]);
    const selectionEmpty = TextSelection.create(docEmpty, 1, 1); // Collapsed selection in an empty paragraph
    const stateEmpty = EditorState.create({ doc: docEmpty, schema, selection: selectionEmpty });
    updatePluginState(stateEmpty, stateActive);
    
    expect(extension.state.isActive).toBe(false);
    extension.widget();
    expect(SelectionToolbar).not.toHaveBeenCalled();
  });

  describe("Menu item contexts (conceptual)", () => {
    it("should allow SelectionToolbar to render formatting items for text selection", () => {
      const doc = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("Some text to select")])]);
      const selection = TextSelection.create(doc, 1, 5); // Select "Some"
      const newState = EditorState.create({ doc, schema, selection });
      
      updatePluginState(newState);
      
      expect(extension.state.isActive).toBe(true);
      extension.widget();
      expect(SelectionToolbar).toHaveBeenCalledWith(expect.objectContaining({ active: true }), {});
      // Further assertions would depend on SelectionToolbar's own tests or if this extension passed item-specific props
    });

    it("should allow SelectionToolbar to render image menu items for image selection", () => {
      const doc = schema.node("doc", null, [schema.node("image")]);
      const selection = NodeSelection.create(doc, 0);
      const newState = EditorState.create({ doc, schema, selection });

      updatePluginState(newState);

      expect(extension.state.isActive).toBe(true);
      extension.widget();
      expect(SelectionToolbar).toHaveBeenCalledWith(expect.objectContaining({ active: true }), {});
    });
  });
});
