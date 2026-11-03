import "reflect-metadata";
import { vi } from "vitest";
import localStorage from "../../__mocks__/localStorage";
import { initI18n } from "../utils/i18n";

initI18n();

global.localStorage = localStorage;

vi.mock("~/utils/ApiClient");
