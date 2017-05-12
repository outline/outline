/* eslint-disable */
import React from 'react';
import renderer from 'react-test-renderer';

const snap = children => {
  const component = renderer.create(children);
  expect(component).toMatchSnapshot();
};

export { snap };
