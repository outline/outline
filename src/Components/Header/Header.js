import React from 'react';

import styles from './Header.scss';

const Header = ({ activeEditors, toggleEditors }) => {
  return (
    <div className={ styles.header }>
      <div className={ styles.headerItem }><i>Beautiful</i> Atlas</div>
      <div className={ `${styles.headerItem} ${styles.editorToggle}` }>
        <span
          onClick={toggleEditors.bind(this, 'MARKDOWN')}
          className={ activeEditors.includes('MARKDOWN') ? styles.active : '' }
        >Markdown</span>
        <span
          onClick={toggleEditors.bind(this, 'TEXT')}
          className={ activeEditors.includes('TEXT') ? styles.active : '' }
        >Text</span>
      </div>
      <div className={ styles.headerItem }>Versions</div>
    </div>
  );
};

export default Header;
