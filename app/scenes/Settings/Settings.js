// @flow
import React, { Component } from 'react';
import { observable, runInAction } from 'mobx';
import { observer, inject } from 'mobx-react';
import invariant from 'invariant';
import styled from 'styled-components';
import { color, size } from 'shared/styles/constants';

import { client } from 'utils/ApiClient';
import AuthStore from 'stores/AuthStore';
import ErrorsStore from 'stores/ErrorsStore';
import Input from 'components/Input';
import Button from 'components/Button';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';

@observer
class Settings extends Component {
  timeout: number;
  props: {
    auth: AuthStore,
    errors: ErrorsStore,
  };

  @observable name: string;
  @observable updated: boolean;
  @observable isSaving: boolean;

  componentDidMount() {
    if (this.props.auth.user) {
      this.name = this.props.auth.user.name;
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    this.isSaving = true;

    try {
      const res = await client.post(`/user.update`, {
        name: this.name,
      });
      invariant(res && res.data, 'Document list not available');
      const { data } = res;
      runInAction('Settings#handleSubmit', () => {
        this.props.auth.user = data;
        this.updated = true;
        this.timeout = setTimeout(() => (this.updated = false), 2500);
      });
    } catch (e) {
      this.props.errors.add('Failed to load documents');
    } finally {
      this.isSaving = false;
    }
  };

  handleNameChange = (ev: SyntheticInputEvent) => {
    this.name = ev.target.value;
  };

  render() {
    const { user } = this.props.auth;
    if (!user) return null;

    return (
      <CenteredContent>
        <PageTitle title="Profile" />
        <h1>Profile</h1>

        <form onSubmit={this.handleSubmit}>
          <Input
            label="Name"
            value={this.name}
            onChange={this.handleNameChange}
            required
          />
          <Button type="submit" disabled={this.isSaving || !this.name}>
            Save
          </Button>
          <SuccessMessage visible={this.updated}>
            Profile updated!
          </SuccessMessage>
        </form>
      </CenteredContent>
    );
  }
}

const SuccessMessage = styled.span`
  margin-left: ${size.large};
  color: ${color.slate};
  opacity: ${props => (props.visible ? 1 : 0)};

  transition: opacity 0.25s;
`;

export default inject('auth', 'errors', 'auth')(Settings);
