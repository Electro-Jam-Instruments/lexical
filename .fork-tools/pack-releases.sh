#!/bin/bash
echo "Refusing to pack from this branch."
echo "Check out a11y-ship. That is the only branch we publish."
echo "Example: bash .fork-tools/pack-releases.sh v0.53.0-a11y.2"
exit 1
