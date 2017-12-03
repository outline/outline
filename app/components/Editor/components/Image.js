// @flow
import React, { Component } from 'react';
import ImageZoom from 'react-medium-image-zoom';
import styled from 'styled-components';
import type { props } from 'slate-prop-types';
import { color } from 'shared/styles/constants';

class Image extends Component {
  props: props;

  handleChange = (ev: SyntheticInputEvent) => {
    const alt = ev.target.value;
    const { editor, node } = this.props;
    const data = node.data.toObject();

    editor.onChange(
      editor
        .getState()
        .change()
        .setNodeByKey(node.key, { data: { ...data, alt } })
    );
  };

  handleClick = (ev: SyntheticInputEvent) => {
    ev.stopPropagation();
  };

  render() {
    const { attributes, state, node, readOnly } = this.props;
    const loading = node.data.get('loading');
    const caption = node.data.get('alt');
    const src = node.data.get('src');
    const active = state.isFocused && state.selection.hasEdgeIn(node);
    const showCaption = !readOnly || caption;

    return (
      <CenteredImage>
        {!readOnly ? (
          <StyledImg
            {...attributes}
            src={src}
            alt={caption}
            active={active}
            loading={loading}
          />
        ) : (
          <ImageZoom
            image={{
              src,
              alt: caption,
              style: {
                maxWidth: '100%',
              },
              ...attributes,
            }}
            shouldRespectMaxDimension
          />
        )}
        {showCaption && (
          <Caption
            type="text"
            placeholder="Write a caption"
            onChange={this.handleChange}
            onClick={this.handleClick}
            defaultValue={caption}
            contentEditable={false}
            disabled={readOnly}
            tabIndex={-1}
          />
        )}
      </CenteredImage>
    );
  }
}

const StyledImg = styled.img`
  max-width: 100%;
  box-shadow: ${props => (props.active ? `0 0 0 2px ${color.slate}` : '0')};
  border-radius: ${props => (props.active ? `2px` : '0')};
  opacity: ${props => (props.loading ? 0.5 : 1)};
`;

const CenteredImage = styled.div`
  text-align: center;
`;

const Caption = styled.input`
  border: 0;
  display: block;
  font-size: 13px;
  font-style: italic;
  color: ${color.slate};
  padding: 2px 0;
  line-height: 16px;
  text-align: center;
  width: 100%;
  outline: none;

  &::placeholder {
    color: ${color.slate};
  }
`;

export default Image;
