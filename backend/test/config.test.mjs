import assert from "node:assert/strict";
import { test } from "node:test";

const keys = ["DATABASE_URL", "JWT_SECRET", "PORT", "FRONTEND_URL", "NODE_ENV"];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "release-readiness-test-secret-0123456789";
process.env.PORT = "3000";
process.env.FRONTEND_URL = "http://localhost:5173,https://school.example.test";
process.env.NODE_ENV = "test";
const { loadConfig } = await import("../dist/config.js");

test("configuration accepts exact local and https origins", () => {
    const config = loadConfig();
    assert.deepEqual(config.corsOrigins, ["http://localhost:5173", "https://school.example.test"]);
});

test("configuration rejects weak secrets and malformed production origins", () => {
    process.env.JWT_SECRET = "too-short";
    assert.throws(() => loadConfig(), /at least 32 characters/);
    process.env.JWT_SECRET = original.JWT_SECRET ?? "release-readiness-test-secret-0123456789";
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "http://school.example.test";
    assert.throws(() => loadConfig(), /must use HTTPS/);
});

test("configuration rejects wildcard or path-bearing CORS origins", () => {
    process.env.NODE_ENV = "test";
    process.env.FRONTEND_URL = "https://school.example.test/app";
    assert.throws(() => loadConfig(), /exact http\(s\) origins/);
});

process.on("exit", () => {
    for (const key of keys) {
        if (original[key] === undefined) delete process.env[key];
        else process.env[key] = original[key];
    }
});
