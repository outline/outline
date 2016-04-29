import React from 'react';

import styles from './Header.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

const Header = ({
                toggleEditors,
              }) => {
  return (
    <div className={ styles.header }>
      <div className={ styles.headerItem }><i>Beautiful</i> Atlas</div>
      <div
        className={ cx('headerItem', 'editorToggle') }
        style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}
      >
        <div>
          <span className={ styles.textIcon }>Aa</span>
        </div>
      </div>
    </div>
  );
};

Header.propTypes = {
  activeEditors: React.PropTypes.array.isRequired,
  toggleEditors: React.PropTypes.func.isRequired,
};

export default Header;
