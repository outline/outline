// @flow
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';
import ToolbarButton from './ToolbarButton';
import DocumentResult from './DocumentResult';
import type { State } from '../../../types';
import DocumentsStore from 'stores/DocumentsStore';
import keydown from 'react-keydown';
import CloseIcon from 'components/Icon/CloseIcon';
import OpenIcon from 'components/Icon/OpenIcon';
import TrashIcon from 'components/Icon/TrashIcon';
import Flex from 'shared/components/Flex';

@keydown
@observer
class LinkToolbar extends Component {
  input: HTMLElement;
  firstDocument: HTMLElement;

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

  @action
  search = async () => {
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

  selectDocument = (ev, document) => {
    ev.preventDefault();
    this.save(document.url);
  };

  onKeyDown = (ev: SyntheticKeyboardEvent & SyntheticInputEvent) => {
    switch (ev.keyCode) {
      case 13: // enter
        ev.preventDefault();
        return this.save(ev.target.value);
      case 27: // escape
        return this.input.blur();
      case 40: // down
        ev.preventDefault();
        if (this.firstDocument) {
          const element = ReactDOM.findDOMNode(this.firstDocument);
          if (element instanceof HTMLElement) element.focus();
        }
        break;
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
      if (this.input.value) {
        this.props.onBlur();
      } else {
        this.removeLink();
      }
    }
  };

  removeLink = () => {
    this.save('');
  };

  openLink = () => {
    const href = this.props.link.data.get('href');
    window.open(href, '_blank');
  };

  save = (href: string) => {
    href = href.trim();
    const { state } = this.props;
    const transform = state.transform();

    if (href) {
      transform.setInline({ type: 'link', data: { href } });
    } else {
      transform.unwrapInline('link');
    }

    this.props.onChange(transform.apply());
    this.props.onBlur();
  };

  setFirstDocumentRef = ref => {
    this.firstDocument = ref;
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
          {this.isEditing && (
            <ToolbarButton onMouseDown={this.openLink}>
              <OpenIcon light />
            </ToolbarButton>
          )}
          <ToolbarButton onMouseDown={this.removeLink}>
            {this.isEditing ? <TrashIcon light /> : <CloseIcon light />}
          </ToolbarButton>
        </LinkEditor>
        {hasResults && (
          <SearchResults>
            <ArrowKeyNavigation
              mode={ArrowKeyNavigation.mode.VERTICAL}
              defaultActiveChildIndex={0}
            >
              {this.resultIds.map((id, index) => {
                const document = this.props.documents.getById(id);
                if (!document) return null;

                return (
                  <DocumentResult
                    innerRef={ref =>
                      index === 0 && this.setFirstDocumentRef(ref)
                    }
                    document={document}
                    key={document.id}
                    onClick={ev => this.selectDocument(ev, document)}
                  />
                );
              })}
            </ArrowKeyNavigation>
          </SearchResults>
        )}
      </span>
    );
  }
}

const SearchResults = styled.div`
  background: #2f3336;
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
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  padding: 4px 8px;
  border: 0;
  margin: 0;
  outline: none;
  color: #fff;
  flex-grow: 1;
`;

export default withRouter(inject('documents')(LinkToolbar));
