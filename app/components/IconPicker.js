// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import {
  CollectionIcon,
  CoinsIcon,
  AcademicCapIcon,
  BeakerIcon,
  BuildingBlocksIcon,
  CloudIcon,
  CodeIcon,
  EditIcon,
  EyeIcon,
  LeafIcon,
  LightBulbIcon,
  MoonIcon,
  NotepadIcon,
  PadlockIcon,
  PaletteIcon,
  QuestionMarkIcon,
  SunIcon,
  VehicleIcon,
} from "outline-icons";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import styled from "styled-components";
import { DropdownMenu } from "components/DropdownMenu";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import { LabelText } from "components/Input";
import NudeButton from "components/NudeButton";

const TwitterPicker = React.lazy(() =>
  import("react-color/lib/components/twitter/Twitter")
);

export const icons = {
  collection: {
    component: CollectionIcon,
    keywords: "collection",
  },
  coins: {
    component: CoinsIcon,
    keywords: "coins money finance sales income revenue cash",
  },
  academicCap: {
    component: AcademicCapIcon,
    keywords: "learn teach lesson guide tutorial onboarding training",
  },
  beaker: {
    component: BeakerIcon,
    keywords: "lab research experiment test",
  },
  buildingBlocks: {
    component: BuildingBlocksIcon,
    keywords: "app blocks product prototype",
  },
  cloud: {
    component: CloudIcon,
    keywords: "cloud service aws infrastructure",
  },
  code: {
    component: CodeIcon,
    keywords: "developer api code development engineering programming",
  },
  eye: {
    component: EyeIcon,
    keywords: "eye view",
  },
  leaf: {
    component: LeafIcon,
    keywords: "leaf plant outdoors nature ecosystem climate",
  },
  lightbulb: {
    component: LightBulbIcon,
    keywords: "lightbulb idea",
  },
  moon: {
    component: MoonIcon,
    keywords: "night moon dark",
  },
  notepad: {
    component: NotepadIcon,
    keywords: "journal notepad write notes",
  },
  padlock: {
    component: PadlockIcon,
    keywords: "padlock private security authentication authorization auth",
  },
  palette: {
    component: PaletteIcon,
    keywords: "design palette art brand",
  },
  pencil: {
    component: EditIcon,
    keywords: "copy writing post blog",
  },
  question: {
    component: QuestionMarkIcon,
    keywords: "question help support faq",
  },
  sun: {
    component: SunIcon,
    keywords: "day sun weather",
  },
  vehicle: {
    component: VehicleIcon,
    keywords: "truck car travel transport",
  },
};

const colors = [
  "#4E5C6E",
  "#0366d6",
  "#9E5CF7",
  "#FF825C",
  "#FF5C80",
  "#FFBE0B",
  "#42DED1",
  "#00D084",
  "#FF4DFA",
  "#2F362F",
];

type Props = {
  onOpen?: () => void,
  onChange: (color: string, icon: string) => void,
  icon: string,
  color: string,
  t: TFunction,
};

function preventEventBubble(event) {
  event.stopPropagation();
}

@observer
class IconPicker extends React.Component<Props> {
  @observable isOpen: boolean = false;
  node: ?HTMLElement;

  componentDidMount() {
    window.addEventListener("click", this.handleClickOutside);
  }

  componentWillUnmount() {
    window.removeEventListener("click", this.handleClickOutside);
  }

  handleClose = () => {
    this.isOpen = false;
  };

  handleOpen = () => {
    this.isOpen = true;

    if (this.props.onOpen) {
      this.props.onOpen();
    }
  };

  handleClickOutside = (ev: SyntheticMouseEvent<>) => {
    // $FlowFixMe
    if (ev.target && this.node && this.node.contains(ev.target)) {
      return;
    }

    this.handleClose();
  };

  render() {
    const { t } = this.props;
    const Component = icons[this.props.icon || "collection"].component;

    return (
      <Wrapper ref={(ref) => (this.node = ref)}>
        <label>
          <LabelText>{t("Icon")}</LabelText>
        </label>
        <DropdownMenu
          onOpen={this.handleOpen}
          label={
            <LabelButton>
              <Component role="button" color={this.props.color} size={30} />
            </LabelButton>
          }
        >
          <Icons onClick={preventEventBubble}>
            {Object.keys(icons).map((name) => {
              const Component = icons[name].component;
              return (
                <IconButton
                  key={name}
                  onClick={() => this.props.onChange(this.props.color, name)}
                  style={{ width: 30, height: 30 }}
                >
                  <Component color={this.props.color} size={30} />
                </IconButton>
              );
            })}
          </Icons>
          <Flex onClick={preventEventBubble}>
            <React.Suspense fallback={<Loading>{t("Loading")}…</Loading>}>
              <ColorPicker
                color={this.props.color}
                onChange={(color) =>
                  this.props.onChange(color.hex, this.props.icon)
                }
                colors={colors}
                triangle="hide"
              />
            </React.Suspense>
          </Flex>
        </DropdownMenu>
      </Wrapper>
    );
  }
}

const Icons = styled.div`
  padding: 15px 9px 9px 15px;
  width: 276px;
`;

const LabelButton = styled(NudeButton)`
  border: 1px solid ${(props) => props.theme.inputBorder};
  width: 32px;
  height: 32px;
`;

const IconButton = styled(NudeButton)`
  border-radius: 4px;
  margin: 0px 6px 6px 0px;
  width: 30px;
  height: 30px;
`;

const Loading = styled(HelpText)`
  padding: 16px;
`;

const ColorPicker = styled(TwitterPicker)`
  box-shadow: none !important;
  background: transparent !important;
`;

const Wrapper = styled("div")`
  display: inline-block;
  position: relative;
`;

export default withTranslation()<IconPicker>(IconPicker);
