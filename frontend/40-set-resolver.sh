#!/bin/sh
# Reads the first nameserver from /etc/resolv.conf (works in Docker AND K8s)
# and substitutes the NGINX_RESOLVER placeholder in nginx.conf before nginx starts.
set -e

RESOLVER=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf)

echo "[entrypoint] DNS resolver detected: $RESOLVER"

sed -i "s/NGINX_RESOLVER/$RESOLVER/g" /etc/nginx/conf.d/default.conf

echo "[entrypoint] nginx.conf resolver set to: $RESOLVER"
