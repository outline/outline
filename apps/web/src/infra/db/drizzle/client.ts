import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { defineRelations } from "drizzle-orm/relations";
import { Context, Effect, Layer } from "effect";
import { getResolvedConfig } from "@/shared/env/app.config";
import * as schema from "./schema";

const relationalSchema = defineRelations(schema);

export type DrizzleClient = NeonHttpDatabase<typeof relationalSchema>;

export class IDrizzleClient extends Context.Tag("IDrizzleClient")<
	IDrizzleClient,
	DrizzleClient
>() {}

export const DrizzleClientLive = Layer.scoped(
	IDrizzleClient,
	Effect.gen(function* () {
		const config = getResolvedConfig();
		let dbUrl = config.database.dbUrl || "";
		if (dbUrl.includes("?")) {
			dbUrl = dbUrl.split("?")[0];
		}
		if (dbUrl.startsWith("postgresql://")) {
			dbUrl = "postgres://" + dbUrl.substring("postgresql://".length);
		}
		const sql = neon(dbUrl);
		return drizzle({ client: sql, schema: relationalSchema });
	}),
);
