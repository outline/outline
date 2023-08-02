import { z } from "zod";
import BaseSchema from "../BaseSchema";

export const AuthConfigSchema = BaseSchema;

export type AuthConfigReq = z.infer<typeof AuthConfigSchema>;

export const AuthInfoSchema = BaseSchema;

export type AuthInfoReq = z.infer<typeof AuthInfoSchema>;

export const AuthDeleteSchema = BaseSchema;

export type AuthDeleteReq = z.infer<typeof AuthDeleteSchema>;
