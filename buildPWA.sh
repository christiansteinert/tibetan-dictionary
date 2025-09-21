#!/bin/bash

# PWA Build Script Wrapper
# Calls the Python PWA builder and handles the build process

set -e

echo "Building PWA cache configuration..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBAPP_DIR="$SCRIPT_DIR/webapp"

# Check if webapp directory exists
if [ ! -d "$WEBAPP_DIR" ]; then
    echo "Error: webapp directory not found at $WEBAPP_DIR"
    exit 1
fi

# Check if Python build script exists
if [ ! -f "$SCRIPT_DIR/_buildPWA.py" ]; then
    echo "Error: _buildPWA.py not found at $SCRIPT_DIR/_buildPWA.py"
    exit 1
fi

# Run the Python build script
echo "Running PWA build process..."
python3 "$SCRIPT_DIR/_buildPWA.py" "$WEBAPP_DIR"

if [ $? -eq 0 ]; then
    echo "PWA build completed successfully!"
    echo ""
    echo "The following files have been updated:"
    echo "  - webapp/code/js/pwa/cache-manager.js (resource list and cache version)"
    echo "  - webapp/build-info.json (build metadata)"
    echo ""
    echo "You can now test the PWA functionality in a web browser."
else
    echo "PWA build failed!"
    exit 1
fi