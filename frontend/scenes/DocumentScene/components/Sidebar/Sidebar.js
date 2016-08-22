import React, { PropTypes } from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router';

import { Flex } from 'reflexbox';
import Tree from 'components/Tree';
import Separator from './components/Separator';

import styles from './Sidebar.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

import SidebarStore from './SidebarStore';

// import treeStyles from 'components/Tree/Tree.scss';

@observer
class Sidebar extends React.Component {
  static store;

  static propTypes = {
    open: PropTypes.bool,
    onToggle: PropTypes.func.isRequired,
    navigationTree: PropTypes.object.isRequired,
    onNavigationUpdate: PropTypes.func.isRequired,
    onNodeCollapse: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    this.store = new SidebarStore();
  }

  toggleEdit = (e) => {
    e.preventDefault();
    this.store.toggleEdit();
  }

  render() {
    return (
      <Flex>
        { this.props.open && (
          <Flex column className={ cx(styles.sidebar) }>
            <Flex auto className={ cx(styles.content) }>
              <Tree
                paddingLeft={ 10 }
                tree={ this.props.navigationTree }
                allowUpdates={ this.store.isEditing }
                onChange={ this.props.onNavigationUpdate }
                onCollapse={ this.props.onNodeCollapse }
              />
            </Flex>
            <Flex auto className={ styles.actions }>
              <Link
                to={ `${this.props.navigationTree.url}/new` }
                className={ cx(styles.action) }
              >
                Add document
              </Link>
              <Separator />
              <a
                href
                onClick={ this.toggleEdit }
                className={ cx(styles.action, { active: this.store.isEditing }) }
              >Organize</a>
            </Flex>
          </Flex>
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
