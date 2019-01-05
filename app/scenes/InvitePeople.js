// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Button from 'components/Button';
import { Link } from 'react-router-dom';
import Input from 'components/Input';
import CopyToClipboard from 'components/CopyToClipboard';
import Flex from 'shared/components/Flex';
import HelpText from 'components/HelpText';
import Modal from 'components/Modal';
import AuthStore from 'stores/AuthStore';

type Props = {
  auth: AuthStore,
  onRequestClose: () => *,
};

@observer
class InvitePeople extends React.Component<Props> {
  @observable isCopied: boolean;
  timeout: TimeoutID;

  handleCopied = () => {
    this.isCopied = true;

    this.timeout = setTimeout(() => {
      this.isCopied = false;
      this.props.onSubmit();
    }, 1500);
  };  

  render() {
    const { auth, ...rest } = this.props;

    const sharedUrl = `${location.origin}/invite/${auth.team.id}`;

    return (
      <Modal isOpen title="邀请成员" {...rest}>
        <Flex column>
          <form onSubmit={this.handleSubmit}>
            <HelpText>
              将链接发给你的成员，其注册后就会自动加入团队。
            </HelpText>
            <Input
                type="text"
                label="邀请链接"
                value={sharedUrl || '加载中…'}
                disabled
            />
            <CopyToClipboard
                text={sharedUrl || ''}
                onCopy={this.handleCopied}
            >
                <Button type="submit" disabled={this.isCopied} primary>
                    {this.isCopied ? '复制成功！' : '复制链接'}
                </Button>
            </CopyToClipboard>
          </form>
        </Flex>
      </Modal>
    );
  }
}

export default inject('auth')(InvitePeople);
