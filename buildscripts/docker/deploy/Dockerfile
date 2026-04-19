# ── Tibetan Dictionary – runtime image ───────────────────────────────────────
#
# This is a PACKAGING-ONLY image. It does not build anything.
# All artefacts must already exist on the host before building this image:
#
#   webapp/dist/                  ← produced by: docker compose run --rm build-webapp
#   backend/TibetanDictionary.db  ← produced by: docker compose run --rm build-db
#
# Build & run standalone:
#   docker build -t tibetan-dict .
#   docker run -p 8080:80 tibetan-dict
#
# Recommended workflow via docker compose (builds artefacts first automatically):
#   docker compose up app
# ──────────────────────────────────────────────────────────────────────────────
FROM php:8.3-fpm-alpine

# nginx
RUN apk add --no-cache nginx

# Copy nginx config
COPY buildscripts/docker/deploy/nginx.conf /etc/nginx/tibetandict.conf

# Create web root
RUN mkdir -p /var/www/html

# ── Pre-built webapp with frontend and backend (from build-webapp) ─────────────────────────────────
COPY webapp/dist/ /var/www/html/
COPY backend/ /var/www/html/backend/

# php-fpm listens on 9000/tcp (127.0.0.1 is fine inside the container)
RUN sed -i 's/^listen = .*/listen = 127.0.0.1:9000/' /usr/local/etc/php-fpm.d/www.conf

EXPOSE 80

# Start php-fpm in the background, then nginx in the foreground
CMD ["sh", "-c", "php-fpm -D && nginx -c /etc/nginx/tibetandict.conf -g 'daemon off;'"]
