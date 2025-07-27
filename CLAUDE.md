# GitSave Setup Instructions for Claude

When a user says "do the thing" or similar, follow these steps to set up Git and configure GitSave for them.

## Setup Process

### 1. System Check
First, check what's already installed:

```bash
# Check for Git
git --version

# Check for Homebrew (macOS)
brew --version

# Check for Node.js
node --version

# Check for npm
npm --version
```

### 2. Install Missing Components

#### If Git is missing:
- **macOS**: 
  - If Homebrew is installed: `brew install git`
  - If no Homebrew: First install Xcode Command Line Tools with `xcode-select --install`, then Git will be included
- **Windows**: Direct user to download Git from https://git-scm.com/download/win
- **Linux**: Use package manager (apt, yum, etc.)

Explain to user: "Git is a version control system that saves snapshots of your code over time, like having unlimited undo/redo and backup copies."

#### If Node.js is missing:
- **macOS with Homebrew**: `brew install node`
- **Without Homebrew**: Direct to https://nodejs.org
- Explain: "Node.js lets us run the GitSave application on your computer."

### 3. Configure Git
After Git is installed, set up user information:

```bash
# Ask user for their name and email first!
git config --global user.name "Their Name"
git config --global user.email "their.email@example.com"
```

Explain: "Git needs to know who you are so it can label your code saves with your name."

### 4. Install GitSave Dependencies
```bash
npm install
```

Explain: "Installing the components GitSave needs to run."

### 5. Initialize Repository
```bash
# Check if already in a git repo first
git status

# If not initialized:
git init
git branch -M main
git add .
git commit -m "Initial commit - GitSave setup complete"
```

Explain: "Creating your first save point! From now on, GitSave will automatically save your code changes."

### 6. Run GitSave
```bash
npm start
```

Explain: "GitSave is now running! It will automatically save your code changes every few minutes. You can minimize this window and code normally."

## Important Notes for Claude:

1. **Always explain what you're doing** - Users are non-technical
2. **Check before installing** - Don't assume anything is installed
3. **Handle errors gracefully** - If something fails, explain in simple terms
4. **Ask for user input** - Especially for name/email configuration
5. **Keep language simple** - Avoid technical jargon

## Example User Interaction:

User: "do the thing"

Claude: "I'll help you set up GitSave! This will give you automatic saves and version history for your code. Let me first check what's already installed on your computer..."

[Run checks, then guide through installation with clear explanations]

## Common Issues:

- **Permission errors**: Suggest using `sudo` (macOS/Linux) with explanation
- **Windows PATH issues**: Guide to add Git to PATH
- **Homebrew not installed**: Offer to install it first on macOS
- **Corporate proxy**: Ask if they're on a company network

Remember: The goal is to make version control accessible to everyone, regardless of technical background!