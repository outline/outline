// @flow
import * as React from 'react';
import { Link } from 'react-router-dom';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  label: React.Node,
  path: Array<any>,
};

export default class BreadcrumbMenu extends React.Component<Props> {
  render() {
    const { path } = this.props;

    return (
      <DropdownMenu label={this.props.label} position="center">
        {path.map(item => (
          <DropdownMenuItem as={Link} to={item.url} key={item.id}>
            {item.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenu>
    );
  }
}
