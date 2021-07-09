// @flow
/* eslint-disable */
import localStorage from '../../__mocks__/localStorage';
import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

Enzyme.configure({ adapter: new Adapter() });

global.localStorage = localStorage;

require("jest-fetch-mock").enableMocks();
