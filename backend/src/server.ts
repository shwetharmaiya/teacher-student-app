import "dotenv/config";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { pool } from "./db/index.js";

export function startServer() {
    const config = loadConfig();
    const app = createApp();
    const server = app.listen(config.port, () => {
        console.info(JSON.stringify({ level: "info", event: "server_started", port: config.port, environment: config.nodeEnv }));
    });
    let shuttingDown = false;

    const shutdown = (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.info(JSON.stringify({ level: "info", event: "server_shutdown_started", signal }));
        const forceTimer = setTimeout(() => {
            console.error(JSON.stringify({ level: "error", event: "server_shutdown_timeout" }));
            process.exitCode = 1;
            server.closeAllConnections();
            void pool.end().finally(() => process.exit());
        }, 10_000);
        forceTimer.unref();
        server.close((error) => {
            clearTimeout(forceTimer);
            if (error) {
                console.error(JSON.stringify({ level: "error", event: "http_server_close_failed", message: error.message }));
                process.exitCode = 1;
            }
            void pool.end().catch((poolError: unknown) => {
                const message = poolError instanceof Error ? poolError.message : "unknown database shutdown error";
                console.error(JSON.stringify({ level: "error", event: "database_pool_close_failed", message }));
                process.exitCode = 1;
            });
        });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    try {
        startServer();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Application startup failed";
        console.error(JSON.stringify({ level: "fatal", event: "configuration_error", message }));
        process.exitCode = 1;
    }
}
