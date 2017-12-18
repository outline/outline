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
import ImageUpload from './components/ImageUpload';
import Input, { LabelText } from 'components/Input';
import Button from 'components/Button';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import Flex from 'shared/components/Flex';

@observer
class Settings extends Component {
  timeout: number;
  props: {
    auth: AuthStore,
    errors: ErrorsStore,
  };

  @observable name: string;
  @observable avatarUrl: ?string;
  @observable isUpdated: boolean;
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
        avatarUrl: this.avatarUrl,
      });
      invariant(res && res.data, 'Document list not available');
      const { data } = res;
      runInAction('Settings#handleSubmit', () => {
        this.props.auth.user = data;
        this.isUpdated = true;
        this.timeout = setTimeout(() => (this.isUpdated = false), 2500);
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

  handleAvatarUpload = (avatarUrl: string) => {
    this.avatarUrl = avatarUrl;
  };

  handleAvatarError = (error: ?string) => {
    this.props.errors.add(error || 'Unable to upload new avatar');
  };

  render() {
    const { user } = this.props.auth;
    if (!user) return null;
    const avatarUrl = this.avatarUrl || user.avatarUrl;

    return (
      <CenteredContent>
        <PageTitle title="Profile" />
        <h1>Profile</h1>
        <ProfilePicture column>
          <LabelText>Profile picture</LabelText>
          <AvatarContainer>
            <ImageUpload
              onSuccess={this.handleAvatarUpload}
              onError={this.handleAvatarError}
            >
              <Avatar src={avatarUrl} />
              <Flex auto align="center" justify="center">
                Upload new image
              </Flex>
            </ImageUpload>
          </AvatarContainer>
        </ProfilePicture>
        <form onSubmit={this.handleSubmit}>
          <StyledInput
            label="Name"
            value={this.name}
            onChange={this.handleNameChange}
            required
          />
          <Button type="submit" disabled={this.isSaving || !this.name}>
            Save
          </Button>
          <SuccessMessage visible={this.isUpdated}>
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

const ProfilePicture = styled(Flex)`
  margin-bottom: ${size.huge};
`;

const avatarStyles = `
  width: 150px;
  height: 150px;
  border-radius: 50%;
`;

const AvatarContainer = styled(Flex)`
  ${avatarStyles};
  position: relative;

  div div {
    ${avatarStyles};
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    opacity: 0;
    cursor: pointer;
    transition: all 250ms;
  }

  &:hover div {
    opacity: 1;
    background: rgba(0, 0, 0, 0.75);
    color: #ffffff;
  }
`;

const Avatar = styled.img`
  ${avatarStyles};
`;

const StyledInput = styled(Input)`
  max-width: 350px;
`;

export default inject('auth', 'errors', 'auth')(Settings);
