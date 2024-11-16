/* eslint-disable */
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module '../.... Remove this comment to see the full error message
import localStorage from "../../__mocks__/localStorage";
import { initI18n } from "../utils/i18n";

initI18n();

global.localStorage = localStorage;

require("jest-fetch-mock").enableMocks();

jest.mock("~/utils/ApiClient");
