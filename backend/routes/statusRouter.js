/**
 * statusRouter.js — Route handler for GET /api/status
 *
 * WHY this file exists in its own module:
 *   Express best-practice is to separate route handlers from the server
 *   bootstrap (server.js). This makes unit-testing routes trivial — just
 *   mount the router on a test server without touching CORS or PORT logic.
 *
 * HOW it works:
 *   1. Load the static service registry from config/services.js.
 *   2. Fire all HTTP pings in parallel (Promise.allSettled) so one
 *      unresponsive service never blocks the others.
 *   3. Classify each result into "up" | "slow" | "down" based on
 *      HTTP status and measured wall-clock latency.
 *   4. Return a JSON array the frontend can render directly.
 */

const express = require("express");
const axios = require("axios");
const SERVICES = require("../config/services");

const router = express.Router();

/**
 * Latency thresholds (in milliseconds).
 *
 * WHY these specific numbers?
 *   - Google's research shows users notice slowness beyond ~200 ms.
 *   - 800 ms is a reasonable ceiling for a "slow but working" service.
 *   - Beyond 800 ms we classify as "slow" so operators know SLOs are at risk.
 *   Adjust SLOW_THRESHOLD to match your own SLO definitions.
 */
const REQUEST_TIMEOUT_MS = 5000; // Abort the outbound ping after 5 s
const SLOW_THRESHOLD_MS = 800; // >800 ms → "slow" even if HTTP 200

/**
 * pingService(service) → Promise<{ name, url, status, latencyMs }>
 *
 * Pings a single service and returns a normalised result object.
 * Never rejects — failures are caught and returned as status:"down"
 * so Promise.allSettled can treat every entry the same way.
 */
async function pingService(service) {
  const start = Date.now();

  try {
    const response = await axios.get(service.url, {
      timeout: REQUEST_TIMEOUT_MS,

      // WHY maxRedirects: 5?
      //   Some status pages redirect HTTP→HTTPS. We follow them but cap
      //   the depth to prevent a redirect loop from hanging the request.
      maxRedirects: 5,

      // WHY validateStatus returning true for all codes?
      //   We only care about *reachability*, not HTTP semantics.
      //   A 4xx on a status page still means the host is reachable.
      //   We only flip to "down" when axios *throws* (timeout / network error).
      validateStatus: () => true,

      headers: {
        // Identify ourselves so status pages can distinguish crawler vs user.
        "User-Agent": "PulseCheck-Monitor/1.0",
      },
    });

    const latencyMs = Date.now() - start;

    // Classify: HTTP 5xx means the service itself is reporting an error.
    const httpError = response.status >= 500;

    if (httpError) {
      return { name: service.name, url: service.url, status: "down", latencyMs };
    }

    // Even a successful HTTP response is "slow" if it took too long.
    const isSlow = latencyMs > SLOW_THRESHOLD_MS;
    return {
      name: service.name,
      url: service.url,
      status: isSlow ? "slow" : "up",
      latencyMs,
    };
  } catch (err) {
    // axios throws on network errors (ECONNREFUSED, ETIMEDOUT, etc.)
    // We still want to return something so the frontend can show "Down".
    const latencyMs = Date.now() - start;
    return { name: service.name, url: service.url, status: "down", latencyMs };
  }
}

/**
 * GET /api/status
 *
 * Returns an array of service health objects:
 *   [{ name, url, status: "up"|"slow"|"down", latencyMs }]
 *
 * WHY Promise.allSettled instead of Promise.all?
 *   Promise.all short-circuits on the first rejection. allSettled
 *   waits for every ping to resolve or reject before returning,
 *   giving us results for all services even when some fail.
 *   (pingService itself never rejects, but allSettled is the safer
 *   idiom for fan-out/fan-in patterns like this one.)
 */
router.get("/status", async (req, res) => {
  try {
    const pingPromises = SERVICES.map((svc) => pingService(svc));
    const results = await Promise.allSettled(pingPromises);

    // allSettled wraps each result in { status: "fulfilled"|"rejected", value }
    const payload = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { name: "Unknown", url: "", status: "down", latencyMs: 0 }
    );

    res.json(payload);
  } catch (err) {
    console.error("Unexpected error in /api/status:", err.message);
    res.status(500).json({ error: "Failed to fetch service statuses" });
  }
});

/**
 * GET /api/ping?url=<encoded-url>&name=<label>
 *
 * Pings a single arbitrary URL and returns its health result.
 * Used by the frontend when a user adds a custom application to monitor.
 *
 * WHY a dedicated endpoint instead of expanding /status?
 *   /status always pings the fixed service list. Adding dynamic user
 *   services to it would require server-side state (a DB or in-memory store)
 *   that adds complexity. Instead, the frontend owns the list of custom
 *   services (persisted in localStorage) and calls /ping for each one
 *   during the polling cycle — keeping the backend stateless.
 *
 * Security note:
 *   We validate that the URL starts with http:// or https:// to prevent
 *   SSRF to local network addresses like file:// or ftp://. In a
 *   production environment you would also blocklist private IP ranges
 *   (10.x.x.x, 192.168.x.x, 127.x.x.x) to prevent internal SSRF.
 */
router.get("/ping", async (req, res) => {
  const rawUrl = req.query.url;
  const name   = req.query.name ?? "Custom Service";

  if (!rawUrl) {
    return res.status(400).json({ error: "Missing required query parameter: url" });
  }

  // Basic SSRF guard: only allow http/https.
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: "URL must use http or https protocol" });
    }
  } catch {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  const result = await pingService({ name, url: parsedUrl.toString() });
  res.json(result);
});

module.exports = router;

