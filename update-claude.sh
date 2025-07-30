#!/bin/bash

echo "Updating Claude Code to use Homebrew..."

# Force remove npm installation
echo "Removing npm installation..."
sudo rm -rf /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code /opt/homebrew/lib/node_modules/@anthropic-ai/.claude-code-*

# Install via Homebrew
echo "Installing Claude Code via Homebrew..."
brew install anthropic-ai/tap/claude-code

echo "Done! You can now run 'claude' to start Claude Code."
echo "Future updates: just run 'brew upgrade claude-code'"