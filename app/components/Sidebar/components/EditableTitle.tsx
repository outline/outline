import * as React from "react";
import styled from "styled-components";
import useToasts from "~/hooks/useToasts";

type Props = {
  onSubmit: (title: string) => Promise<void>;
  onEditing?: (isEditing: boolean) => void;
  title: string;
  canUpdate: boolean;
  maxLength?: number;
};

function EditableTitle({
  title,
  onSubmit,
  canUpdate,
  onEditing,
  ...rest
}: Props) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [originalValue, setOriginalValue] = React.useState(title);
  const [value, setValue] = React.useState(title);
  const { showToast } = useToasts();

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

  const handleKeyDown = React.useCallback(
    (event) => {
      if (event.key === "Escape") {
        setIsEditing(false);
        setValue(originalValue);
      }
    },
    [originalValue]
  );

  const handleSave = React.useCallback(
    async (ev) => {
      ev.preventDefault();
      setIsEditing(false);
      const trimmedValue = value.trim();

      if (trimmedValue === originalValue || trimmedValue.length === 0) {
        setValue(originalValue);
        return;
      }

      if (document) {
        try {
          await onSubmit(trimmedValue);
          setOriginalValue(trimmedValue);
        } catch (error) {
          setValue(originalValue);
          showToast(error.message, {
            type: "error",
          });
          throw error;
        }
      }
    },
    [originalValue, showToast, value, onSubmit]
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
            value={value}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onBlur={handleSave}
            autoFocus
            {...rest}
          />
        </form>
      ) : (
        <span onDoubleClick={canUpdate ? handleDoubleClick : undefined}>
          {value}
        </span>
      )}
    </>
  );
}

const Input = styled.input`
  color: ${(props) => props.theme.sidebarText};
  background: ${(props) => props.theme.background};
  width: calc(100% + 12px);
  border-radius: 3px;
  border: 1px solid ${(props) => props.theme.inputBorderFocused};
  padding: 5px 6px;
  margin: -4px;
  height: 32px;

  &:focus {
    outline-color: ${(props) => props.theme.primary};
  }
`;

export default EditableTitle;
