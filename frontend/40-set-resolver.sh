#!/bin/sh
set -e

RESOLVER=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf)
echo "[entrypoint] DNS resolver detected: $RESOLVER"

if [ -n "$KUBERNETES_SERVICE_HOST" ]; then
    BACKEND_HOST="${BACKEND_HOST:-backend.pulsecheck.svc.cluster.local}"
    echo "[entrypoint] Environment: Kubernetes"
else
    BACKEND_HOST="${BACKEND_HOST:-backend}"
    echo "[entrypoint] Environment: Docker"
fi

echo "[entrypoint] Backend host: $BACKEND_HOST"

sed -i "s/NGINX_RESOLVER/$RESOLVER/g"         /etc/nginx/conf.d/default.conf
sed -i "s/NGINX_BACKEND_HOST/$BACKEND_HOST/g" /etc/nginx/conf.d/default.conf

echo "[entrypoint] nginx.conf patched successfully"
