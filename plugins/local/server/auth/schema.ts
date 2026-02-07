import { z } from "zod";

export const LocalLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export type LocalLoginReq = z.infer<typeof LocalLoginSchema>;

export const LocalRegisterSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).max(255),
  }),
});

export type LocalRegisterReq = z.infer<typeof LocalRegisterSchema>;
