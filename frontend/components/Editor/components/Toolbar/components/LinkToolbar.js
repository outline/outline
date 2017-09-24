// @flow
import React, { Component } from 'react';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router';
import styled from 'styled-components';
import ToolbarButton from './ToolbarButton';
import DocumentResult from './DocumentResult';
import type { State } from '../../../types';
import DocumentsStore from 'stores/DocumentsStore';
import keydown from 'react-keydown';
import Icon from 'components/Icon';
import Flex from 'components/Flex';

@keydown
@observer
class LinkToolbar extends Component {
  input: HTMLElement;
  props: {
    state: State,
    link: Object,
    documents: DocumentsStore,
    onBlur: () => void,
    onChange: State => void,
  };

  @observable isEditing: boolean = false;
  @observable isFetching: boolean = false;
  @observable resultIds: string[] = [];
  @observable searchTerm: ?string = null;

  componentWillMount() {
    this.isEditing = !!this.props.link.data.get('href');
  }

  @action search = async () => {
    this.isFetching = true;

    if (this.searchTerm) {
      try {
        this.resultIds = await this.props.documents.search(this.searchTerm);
      } catch (err) {
        console.error(err);
      }
    } else {
      this.resultIds = [];
    }

    this.isFetching = false;
  };

  selectDocument = document => {
    this.save(`${BASE_URL}${document.url}`);
  };

  onKeyDown = (ev: SyntheticKeyboardEvent & SyntheticInputEvent) => {
    switch (ev.keyCode) {
      case 13: // enter
        ev.preventDefault();
        return this.save(ev.target.value);
      case 27: // escape
        return this.input.blur();
      default:
    }
  };

  onChange = (ev: SyntheticKeyboardEvent & SyntheticInputEvent) => {
    try {
      new URL(ev.target.value);
    } catch (err) {
      // this is not a valid url, show search suggestions
      this.searchTerm = ev.target.value;
      this.search();
      return;
    }
    this.resultIds = [];
  };

  onBlur = () => {
    if (!this.resultIds.length) {
      this.props.onBlur();
    }
  };

  removeLink = () => {
    this.save('');
  };

  openLink = () => {
    const href = this.props.link.data.get('href');
    console.log(href);
    window.open(href, '_blank');
  };

  save = (href: string) => {
    href = href.trim();
    const transform = this.props.state.transform();
    transform.unwrapInline('link');

    if (href) {
      const data = { href };
      transform.wrapInline({ type: 'link', data });
    }

    const state = transform.apply();
    this.props.onChange(state);
    this.props.onBlur();
  };

  render() {
    const href = this.props.link.data.get('href');
    const hasResults = this.resultIds.length > 0;

    return (
      <span>
        <LinkEditor>
          <Input
            innerRef={ref => (this.input = ref)}
            defaultValue={href}
            placeholder="Search or paste a link…"
            onBlur={this.onBlur}
            onKeyDown={this.onKeyDown}
            onChange={this.onChange}
            autoFocus
          />
          {this.isEditing &&
            <ToolbarButton onMouseDown={this.openLink}>
              <Icon type="ExternalLink" light />
            </ToolbarButton>}
          <ToolbarButton onMouseDown={this.removeLink}>
            {this.isEditing
              ? <Icon type="Trash2" light />
              : <Icon type="XCircle" light />}
          </ToolbarButton>
        </LinkEditor>
        {hasResults &&
          <SearchResults>
            {this.resultIds.map(id => {
              const document = this.props.documents.getById(id);
              if (!document) return null;

              return (
                <DocumentResult
                  document={document}
                  key={document.id}
                  onClick={this.selectDocument.bind(this, document)}
                />
              );
            })}
          </SearchResults>}
      </span>
    );
  }
}

const SearchResults = styled.ul`
  list-style: none;
  background: rgba(34, 34, 34, .95);
  position: absolute;
  top: 100%;
  width: 100%;
  height: auto;
  left: 0;
  padding: 8px;
  margin-top: -3px;
  margin-bottom: 0;
  border-radius: 0 0 4px 4px;
`;

const LinkEditor = styled(Flex)`
  margin-left: -8px;
  margin-right: -8px;
`;

const Input = styled.input`
  font-size: 15px;
  background: rgba(255,255,255,.1);
  border-radius: 2px;
  padding: 4px 8px;
  border: 0;
  margin: 0;
  outline: none;
  color: #fff;
  flex-grow: 1;
`;

export default withRouter(inject('documents')(LinkToolbar));
