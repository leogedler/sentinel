# Stage 1: generate self-signed TLS certificate
FROM alpine:3.19 AS certs

RUN apk add --no-cache openssl && \
    mkdir -p /ssl && \
    openssl req -x509 -newkey rsa:2048 -nodes \
      -keyout /ssl/selfsigned.key \
      -out /ssl/selfsigned.crt \
      -days 3650 \
      -subj "/CN=localhost" \
      -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Stage 2: nginx reverse proxy
FROM nginx:1.27-alpine

COPY --from=certs /ssl /etc/nginx/ssl
COPY nginx.conf /etc/nginx/nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80 443
