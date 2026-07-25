FROM python:3.13-slim
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends sqlite3 dash && \
    rm -rf /var/lib/apt/lists/*
