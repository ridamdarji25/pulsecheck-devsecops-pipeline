#!/bin/sh
# Runs before nginx starts (via /docker-entrypoint.d/).
# Detects Docker vs K8s and sets the correct DNS resolver + backend hostname.
set -e

# Read the first nameserver from /etc/resolv.conf
RESOLVER=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf)
echo "[entrypoint] DNS resolver detected: $RESOLVER"

# Auto-detect environment:
# K8s always sets KUBERNETES_SERVICE_HOST; Docker does not.
if [ -n "$KUBERNETES_SERVICE_HOST" ]; then
    # In K8s, CoreDNS needs the full FQDN to resolve short names
    BACKEND_HOST="${BACKEND_HOST:-backend.pulsecheck.svc.cluster.local}"
    echo "[entrypoint] Environment: Kubernetes"
else
    # In Docker, embedded DNS (127.0.0.11) resolves container names directly
    BACKEND_HOST="${BACKEND_HOST:-backend}"
    echo "[entrypoint] Environment: Docker"
fi

echo "[entrypoint] Backend host: $BACKEND_HOST"

sed -i "s/NGINX_RESOLVER/$RESOLVER/g"         /etc/nginx/conf.d/default.conf
sed -i "s/NGINX_BACKEND_HOST/$BACKEND_HOST/g" /etc/nginx/conf.d/default.conf

echo "[entrypoint] nginx.conf patched successfully"
