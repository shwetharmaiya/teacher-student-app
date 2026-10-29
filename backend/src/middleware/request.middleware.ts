import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, RequestHandler } from "express";

export const requestContext: RequestHandler = (req, res, next) => {
    const requestId = randomUUID();
    const started = process.hrtime.bigint();
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cache-Control", "no-store");
    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
        console.info(JSON.stringify({
            level: "info",
            event: "http_request",
            requestId,
            method: req.method,
            path: req.path,
            status: res.statusCode,
            durationMs: Math.round(durationMs * 100) / 100,
        }));
    });
    next();
};

export const notFoundHandler: RequestHandler = (req, res) => {
    res.status(404).json({ message: "Route not found", requestId: res.getHeader("X-Request-Id") });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (res.headersSent) return _next(error);
    const err = error instanceof Error ? error as Error & { status?: number; statusCode?: number; type?: string } : null;
    const status = err?.statusCode ?? err?.status ?? 500;
    const requestId = res.getHeader("X-Request-Id");
    if (status >= 500) {
        console.error(JSON.stringify({ level: "error", event: "http_error", requestId, name: err?.name ?? "UnknownError", message: err?.message ?? "Unknown error" }));
    }
    if (err?.type === "entity.too.large") {
        return res.status(413).json({ message: "Request body is too large", requestId });
    }
    if (status >= 400 && status < 500) {
        return res.status(status).json({ message: err?.message ?? "Invalid request", requestId });
    }
    return res.status(500).json({ message: "An unexpected server error occurred", requestId });
};

type RateLimitBucket = { count: number; resetAt: number };
const buckets = new Map<string, RateLimitBucket>();

export function createRateLimiter(options: { windowMs: number; max: number; message: string }): RequestHandler {
    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
        let bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + options.windowMs };
            buckets.set(key, bucket);
        }
        bucket.count += 1;
        if (buckets.size > 10_000) {
            for (const [ip, entry] of buckets) if (entry.resetAt <= now) buckets.delete(ip);
        }
        res.setHeader("RateLimit-Limit", String(options.max));
        res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - bucket.count)));
        res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
        if (bucket.count > options.max) {
            res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
            return res.status(429).json({ message: options.message, requestId: res.getHeader("X-Request-Id") });
        }
        return next();
    };
}

export const authRateLimit = createRateLimiter({
    windowMs: 15 * 60_000,
    max: 20,
    message: "Too many authentication attempts. Try again later.",
});
