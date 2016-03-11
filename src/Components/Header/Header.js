import React from 'react';

import MarkdownIcon from '../../Components/Icons/Markdown';

import styles from './Header.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

const Header = ({
                activeEditors,
                toggleEditors,
              }) => {
  return (
    <div className={ styles.header }>
      <div className={ styles.headerItem }><i>Beautiful</i> Atlas</div>
      <div
        className={ cx('headerItem', 'editorToggle') }
        style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}
      >
        <div
          onClick={toggleEditors.bind(this, 'MARKDOWN')}
          className={ activeEditors.includes('MARKDOWN') ? styles.active : '' }
        >
          <MarkdownIcon style={{ width: '32px', height: '20px', color: '#fff' }} />
        </div>
        <div
          onClick={toggleEditors.bind(this, 'TEXT')}
          className={ activeEditors.includes('TEXT') ? styles.active : '' }
        >
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
