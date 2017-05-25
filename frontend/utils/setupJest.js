/* eslint-disable */
import React from 'react';
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';

const snap = children => {
  const wrapper = shallow(children);
  expect(toJson(wrapper)).toMatchSnapshot();
};

global.snap = snap;
