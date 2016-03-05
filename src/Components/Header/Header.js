import React from 'react';

import styles from './Header.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

const Header = ({
                activeEditors,
                toggleEditors,
                addRevision,
              }) => {
  return (
    <div className={ styles.header }>
      <div className={ styles.headerItem }><i>Beautiful</i> Atlas</div>
      <div className={ cx('headerItem', 'editorToggle') }>
        <span
          onClick={toggleEditors.bind(this, 'MARKDOWN')}
          className={ activeEditors.includes('MARKDOWN') ? styles.active : '' }
        >Markdown</span>
        <span
          onClick={toggleEditors.bind(this, 'TEXT')}
          className={ activeEditors.includes('TEXT') ? styles.active : '' }
        >Text</span>
      </div>
      <div className={ cx('headerItem', 'sidebar') }>
        <span onClick={addRevision.bind(this, (new Date()).toISOString())}>Save</span>
      </div>
    </div>
  );
};

Header.propTypes = {
  activeEditors: React.PropTypes.array.isRequired,
  toggleEditors: React.PropTypes.func.isRequired,
  addRevision: React.PropTypes.func.isRequired,
};

export default Header;
