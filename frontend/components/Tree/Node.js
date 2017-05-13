/* eslint-disable */
import React from 'react';
import history from 'utils/History';
import styles from './Tree.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

class Node extends React.Component {
  displayName: 'UITreeNode';

  renderCollapse = () => {
    const index = this.props.index;

    if (index.children && index.children.length) {
      const collapsed = index.node.collapsed;

      return (
        <span
          className={cx(
            styles.collapse,
            collapsed ? styles.caretRight : styles.caretDown
          )}
          onMouseDown={function(e) {
            e.stopPropagation();
          }}
          onClick={this.handleCollapse}
        >
          <img alt="Expand" src={require('./assets/chevron.svg')} />
        </span>
      );
    }

    return null;
  };

  renderChildren = () => {
    const index = this.props.index;
    const tree = this.props.tree;
    const dragging = this.props.dragging;

    if (index.children && index.children.length) {
      const childrenStyles = {};

      if (!this.props.rootNode) {
        if (index.node.collapsed) childrenStyles.display = 'none';
        childrenStyles.paddingLeft = `${this.props.paddingLeft}px`;
      }

      return (
        <div className={styles.children} style={childrenStyles}>
          {index.children.map(child => {
            const childIndex = tree.getIndex(child);
            return (
              <Node
                tree={tree}
                index={childIndex}
                key={childIndex.id}
                dragging={dragging}
                allowUpdates={this.props.allowUpdates}
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
  };

  isModifying = () => {
    return this.props.allowUpdates && !this.props.rootNode;
  };

  onClick = () => {
    const index = this.props.index;
    const node = index.node;

    if (!this.isModifying()) history.push(node.url);
  };

  render() {
    const index = this.props.index;
    const dragging = this.props.dragging;
    const node = index.node;
    const style = {};

    return (
      <div
        className={cx(styles.node, {
          placeholder: index.id === dragging,
          rootNode: this.props.rootNode,
        })}
        style={style}
      >
        <div
          className={styles.inner}
          ref="inner"
          onMouseDown={
            this.props.rootNode || !this.props.allowUpdates
              ? e => e.stopPropagation()
              : this.handleMouseDown
          }
        >
          {!this.props.rootNode && this.renderCollapse()}
          <span
            className={cx(styles.nodeLabel, {
              rootLabel: this.props.rootNode,
              isModifying: this.isModifying(),
            })}
            onClick={this.onClick}
          >
            {node.title}
          </span>
        </div>
        {this.renderChildren()}
      </div>
    );
  }

  handleCollapse = e => {
    e.stopPropagation();
    const nodeId = this.props.index.id;
    if (this.props.onCollapse) this.props.onCollapse(nodeId);
  };

  handleMouseDown = e => {
    const nodeId = this.props.index.id;
    const dom = this.refs.inner;

    if (this.props.onDragStart) {
      this.props.onDragStart(nodeId, dom, e);
    }
  };
}

module.exports = Node;
