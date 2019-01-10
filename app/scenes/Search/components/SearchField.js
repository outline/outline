// @flow
import * as React from 'react';
import { lighten } from 'polished';
import styled, { withTheme } from 'styled-components';
import { SearchIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';

type Props = {
  onChange: string => *,
  theme: Object,
};

class SearchField extends React.Component<Props> {
  input: ?HTMLInputElement;

  handleChange = (ev: SyntheticEvent<*>) => {
    this.props.onChange(ev.currentTarget.value ? ev.currentTarget.value : '');
  };

  focusInput = (ev: SyntheticEvent<*>) => {
    if (this.input) this.input.focus();
  };

  render() {
    return (
      <Field align="center">
        <StyledIcon
          type="Search"
          size={48}
          color={lighten(0.1, this.props.theme.slate)}
          onClick={this.focusInput}
        />
        <StyledInput
          {...this.props}
          ref={ref => (this.input = ref)}
          onChange={this.handleChange}
          spellCheck="false"
          placeholder="search…"
          type="search"
          autoFocus
        />
      </Field>
    );
  }
}

const Field = styled(Flex)`
  position: relative;
  margin-bottom: 8px;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 10px 10px 10px 60px;
  font-size: 36px;
  font-weight: 400;
  outline: none;
  border: 0;
  background: ${props => props.theme.smoke};
  border-radius: 4px;

  ::-webkit-search-cancel-button {
    -webkit-appearance: searchfield-cancel-button;
  }

  ::-webkit-input-placeholder {
    color: ${props => props.theme.slate};
  }
  :-moz-placeholder {
    color: ${props => props.theme.slate};
  }
  ::-moz-placeholder {
    color: ${props => props.theme.slate};
  }
  :-ms-input-placeholder {
    color: ${props => props.theme.slate};
  }
`;

const StyledIcon = styled(SearchIcon)`
  position: absolute;
  left: 8px;
`;

export default withTheme(SearchField);
