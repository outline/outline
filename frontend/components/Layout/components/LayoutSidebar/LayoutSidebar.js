// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { NavLink, withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { Flex } from 'reflexbox';
import { color } from 'styles/constants';

import UiStore from 'stores/UiStore';
import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  ui: UiStore,
  collections: CollectionsStore,
};

@observer class LayoutSidebar extends React.Component {
  props: Props;

  get activeStyle() {
    return {
      color: color.text,
    };
  }

  handleCollectionSelect = event => {
    this.props.collections.setActiveCollection(event.target.id);
  };

  handleBackLink = () => {
    this.props.ui.changeSidebarPanel('main');
  };

  renderCollectionSidebar() {
    const { collections } = this.props;
    const collection = collections.activeCollection;
    const rootDocument = collection.navigationTree;

    return (
      <div>
        <Section>
          <CollectionHeading onClick={this.handleBackLink}>
            <StyledBackIcon /> {collection.name}
          </CollectionHeading>

          <StyledLink
            key={rootDocument.id}
            to={rootDocument.url}
            activeStyle={this.activeStyle}
          >
            {rootDocument.title}
          </StyledLink>
          {collection.navigationTree.children.map(document => (
            <StyledLink
              key={document.id}
              to={document.url}
              activeStyle={this.activeStyle}
            >
              {document.title}
            </StyledLink>
          ))}
        </Section>
      </div>
    );
  }

  render() {
    const { ui, collections } = this.props;

    return (
      <Container column visible={ui.sidebarVisible}>
        <Section>
          <StyledLink to="/search" activeStyle={this.activeStyle}>
            Search
          </StyledLink>
          <StyledLink to="/dashboard" activeStyle={this.activeStyle}>
            Dashboard
          </StyledLink>
        </Section>

        <PanelContainer>
          <Panel primary visible={ui.sidebarPanel === 'main'}>
            <Section>
              {collections.isLoaded &&
                collections.data.map(collection => (
                  <StyledLink
                    key={collection.id}
                    to={collection.url}
                    activeStyle={this.activeStyle}
                  >
                    <span
                      onClick={this.handleCollectionSelect}
                      id={collection.id}
                    >
                      {collection.name}
                    </span>
                  </StyledLink>
                ))}
            </Section>
          </Panel>
          <Panel collection visible={ui.sidebarPanel === 'collection'}>
            {collections.activeCollection && this.renderCollectionSidebar()}
          </Panel>
        </PanelContainer>
      </Container>
    );
  }
}

const Container = styled(Flex)`
  width: 200px;
  margin-left: ${({ visible }) => (visible ? '0' : '-200px')};
  padding: 0px 0;
  opacity: ${({ visible }) => (visible ? '1' : '0')};

  transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
  transform: translateZ(0);
  transition: all 0.25s
`;

const PanelContainer = styled(Flex)`
  position: relative;
`;

const Section = styled(Flex)`
  padding: 0 25px;
  margin-bottom: 15px;
  flex-direction: column;
`;

const StyledLink = styled(NavLink)`
  margin-bottom: 10px;

  color: ${({ active }) => (active ? color.text : 'rgba(12,12,12,0.6)')};
`;

const CollectionHeading = styled.span`
  margin-bottom: 10px;

  color: rgba(12,12,12,0.6);
  cursor: pointer;
`;

// Panels

type PanelProps = {
  primary?: boolean,
  secondary?: boolean,
  visible: ?boolean,
  children: React.Element<any>,
};

const Panel = observer(({ children, ...props }: PanelProps) => {
  return (
    <PanelContent {...props}>
      {children}
    </PanelContent>
  );
});

const PanelContent = styled(Flex)`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  flex-direction: column;

  opacity: ${props => (props.visible ? '1' : '0')};
  z-index: ${props => (props.visible ? '1' : '0')};

  ${props => props.primary && props.visible && `
    margin-left: 0px;
  `}
  ${props => props.primary && !props.visible && `
    margin-left: -50px;
  `}

  ${props => props.collection && props.visible && `
    margin-left: 0px;
  `}
  ${props => props.collection && !props.visible && `
    margin-left: 50px;
  `}

  transform: translateZ(0);
  transition: all 0.25s
  transition-timing-function: cubic-bezier(0.65, 0.05, 0.36, 1);
`;

const BackIcon = props => (
  <svg
    width="9px"
    height="15px"
    viewBox="0 0 9 15"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g
      id="Page-1"
      stroke="none"
      stroke-width="1"
      fill="none"
      fill-rule="evenodd"
    >
      <g id="Back-arrow" fill="#0C0C0C">
        <rect
          id="Rectangle-3"
          transform="translate(4.242641, 4.242641) scale(-1, 1) rotate(45.000000) translate(-4.242641, -4.242641) "
          x="-0.757359313"
          y="3.24264069"
          width="10"
          height="2"
          rx="1"
        />
        <rect
          id="Rectangle-3-Copy-3"
          transform="translate(4.242641, 10.242641) scale(-1, -1) rotate(45.000000) translate(-4.242641, -10.242641) "
          x="-0.757359313"
          y="9.24264069"
          width="10"
          height="2"
          rx="1"
        />
      </g>
    </g>
  </svg>
);

const StyledBackIcon = styled(BackIcon)`
  height: 10px;
  margin-left: -13px;

  * {
    fill: ${color.text};
  }
`;

export default inject('ui', 'collections')(withRouter(LayoutSidebar));
