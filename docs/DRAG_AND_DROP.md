# Drag and Drop in Outline

This document explains how drag-and-drop functionality works in Outline's sidebar, particularly for collections and documents.

## Overview

Outline uses `react-dnd` for implementing drag-and-drop functionality in the sidebar. The system allows users to:
- Reorder collections and documents
- Move documents between collections
- Create nested document structures
- Archive items via drag-and-drop

## Key Components

### 1. DropCursor Component

The `DropCursor` component provides visual feedback during drag operations. It shows where an item will be dropped.

```tsx
type Props = {
  isActiveDrop: boolean;    // Whether the cursor is currently over a valid drop target
  innerRef: React.Ref<HTMLDivElement>;  // Ref for the drop target
  position?: "top";         // Optional position override
  depth?: number;           // Nesting depth for visual indentation
};
```

The cursor is styled to be:
- A thin line (2px height)
- Indented based on nesting depth (8px per level, max 24px)
- Semi-transparent when not active
- Fully visible when over a valid drop target

### 2. DraggableCollectionLink

Handles drag-and-drop for collections in the sidebar:

```tsx
// Key features:
- Allows reordering collections
- Handles collection expansion/collapse during drag
- Manages drop zones for nested items
- Prevents invalid drops (e.g., dropping onto itself)
```

### 3. DocumentLink

Manages drag-and-drop for documents:

```tsx
// Key features:
- Supports document reordering
- Handles document nesting
- Manages parent-child relationships
- Prevents circular references
```

## Drag and Drop Hooks

### useDragDocument

```tsx
// Purpose: Makes a document draggable
// Parameters:
- node: NavigationNode    // The document to drag
- depth: number          // Current nesting level
- document?: Document    // Optional document model
- isEditing?: boolean   // Whether document is being edited
```

### useDropToReorderDocument

```tsx
// Purpose: Handles dropping documents to reorder them
// Features:
- Validates drop targets
- Handles manual vs. automatic sorting
- Manages collection permissions
- Updates document indices
```

### useDropToReparentDocument

```tsx
// Purpose: Handles moving documents to new parent documents
// Features:
- Validates parent-child relationships
- Prevents circular references
- Handles permission changes
- Updates document hierarchy
```

## Visual Feedback

The drag-and-drop system provides several types of visual feedback:

1. **Drop Cursors**
   - Shows where items will be dropped
   - Indents based on nesting level
   - Becomes more visible when over valid drop targets

2. **Item Opacity**
   - Dragged items become semi-transparent (opacity: 0.1)
   - Helps distinguish between dragged and static items

3. **Active States**
   - Drop targets highlight when valid
   - Invalid drop targets remain unchanged

## Best Practices

1. **Performance**
   - Use `React.useCallback` for event handlers
   - Memoize complex calculations
   - Avoid unnecessary re-renders during drag operations

2. **Accessibility**
   - Maintain keyboard navigation during drag operations
   - Provide clear visual feedback
   - Support screen readers with appropriate ARIA attributes

3. **Error Handling**
   - Validate drop targets before operations
   - Show clear error messages for invalid operations
   - Handle permission changes gracefully

4. **User Experience**
   - Provide immediate visual feedback
   - Use smooth transitions for state changes
   - Maintain consistent behavior across different contexts

## Common Issues and Solutions

1. **Drop Indicator Overlap**
   - Use depth-based indentation
   - Limit maximum indentation
   - Add visual distinction between levels

2. **Invalid Drop States**
   - Clear validation in `canDrop` functions
   - Provide user feedback for invalid operations
   - Handle edge cases (e.g., dropping onto self)

3. **Nested Structure Management**
   - Track parent-child relationships
   - Validate hierarchy changes
   - Update indices correctly

## Example Usage

```tsx
// Making a document draggable
const [{ isDragging }, drag] = useDragDocument(node, depth, document);

// Making an element a drop target
const [{ isOverReorder }, drop] = useDropToReorderDocument(node, collection);

// Combining drag and drop
<div ref={drag}>
  <div ref={drop}>
    {isDragging && <DropCursor isActiveDrop={isOverReorder} depth={depth} />}
    {/* Content */}
  </div>
</div>
```

## Related Components

- `DropToImport`: Handles file imports via drag-and-drop
- `CollectionLinkChildren`: Manages nested collection structure
- `Folder`: Handles expandable document groups

## Future Improvements

1. **Enhanced Visual Feedback**
   - Add animation for drop operations
   - Improve visibility of nested drop targets
   - Add preview of drop result

2. **Performance Optimizations**
   - Implement virtualization for large lists
   - Optimize re-render behavior
   - Improve drag preview performance

3. **Accessibility Enhancements**
   - Add keyboard shortcuts for drag operations
   - Improve screen reader support
   - Add more descriptive ARIA labels 