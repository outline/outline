// @flow
import React from 'react';
import Flex from 'components/Flex';
import HelpText from 'components/HelpText';
import HtmlContent from 'components/HtmlContent';
import flatpages from 'static/flatpages';
import { convertToMarkdown } from 'utils/markdown';

const htmlContent = convertToMarkdown(flatpages.keyboard);

function KeyboardShortcuts() {
  return (
    <Flex column>
      <HelpText>
        Atlas is designed to be super fast and easy to use.
        All of your usual keyboard shortcuts work here.
      </HelpText>
      <HtmlContent dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </Flex>
  );
}

export default KeyboardShortcuts;
