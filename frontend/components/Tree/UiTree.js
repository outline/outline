const React = require('react');
const Tree = require('./Tree');
const Node = require('./Node');

import styles from './Tree.scss';

module.exports = React.createClass({
  displayName: 'UITree',

  propTypes: {
    tree: React.PropTypes.object.isRequired,
    paddingLeft: React.PropTypes.number,
    onCollapse: React.PropTypes.func,
    allowUpdates: React.PropTypes.bool,
  },

  getDefaultProps() {
    return {
      paddingLeft: 20,
    };
  },

  getInitialState() {
    return this.init(this.props);
  },

  componentWillReceiveProps(nextProps) {
    if (!this._updated) this.setState(this.init(nextProps));
    else this._updated = false;
  },

  init(props) {
    const tree = new Tree(props.tree);
    tree.isNodeCollapsed = props.isNodeCollapsed;
    tree.changeNodeCollapsed = props.changeNodeCollapsed;
    tree.updateNodesPosition();

    return {
      tree,
      dragging: {
        id: null,
        x: null,
        y: null,
        w: null,
        h: null,
      },
    };
  },

  getDraggingDom() {
    const tree = this.state.tree;
    const dragging = this.state.dragging;

    if (dragging && dragging.id) {
      const draggingIndex = tree.getIndex(dragging.id);
      const draggingStyles = {
        top: dragging.y,
        left: dragging.x,
        width: dragging.w,
      };

      return (
        <div className={styles.draggable} style={draggingStyles}>
          <Node
            tree={tree}
            index={draggingIndex}
            paddingLeft={this.props.paddingLeft}
            allowUpdates={this.props.allowUpdates}
          />
        </div>
      );
    }

    return null;
  },

  render() {
    const tree = this.state.tree;
    const dragging = this.state.dragging;
    const draggingDom = this.getDraggingDom();

    return (
      <div className={styles.tree}>
        {draggingDom}
        <Node
          rootNode
          tree={tree}
          index={tree.getIndex(1)}
          key={1}
          paddingLeft={this.props.paddingLeft}
          allowUpdates={this.props.allowUpdates}
          onDragStart={this.dragStart}
          onCollapse={this.toggleCollapse}
          dragging={dragging && dragging.id}
        />
      </div>
    );
  },

  dragStart(id, dom, e) {
    this.dragging = {
      id,
      w: dom.offsetWidth,
      h: dom.offsetHeight,
      x: dom.offsetLeft,
      y: dom.offsetTop,
    };

    this._startX = dom.offsetLeft;
    this._startY = dom.offsetTop;
    this._offsetX = e.clientX;
    this._offsetY = e.clientY;
    this._start = true;

    window.addEventListener('mousemove', this.drag);
    window.addEventListener('mouseup', this.dragEnd);
  },

  // oh
  drag(e) {
    if (this._start) {
      this.setState({
        dragging: this.dragging,
      });
      this._start = false;
    }

    const tree = this.state.tree;
    const dragging = this.state.dragging;
    const paddingLeft = this.props.paddingLeft;
    let newIndex = null;
    let index = tree.getIndex(dragging.id);
    const collapsed = index.node.collapsed;

    const _startX = this._startX;
    const _startY = this._startY;
    const _offsetX = this._offsetX;
    const _offsetY = this._offsetY;

    const pos = {
      x: _startX + e.clientX - _offsetX,
      y: _startY + e.clientY - _offsetY,
    };
    dragging.x = pos.x;
    dragging.y = pos.y;

    const diffX = dragging.x - paddingLeft / 2 - (index.left - 2) * paddingLeft;
    const diffY = dragging.y - dragging.h / 2 - (index.top - 2) * dragging.h;

    if (diffX < 0) {
      // left
      if (index.parent && !index.next) {
        newIndex = tree.move(index.id, index.parent, 'after');
      }
    } else if (diffX > paddingLeft) {
      // right
      if (index.prev) {
        const prevNode = tree.getIndex(index.prev).node;
        if (!prevNode.collapsed && !prevNode.leaf) {
          newIndex = tree.move(index.id, index.prev, 'append');
        }
      }
    }

    if (newIndex) {
      index = newIndex;
      newIndex.node.collapsed = collapsed;
      dragging.id = newIndex.id;
    }

    if (diffY < 0) {
      // up
      const above = tree.getNodeByTop(index.top - 1);
      newIndex = tree.move(index.id, above.id, 'before');
    } else if (diffY > dragging.h) {
      // down
      if (index.next) {
        var below = tree.getIndex(index.next);
        if (below.children && below.children.length && !below.node.collapsed) {
          newIndex = tree.move(index.id, index.next, 'prepend');
        } else {
          newIndex = tree.move(index.id, index.next, 'after');
        }
      } else {
        var below = tree.getNodeByTop(index.top + index.height);
        if (below && below.parent !== index.id) {
          if (below.children && below.children.length) {
            newIndex = tree.move(index.id, below.id, 'prepend');
          } else {
            newIndex = tree.move(index.id, below.id, 'after');
          }
        }
      }
    }

    if (newIndex) {
      newIndex.node.collapsed = collapsed;
      dragging.id = newIndex.id;
    }

    this.setState({
      tree,
      dragging,
    });
  },

  dragEnd() {
    this.setState({
      dragging: {
        id: null,
        x: null,
        y: null,
        w: null,
        h: null,
      },
    });

    this.change(this.state.tree);
    window.removeEventListener('mousemove', this.drag);
    window.removeEventListener('mouseup', this.dragEnd);
  },

  change(tree) {
    this._updated = true;
    if (this.props.onChange) this.props.onChange(tree.obj);
  },

  toggleCollapse(nodeId) {
    const tree = this.state.tree;
    const index = tree.getIndex(nodeId);
    const node = index.node;
    node.collapsed = !node.collapsed;
    tree.updateNodesPosition();

    this.setState({
      tree,
    });

    if (this.props.onCollapse) this.props.onCollapse(node.id, node.collapsed);
  },

  // buildTreeNumbering(tree) {
  //   const numberBuilder = (index, node, parentNumbering) => {
  //     let numbering = parentNumbering ? `${parentNumbering}.${index}` : index;
  //     let children;
  //     if (node.children) {
  //       children = node.children.map((child, childIndex) => {
  //         return numberBuilder(childIndex+1, child, numbering);
  //       });
  //     }

  //     const data = {
  //       module: {
  //         ...node.module,
  //         index: numbering,
  //       }
  //     }
  //     if (children) {
  //       data.children = children;
  //     }

  //     return data;
  //   };

  //   const newTree = {...tree};
  //   newTree.children = [];
  //   tree.children.forEach((child, index) => {
  //     newTree.children.push(numberBuilder(index+1, child));
  //   })
  //   return newTree;
  // }
});
