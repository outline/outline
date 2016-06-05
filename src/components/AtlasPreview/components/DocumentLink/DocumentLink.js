import React from 'react';
import { observer } from "mobx-react"

import moment from 'moment';
import Link from 'react-router/lib/Link';

import styles from './DocumentLink.scss';

const DocumentLink = observer((props) => {
  return (
    <Link to={ `/documents/${props.document.id}` } className={ styles.link }>
      <h3 className={ styles.title }>{ props.document.title }</h3>
      <span className={ styles.timestamp }>{ moment(props.document.updatedAt).fromNow() }</span>
    </Link>
  );
});

export default DocumentLink;
