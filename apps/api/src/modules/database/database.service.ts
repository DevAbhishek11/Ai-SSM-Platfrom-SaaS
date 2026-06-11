import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "@ssm/database";
import { getEnv } from "../../common/env.js";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly client: Sql;
  readonly db: PostgresJsDatabase<typeof schema>;

  constructor() {
    this.client = postgres(getEnv().DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 5,
      prepare: false
    });
    this.db = drizzle(this.client, { schema });
  }

  async health() {
    if (getEnv().DATABASE_HEALTHCHECK === "metadata") {
      return {
        status: "configured",
        mode: "metadata"
      };
    }

    await this.client`select 1`;
    return {
      status: "ok",
      mode: "strict"
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
