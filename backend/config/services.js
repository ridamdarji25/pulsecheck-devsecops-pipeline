/**
 * services.js — Centralised service registry for PulseCheck.
 *
 * WHY a separate config file instead of hardcoding URLs in routes/?
 *   - Single place to add/remove/modify monitored services without
 *     touching business logic.
 *   - In production, this could be replaced by reading from an env
 *     variable, a config-map (K8s), or a database — all without
 *     changing any route code.
 *
 * Each entry describes ONE external service to be polled:
 *   name    — human-readable label shown in the UI
 *   url     — the endpoint we HTTP-GET to measure availability/latency
 *             (pick a lightweight endpoint like /health rather than the root)
 */

const SERVICES = [
  {
    name: "GitHub",
    url: "https://www.githubstatus.com/",
  },
  {
    name: "Google Cloud",
    url: "https://status.cloud.google.com/",
  },
  {
    name: "AWS",
    url: "https://health.aws.amazon.com/health/status",
  },
  {
    name: "Cloudflare",
    url: "https://www.cloudflarestatus.com/",
  },
  {
    name: "Stripe",
    url: "https://status.stripe.com/",
  },
  {
    name: "Vercel",
    url: "https://www.vercel-status.com/",
  },
  {
    name: "Twilio",
    url: "https://status.twilio.com/",
  },
  {
    name: "Atlassian",
    url: "https://status.atlassian.com/",
  },
];

module.exports = SERVICES;
