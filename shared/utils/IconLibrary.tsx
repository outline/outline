import {
  faApple,
  faWindows,
  faAndroid,
  faSquareJs,
  faPython,
  faWebAwesome,
  faXTwitter,
  faBluesky,
  faGithub,
  faGitlab,
  faDiscord,
  faDocker,
  faCodepen,
  faDropbox,
  faPaypal,
  faShopify,
  faSwift,
  faSlack,
} from "@fortawesome/free-brands-svg-icons";
import {
  faBagShopping,
  faBook,
  faBrush,
  faCake,
  faCat,
  faClapperboard,
  faCompactDisc,
  faCookieBite,
  faCrow,
  faCrown,
  faCube,
  faDna,
  faDog,
  faDollarSign,
  faDisplay,
  faDroplet,
  faFaceDizzy,
  faFaceGrinStars,
  faFaceLaugh,
  faFaceMeh,
  faFaceSmileBeam,
  faFaceSmileWink,
  faFaceSurprise,
  faFeather,
  faFish,
  faGamepad,
  faGauge,
  faGem,
  faGift,
  faHammer,
  faHeart,
  faIndustry,
  faKitMedical,
  faLaptop,
  faLaptopCode,
  faMagnet,
  faMap,
  faMicrochip,
  faMountainSun,
  faMugHot,
  faNetworkWired,
  faNewspaper,
  faPaintRoller,
  faPassport,
  faPaw,
  faPenRuler,
  faPesoSign,
  faPhoneVolume,
  faPizzaSlice,
  faPrescription,
  faPuzzlePiece,
  faRainbow,
  faRecordVinyl,
  faRoad,
  faRobot,
  faRocket,
  faSailboat,
  faScissors,
  faSeedling,
  faShield,
  faShirt,
  faShop,
  faSnowflake,
  faSocks,
  faSolarPanel,
  faSpa,
  faStarAndCrescent,
  faStarOfLife,
  faSterlingSign,
  faSwatchbook,
  faTent,
  faTooth,
  faTowerCell,
  faTractor,
  faTrain,
  faTree,
  faTrophy,
  faUmbrella,
  faUmbrellaBeach,
  faUniversalAccess,
  faUserGraduate,
  faUtensils,
  faVault,
  faWandSparkles,
  faWheelchairMove,
  faWorm,
  faYenSign,
  faHandsClapping,
  faFolderClosed,
  faFlaskVial,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import intersection from "lodash/intersection";
import {
  BookmarkedIcon,
  BicycleIcon,
  AcademicCapIcon,
  BeakerIcon,
  BuildingBlocksIcon,
  BrowserIcon,
  CollectionIcon,
  CoinsIcon,
  CameraIcon,
  CarrotIcon,
  FlameIcon,
  HashtagIcon,
  GraphIcon,
  InternetIcon,
  LibraryIcon,
  PlaneIcon,
  RamenIcon,
  CloudIcon,
  CodeIcon,
  EditIcon,
  EmailIcon,
  EyeIcon,
  GlobeIcon,
  InfoIcon,
  IceCreamIcon,
  ImageIcon,
  LeafIcon,
  LightBulbIcon,
  MathIcon,
  MoonIcon,
  NotepadIcon,
  TeamIcon,
  PadlockIcon,
  PaletteIcon,
  PromoteIcon,
  QuestionMarkIcon,
  SportIcon,
  SunIcon,
  ShapesIcon,
  TargetIcon,
  TerminalIcon,
  ToolsIcon,
  VehicleIcon,
  WarningIcon,
  DatabaseIcon,
  SmileyIcon,
  LightningIcon,
  ClockIcon,
  DoneIcon,
  FeedbackIcon,
  ServerRackIcon,
  ThumbsUpIcon,
  TruckIcon,
} from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import LetterIcon from "../components/LetterIcon";

type IconMapping = {
  component: React.ComponentType<FAProps>;
  keywords?: string;
};

type FAProps = {
  color?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

export class IconLibrary {
  /**
   * Get the component for a given icon name
   *
   * @param icon The name of the icon
   * @returns The component for the icon
   */
  public static getComponent(icon: string) {
    return this.mapping[icon].component;
  }

  /**
   * Find an icon by keyword. This is useful for searching for an icon based on a user's input.
   *
   * @param keyword The keyword to search for
   * @returns The name of the icon that matches the keyword, or undefined if no match is found
   */
  public static findIconByKeyword(keyword: string) {
    const keys = Object.keys(this.mapping);

    for (const key of keys) {
      const icon = this.mapping[key];
      const keywords = icon.keywords?.split(" ");
      const namewords = keyword.toLocaleLowerCase().split(" ");
      const matches = intersection(namewords, keywords);

      if (matches.length > 0) {
        return key;
      }
    }

    return undefined;
  }

  /**
   * Find icons.
   *
   * @param query The query to search for
   * @returns The icon results.
   */
  public static findIcons(query: string) {
    return Object.keys(this.mapping)
      .map((key) => {
        const icon = this.mapping[key];
        const keywords = `${icon.keywords ?? ""} ${key}`;

        if (keywords.includes(query.toLocaleLowerCase())) {
          return key;
        }
        return undefined;
      })
      .filter((icon: string | undefined): icon is string => !!icon);
  }

  /**
   * A map of all icons available to end users in the app. This does not include icons that are used
   * internally only, which can be imported from `outline-icons` directly.
   */
  public static mapping: Record<string, IconMapping> = {
    // Internal icons
    academicCap: {
      component: AcademicCapIcon,
      keywords: "learn teach lesson guide tutorial onboarding training",
    },
    bicycle: {
      component: BicycleIcon,
      keywords: "bicycle bike cycle",
    },
    beaker: {
      component: BeakerIcon,
      keywords: "lab research experiment test",
    },
    buildingBlocks: {
      component: BuildingBlocksIcon,
      keywords: "app blocks product prototype",
    },
    bookmark: {
      component: BookmarkedIcon,
      keywords: "bookmark",
    },
    browser: {
      component: BrowserIcon,
      keywords: "browser web app",
    },
    collection: {
      component: (props) => <CollectionIcon expanded {...props} />,
      keywords: "collection",
    },
    coins: {
      component: CoinsIcon,
      keywords: "coins money finance sales income revenue cash",
    },
    camera: {
      component: CameraIcon,
      keywords: "photo picture",
    },
    carrot: {
      component: CarrotIcon,
      keywords: "food vegetable produce",
    },
    clock: {
      component: ClockIcon,
      keywords: "time",
    },
    cloud: {
      component: CloudIcon,
      keywords: "cloud service aws infrastructure",
    },
    code: {
      component: CodeIcon,
      keywords: "developer api code development engineering programming",
    },
    database: {
      component: DatabaseIcon,
      keywords: "server ops database",
    },
    done: {
      component: DoneIcon,
      keywords: "checkmark success complete finished",
    },
    email: {
      component: EmailIcon,
      keywords: "email at",
    },
    eye: {
      component: EyeIcon,
      keywords: "eye view",
    },
    feedback: {
      component: FeedbackIcon,
      keywords: "faq help support",
    },
    flame: {
      component: FlameIcon,
      keywords: "fire flame hot",
    },
    graph: {
      component: GraphIcon,
      keywords: "chart analytics data",
    },
    globe: {
      component: GlobeIcon,
      keywords: "world translate",
    },
    hashtag: {
      component: HashtagIcon,
      keywords: "social media tag",
    },
    info: {
      component: InfoIcon,
      keywords: "info information",
    },
    icecream: {
      component: IceCreamIcon,
      keywords: "food dessert cone scoop",
    },
    image: {
      component: ImageIcon,
      keywords: "image photo picture",
    },
    internet: {
      component: InternetIcon,
      keywords: "network global globe world",
    },
    leaf: {
      component: LeafIcon,
      keywords: "leaf plant outdoors nature ecosystem climate",
    },
    library: {
      component: LibraryIcon,
      keywords: "library collection archive",
    },
    lightbulb: {
      component: LightBulbIcon,
      keywords: "lightbulb idea",
    },
    lightning: {
      component: LightningIcon,
      keywords: "lightning fast zap",
    },
    letter: {
      component: LetterIcon,
      keywords: "letter",
    },
    math: {
      component: MathIcon,
      keywords: "math formula",
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
    plane: {
      component: PlaneIcon,
      keywords: "airplane travel flight trip vacation",
    },
    promote: {
      component: PromoteIcon,
      keywords: "marketing promotion",
    },
    ramen: {
      component: RamenIcon,
      keywords: "soup food noodle bowl meal",
    },
    question: {
      component: QuestionMarkIcon,
      keywords: "question help support faq",
    },
    server: {
      component: ServerRackIcon,
      keywords: "ops infra server",
    },
    sun: {
      component: SunIcon,
      keywords: "day sun weather",
    },
    shapes: {
      component: ShapesIcon,
      keywords: "blocks toy",
    },
    sport: {
      component: SportIcon,
      keywords: "sport outdoor racket game",
    },
    smiley: {
      component: SmileyIcon,
      keywords: "emoji smiley happy",
    },
    target: {
      component: TargetIcon,
      keywords: "target goal sales",
    },
    team: {
      component: TeamIcon,
      keywords: "team building organization office",
    },
    terminal: {
      component: TerminalIcon,
      keywords: "terminal code",
    },
    thumbsup: {
      component: ThumbsUpIcon,
      keywords: "like social favorite upvote",
    },
    truck: {
      component: TruckIcon,
      keywords: "truck transport vehicle",
    },
    tools: {
      component: ToolsIcon,
      keywords: "tool settings",
    },
    vehicle: {
      component: VehicleIcon,
      keywords: "truck car travel transport",
    },
    warning: {
      component: WarningIcon,
      keywords: "warning alert error",
    },

    // Font awesome
    ...Object.fromEntries(
      [
        faBagShopping,
        faBook,
        faBrush,
        faCake,
        faCat,
        faClapperboard,
        faCompactDisc,
        faCookieBite,
        faCrow,
        faCrown,
        faCube,
        faDna,
        faDog,
        faDollarSign,
        faDisplay,
        faDroplet,
        faFaceDizzy,
        faFaceGrinStars,
        faFaceLaugh,
        faFaceMeh,
        faFaceSmileBeam,
        faFaceSmileWink,
        faFaceSurprise,
        faFeather,
        faFish,
        faFolderClosed,
        faFlaskVial,
        faGamepad,
        faGauge,
        faGem,
        faGift,
        faHammer,
        faHandsClapping,
        faHeart,
        faIndustry,
        faKitMedical,
        faLaptop,
        faLaptopCode,
        faMagnet,
        faMap,
        faMicrochip,
        faMountainSun,
        faMugHot,
        faNetworkWired,
        faNewspaper,
        faPaintRoller,
        faPassport,
        faPaw,
        faPenRuler,
        faPesoSign,
        faPhoneVolume,
        faPizzaSlice,
        faPrescription,
        faPuzzlePiece,
        faRainbow,
        faRecordVinyl,
        faRoad,
        faRobot,
        faRocket,
        faSailboat,
        faScissors,
        faSeedling,
        faShield,
        faShirt,
        faShop,
        faSnowflake,
        faSocks,
        faSolarPanel,
        faSpa,
        faStarAndCrescent,
        faStarOfLife,
        faSterlingSign,
        faSwatchbook,
        faTent,
        faTooth,
        faTowerCell,
        faTractor,
        faTrain,
        faTree,
        faTrophy,
        faUmbrella,
        faUmbrellaBeach,
        faUniversalAccess,
        faUserGraduate,
        faUtensils,
        faVault,
        faWandSparkles,
        faWebAwesome,
        faWheelchairMove,
        faWorm,
        faYenSign,
        faApple,
        faWindows,
        faAndroid,
        faSquareJs,
        faPython,
        faXTwitter,
        faBluesky,
        faGithub,
        faGitlab,
        faDiscord,
        faDocker,
        faCodepen,
        faDropbox,
        faPaypal,
        faShopify,
        faSwift,
        faSlack,
      ].map((icon) => [
        icon.iconName,
        {
          component: ({ color, size = 24, className, style }: FAProps) => (
            <FontAwesomeWrapper size={size}>
              <FontAwesomeIcon
                style={{
                  width: 0.6666666667 * size,
                  height: 0.6666666667 * size,
                  ...style,
                }}
                color={color}
                icon={icon}
                className={className}
              />
            </FontAwesomeWrapper>
          ),
        },
      ])
    ),
  } as const;
}

const FontAwesomeWrapper = styled.span<{ size: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
`;
