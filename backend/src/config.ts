import "dotenv/config";

export type AppConfig = {
    port: number;
    databaseUrl: string;
    jwtSecret: string;
    corsOrigins: string[];
    nodeEnv: string;
};

export function loadConfig(): AppConfig {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const jwtSecret = process.env.JWT_SECRET ?? "";
    const port = Number(process.env.PORT ?? 3000);
    const corsOrigins = (process.env.FRONTEND_URL ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    const nodeEnv = process.env.NODE_ENV ?? "development";

    if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
        throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
    }
    if (jwtSecret.length < 32) {
        throw new Error("JWT_SECRET must contain at least 32 characters");
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be an integer between 1 and 65535");
    }
    if (corsOrigins.length === 0) {
        throw new Error("FRONTEND_URL must contain at least one allowed frontend origin");
    }
    for (const origin of corsOrigins) {
        let parsed: URL;
        try { parsed = new URL(origin); } catch { throw new Error(`FRONTEND_URL contains an invalid origin: ${origin}`); }
        if (!(["http:", "https:"].includes(parsed.protocol)) || parsed.origin !== origin) {
            throw new Error(`FRONTEND_URL entries must be exact http(s) origins: ${origin}`);
        }
        if (nodeEnv === "production" && parsed.protocol !== "https:") {
            throw new Error("Production FRONTEND_URL origins must use HTTPS");
        }
    }
    return { port, databaseUrl, jwtSecret, corsOrigins, nodeEnv };
}
