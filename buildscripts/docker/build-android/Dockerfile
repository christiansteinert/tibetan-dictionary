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
FROM eclipse-temurin:21-jdk-jammy AS android-tools
  
ARG ANDROID_BUILD_TOOLS_VERSION=36.0.0
ARG ANDROID_PLATFORM_VERSION=36
# Keep the SDK in a predictable location
ENV ANDROID_HOME=/opt/android-sdk
  
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget unzip curl git xz-utils dash \
    && rm -rf /var/lib/apt/lists/*
  
# Download and install Node.js 22 in Stage 1 to leverage cache
RUN curl -fsSL https://nodejs.org/dist/v22.13.0/node-v22.13.0-linux-x64.tar.xz -o node.tar.xz \
    && tar -xJf node.tar.xz -C /usr/local --strip-components=1 \
    && rm node.tar.xz \
    && npm install -g cordova@13
  
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
FROM android-tools

 
ENV ANDROID_BUILD_TOOLS_VERSION=36.0.0
ENV ANDROID_HOME=/opt/android-sdk
ENV GRADLE_HOME=/opt/gradle
ENV JAVA_HOME=/opt/java/openjdk
ENV JAVA_TOOL_OPTIONS="-Xmx2048m -XX:ReservedCodeCacheSize=1024m"
ENV ANDROID_TOOLS_PATH=/opt/android-sdk/build-tools/36.0.0
ENV PATH=/opt/gradle/bin:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/36.0.0:${PATH}
 
# Copy the pre-installed SDK from Stage 1
# Redundant when using FROM android-tools

 
# Install Gradle 8.14.2
RUN wget -q https://services.gradle.org/distributions/gradle-8.14.2-bin.zip -O /tmp/gradle.zip \
    && unzip -q /tmp/gradle.zip -d /opt \
    && ln -s /opt/gradle-8.14.2/bin/gradle /usr/bin/gradle \
    && ln -s /opt/gradle-8.14.2 /opt/gradle \
    && rm /tmp/gradle.zip

 
WORKDIR /app
 
# Copy entire project — the Android build needs webapp/, _build/, backend/, _assets/
# Heavy node_modules are excluded via .dockerignore
COPY _build/mobile/tibetandict/package*json ./_build/mobile/tibetandict/
 
# Add Cordova project npm dependencies (local node_modules required by Cordova)
RUN cd _build/mobile/tibetandict && npm install --ignore-scripts

ENTRYPOINT ["bash", "buildscripts/buildAndroid.sh"]



