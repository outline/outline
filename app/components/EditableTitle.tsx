import * as React from "react";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";

type Props = Omit<React.HTMLAttributes<HTMLInputElement>, "onSubmit"> & {
  /** A callback when the title is submitted. */
  onSubmit: (title: string) => Promise<void> | void;
  /** A callback when the editing status changes. */
  onEditing?: (isEditing: boolean) => void;
  /** A callback when editing is canceled. */
  onCancel?: () => void;
  /** The default title. */
  title: string;
  /** Whether the user can update the title. */
  canUpdate: boolean;
  /** The maximum length of the title. */
  maxLength?: number;
  /** The default editing state. */
  isEditing?: boolean;
};

export type RefHandle = {
  /** A function to set the editing state. */
  setIsEditing: (isEditing: boolean) => void;
};

function EditableTitle(
  { title, onSubmit, canUpdate, onEditing, onCancel, ...rest }: Props,
  ref: React.RefObject<RefHandle>
) {
  const [isEditing, setIsEditing] = React.useState(rest.isEditing || false);
  const [originalValue, setOriginalValue] = React.useState(title);
  const [value, setValue] = React.useState(title);

  React.useImperativeHandle(ref, () => ({
    setIsEditing,
  }));

  React.useEffect(() => {
    setValue(title);
  }, [title]);

  const handleChange = React.useCallback((event) => {
    setValue(event.target.value);
  }, []);

  const handleDoubleClick = React.useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsEditing(true);
  }, []);

  const stopPropagation = React.useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleFocus = React.useCallback((event) => {
    event.target.select();
  }, []);

  const handleSave = React.useCallback(
    async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      setIsEditing(false);
      const trimmedValue = value.trim();

      if (trimmedValue === originalValue || trimmedValue.length === 0) {
        setValue(originalValue);
        onCancel?.();
        return;
      }

      try {
        await onSubmit(trimmedValue);
        setOriginalValue(trimmedValue);
      } catch (error) {
        setValue(originalValue);
        toast.error(error.message);
        throw error;
      }
    },
    [originalValue, value, onCancel, onSubmit]
  );

  const handleKeyDown = React.useCallback(
    async (ev) => {
      if (ev.nativeEvent.isComposing) {
        return;
      }
      if (ev.key === "Escape") {
        setIsEditing(false);
        onCancel?.();
        setValue(originalValue);
      }
      if (ev.key === "Enter") {
        await handleSave(ev);
      }
    },
    [handleSave, onCancel, originalValue]
  );

  React.useEffect(() => {
    onEditing?.(isEditing);
  }, [onEditing, isEditing]);

  return (
    <>
      {isEditing ? (
        <form onSubmit={handleSave}>
          <Input
            dir="auto"
            type="text"
            lang=""
            value={value}
            onClick={stopPropagation}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onBlur={handleSave}
            onFocus={handleFocus}
            autoFocus
            {...rest}
          />
        </form>
      ) : (
        <span
          onDoubleClick={canUpdate ? handleDoubleClick : undefined}
          className={rest.className}
        >
          {value}
        </span>
      )}
    </>
  );
}

const Input = styled.input`
  color: ${s("text")};
  background: ${s("background")};
  width: calc(100% + 12px);
  border-radius: 3px;
  border: 0;
  padding: 5px 6px;
  margin: -4px;
  height: 30px;

  &:focus {
    outline-color: ${s("accent")};
  }
`;

export default React.forwardRef(EditableTitle);
