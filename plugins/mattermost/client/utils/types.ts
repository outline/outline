import z from "zod";

export const serverData = z.object({
  url: z.string().url().startsWith("http"),
  apiKey: z.string().min(1),
});

export type ServerData = z.infer<typeof serverData>;

export type UserData = {
  id: string;
  name: string;
  email: string;
};

export type TeamData = {
  id: string;
  name: string;
};

export type UserAndTeamsData = {
  user: UserData;
  teams: TeamData[];
};
