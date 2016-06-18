var React = require('react');

import styles from './Tree.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

var Node = React.createClass({
  displayName: 'UITreeNode',

  renderCollapse() {
    var index = this.props.index;

    if(index.children && index.children.length) {
      var collapsed = index.node.collapsed;

      return (
        <span
          className={cx(styles.collapse, collapsed ? styles.caretRight : styles.caretDown)}
          onMouseDown={function(e) {e.stopPropagation()}}
          onClick={this.handleCollapse}
        >
          <img src={ require("./assets/chevron.svg") } />
        </span>
      );
    }

    return null;
  },

  renderChildren() {
    var index = this.props.index;
    var tree = this.props.tree;
    var dragging = this.props.dragging;

    if(index.children && index.children.length) {
      var childrenStyles = {};

      if (!this.props.rootNode) {
        if(index.node.collapsed) childrenStyles.display = 'none';
        childrenStyles['paddingLeft'] = this.props.paddingLeft + 'px';
      }

      return (
        <div className={ styles.children } style={childrenStyles}>
          {index.children.map((child) => {
            var childIndex = tree.getIndex(child);
            return (
              <Node
                tree={tree}
                index={childIndex}
                key={childIndex.id}
                dragging={dragging}
                paddingLeft={this.props.paddingLeft}
                onCollapse={this.props.onCollapse}
                onDragStart={this.props.onDragStart}
              />
            );
          })}
        </div>
      );
    }

    return null;
  },

  render() {
    var tree = this.props.tree;
    var index = this.props.index;
    var dragging = this.props.dragging;
    var node = index.node;
    var style = {};

    return (
      <div className={cx(styles.node, {
        placeholder: index.id === dragging,
        rootNode: this.props.rootNode,
      })} style={style}>
        <div className={ styles.inner } ref="inner" onMouseDown={this.handleMouseDown}>
          {!this.props.rootNode && this.renderCollapse()}
          <span
            className={ cx(styles.nodeLabel, { rootLabel: this.props.rootNode }) }
            onClick={() => {}}
            onMouseDown={this.props.rootNode ? function(e){e.stopPropagation()} : undefined}
          >
            {node.name}
          </span>
        </div>
        {this.renderChildren()}
      </div>
    );
  },

  handleCollapse(e) {
    e.stopPropagation();
    var nodeId = this.props.index.id;
    if(this.props.onCollapse) this.props.onCollapse(nodeId);
  },

  handleMouseDown(e) {
    var nodeId = this.props.index.id;
    var dom = this.refs.inner;

    if(this.props.onDragStart) {
      this.props.onDragStart(nodeId, dom, e);
    }
  }
});

module.exports = Node;