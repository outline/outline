// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import {
  CollectionIcon,
  AcademicCapIcon,
  BeakerIcon,
  BuildingBlocksIcon,
  CloudIcon,
  CodeIcon,
  EyeIcon,
  PadlockIcon,
  PaletteIcon,
  MoonIcon,
  SunIcon,
} from 'outline-icons';
import styled from 'styled-components';
import Fade from 'components/Fade';
import { LabelText } from 'components/Input';

const icons = {
  collection: CollectionIcon,
  academicCap: AcademicCapIcon,
  beaker: BeakerIcon,
  buildingBlocks: BuildingBlocksIcon,
  cloud: CloudIcon,
  code: CodeIcon,
  eye: EyeIcon,
  padlock: PadlockIcon,
  palette: PaletteIcon,
  moon: MoonIcon,
  sun: SunIcon,
};

type Props = {
  onChange: (icon: string) => void,
  value?: string,
};

@observer
class IconPicker extends React.Component<Props> {
  @observable isOpen: boolean = false;
  node: ?HTMLElement;

  componentDidMount() {
    window.addEventListener('click', this.handleClickOutside);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.handleClickOutside);
  }

  handleClose = () => {
    this.isOpen = false;
  };

  handleOpen = () => {
    this.isOpen = true;
  };

  handleClickOutside = (ev: SyntheticMouseEvent<>) => {
    // $FlowFixMe
    if (ev.target && this.node && this.node.contains(ev.target)) {
      return;
    }

    this.handleClose();
  };

  render() {
    const Component = icons[this.props.value || 'collection'];

    return (
      <Wrapper ref={ref => (this.node = ref)}>
        <label>
          <LabelText>Icon</LabelText>
        </label>
        <Component
          role="button"
          onClick={this.isOpen ? this.handleClose : this.handleOpen}
        />
        <Floating>
          {this.isOpen && (
            <Fade>
              {Object.keys(icons).map(name => {
                const Component = icons[name];
                return (
                  <Component
                    onClick={() => this.props.onChange(name)}
                    size={30}
                  />
                );
              })}
            </Fade>
          )}
        </Floating>
      </Wrapper>
    );
  }
}

const Wrapper = styled('div')`
  display: inline-block;
  position: relative;
`;
const Floating = styled('div')`
  position: absolute;
  top: 60px;
  right: 0;
  z-index: 1;
`;

export default IconPicker;
