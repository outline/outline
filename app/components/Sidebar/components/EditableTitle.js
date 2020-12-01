// @flow
import * as React from "react";
import styled from "styled-components";
import useStores from "hooks/useStores";

type Props = {|
  onSubmit: (title: string) => Promise<void>,
  title: string,
  canUpdate: boolean,
|};

function EditableTitle({ title, onSubmit, canUpdate }: Props) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [originalValue, setOriginalValue] = React.useState(title);
  const [value, setValue] = React.useState(title);
  const { ui } = useStores();

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

  const handleSave = React.useCallback(async () => {
    setIsEditing(false);

    if (value === originalValue) {
      return;
    }

    if (document) {
      try {
        await onSubmit(value);
        setOriginalValue(value);
      } catch (error) {
        setValue(originalValue);
        ui.showToast(error.message);
        throw error;
      }
    }
  }, [ui, originalValue, value, onSubmit]);

  return (
    <>
      {isEditing ? (
        <form onSubmit={handleSave}>
          <Input
            type="text"
            value={value}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onBlur={handleSave}
            autoFocus
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
  margin-left: -4px;
  color: ${(props) => props.theme.sidebarText};
  background: ${(props) => props.theme.background};
  width: calc(100% - 10px);
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
