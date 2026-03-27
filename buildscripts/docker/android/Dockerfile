# ── Android / Cordova builder ─────────────────────────────────────────────────
# Builds the Android APK using the Cordova toolchain.
#
# Prerequisites that MUST be present on the host before running this:
#   - backend/TibetanDictionary.db   (produced by build-db)
#   - webapp/dist/                   (produced by build-react, not needed —
#                                     the Android build uses the legacy webapp/)
#   - _build/my-release-key.keystore (your APK signing key; never commit this)
#
# Usage (via docker compose):
#   docker compose --rm build-android
#
# The resulting APK(s) are written to /app/ which is bind-mounted to the
# project root on the host.
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: download & unpack Android command-line tools ────────────────────
FROM eclipse-temurin:17-jdk-jammy AS android-tools

ARG ANDROID_BUILD_TOOLS_VERSION=35.0.0
ARG ANDROID_PLATFORM_VERSION=35
# Keep the SDK in a predictable location
ENV ANDROID_HOME=/opt/android-sdk

RUN apt-get update \
    && apt-get install -y --no-install-recommends wget unzip curl \
    && rm -rf /var/lib/apt/lists/*

# Download Android command-line tools (latest stable)
RUN mkdir -p ${ANDROID_HOME}/cmdline-tools \
    && wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdtools.zip \
    && unzip -q /tmp/cmdtools.zip -d /tmp/cmdtools \
    && mv /tmp/cmdtools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest \
    && rm -rf /tmp/cmdtools /tmp/cmdtools.zip

ENV PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

# Accept licenses non-interactively and install required SDK components
RUN yes | sdkmanager --licenses > /dev/null 2>&1 || true \
    && sdkmanager \
        "platform-tools" \
        "platforms;android-${ANDROID_PLATFORM_VERSION}" \
        "build-tools;${ANDROID_BUILD_TOOLS_VERSION}"

# ── Stage 2: Cordova build ────────────────────────────────────────────────────
FROM eclipse-temurin:17-jdk-jammy

ARG ANDROID_BUILD_TOOLS_VERSION=35.0.0
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/build-tools/${ANDROID_BUILD_TOOLS_VERSION}:${PATH}"

# Copy the pre-installed SDK from Stage 1
COPY --from=android-tools ${ANDROID_HOME} ${ANDROID_HOME}

# Node.js (needed by Cordova CLI) + Gradle + build utilities
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl git unzip dash \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g cordova@12 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy entire project — the Android build needs webapp/, _build/, backend/, _assets/
# Heavy node_modules are excluded via .dockerignore
COPY . .

# Restore Cordova project npm dependencies
RUN cd _build/mobile/tibetandict && npm install

CMD ["sh", "buildscripts/buildAndroid.sh"]
