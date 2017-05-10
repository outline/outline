/* eslint-disable */
import React from 'react';
import ReactDOM from 'react-dom';
import DocumentHtml from './DocumentHtml';
import { shallow } from 'enzyme';

const testHtml = `
  <h1>test document</h1>
  <p>Hello! <a href="/internal">internal link</a></p>
  <p>Aliens <a href="/external">external link</a></p>
`;

test('renders', () => {
  const wrapper = shallow(<DocumentHtml html={testHtml} />);
  expect(wrapper.find('.document').length).toBe(1);
});
