const express = require("express");
const axios = require("axios");
const SERVICES = require("../config/services");

const router = express.Router();

const REQUEST_TIMEOUT_MS = 5000;
const SLOW_THRESHOLD_MS = 800;

async function pingService(service) {
  const start = Date.now();

  try {
    const response = await axios.get(service.url, {
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        "User-Agent": "PulseCheck-Monitor/1.0",
      },
    });

    const latencyMs = Date.now() - start;

    const httpError = response.status >= 500;

    if (httpError) {
      return { name: service.name, url: service.url, status: "down", latencyMs };
    }

    const isSlow = latencyMs > SLOW_THRESHOLD_MS;
    return {
      name: service.name,
      url: service.url,
      status: isSlow ? "slow" : "up",
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return { name: service.name, url: service.url, status: "down", latencyMs };
  }
}

router.get("/status", async (req, res) => {
  try {
    const pingPromises = SERVICES.map((svc) => pingService(svc));
    const results = await Promise.allSettled(pingPromises);

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

router.get("/ping", async (req, res) => {
  const rawUrl = req.query.url;
  const name   = req.query.name ?? "Custom Service";

  if (!rawUrl) {
    return res.status(400).json({ error: "Missing required query parameter: url" });
  }

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
