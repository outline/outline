import React, { PropTypes } from 'react';
import { observer } from 'mobx-react';

import { Flex } from 'reflexbox';
import Tree from 'components/Tree';

import styles from './Sidebar.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

import treeStyles from 'components/Tree/Tree.scss';

@observer
class Sidebar extends React.Component {
  static propTypes = {
    open: PropTypes.bool,
    onToggle: PropTypes.func.isRequired,
    navigationTree: PropTypes.object.isRequired,
    onNavigationUpdate: PropTypes.func.isRequired,
    onNodeCollapse: PropTypes.func.isRequired,
  }

  renderNode = (node) => {
    return (
      <span className={ treeStyles.nodeLabel } onClick={ this.onClickNode.bind(null, node) }>
        { node.module.name }
      </span>
    );
  }

  render() {
    return (
      <Flex>
        { this.props.open && (
          <div className={ cx(styles.sidebar) }>
            <Tree
              paddingLeft={ 10 }
              tree={ this.props.navigationTree }
              onChange={ this.props.onNavigationUpdate }
              onCollapse={ this.props.onNodeCollapse }
              renderNode={ this.renderNode }
            />
          </div>
        ) }
        <div
          onClick={ this.props.onToggle }
          className={ styles.sidebarToggle }
          title="Toggle sidebar (Cmd+/)"
        >
          <img
            src={ require("assets/icons/menu.svg") }
            className={ styles.menuIcon }
            alt="Menu"
          />
        </div>
      </Flex>
    );
  }
}

export default Sidebar;
