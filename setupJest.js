/* eslint-disable */
import * as React from 'react';
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import localStorage from './__mocks__/localStorage';

const snap = children => {
  const wrapper = shallow(children);
  expect(toJson(wrapper)).toMatchSnapshot();
};

global.localStorage = localStorage;
global.snap = snap;