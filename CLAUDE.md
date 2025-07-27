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

### 6. Set Up GitHub Remote Repository

Check if a remote is already configured:
```bash
git remote -v
```

If no remote exists, proceed with GitHub setup:

#### Step 1: Check GitHub Authentication
```bash
# Check if user is already authenticated with GitHub CLI
gh auth status
```

**If `gh` (GitHub CLI) is not installed:**
- macOS: `brew install gh`
- Explain: "This tool helps us connect to GitHub from your computer"

**If not authenticated:**
```bash
gh auth login
```
- Select: GitHub.com
- Select: HTTPS
- Select: Login with a web browser
- Explain: "We need to connect your computer to your GitHub account. I'll open a browser for you to sign in."

#### Step 2: Create Repository
```bash
# Ask user for repository name (suggest: same as folder name)
gh repo create [repository-name] --private --source=. --remote=origin --push
```

Explain: "I'm creating a private backup of your code on GitHub. Private means only you can see it."

**If the above fails, guide through manual creation:**

1. "Please go to https://github.com/new in your browser"
2. "Sign in if needed (create account at github.com/signup if you don't have one)"
3. "For 'Repository name', enter: [suggest current folder name]"
4. "Select 'Private' to keep your code private"
5. "Don't check any boxes below"
6. "Click 'Create repository'"
7. "Copy the URL from the page (looks like: https://github.com/username/repo-name.git)"

Then run:
```bash
git remote add origin [paste-their-url-here]
git push -u origin main
```

#### Step 3: Handle Common Issues

**If push fails with authentication error:**
1. "GitHub now requires a special password called a token. Let's create one:"
2. "Go to https://github.com/settings/tokens/new"
3. "Give it a name like 'GitSave'"
4. "Check the 'repo' checkbox"
5. "Scroll down and click 'Generate token'"
6. "Copy the token (starts with ghp_)"
7. "When Git asks for password, paste this token instead"

**If push fails with 'main' branch error:**
```bash
git branch -M main
git push -u origin main
```

#### Success Message
"Great! Your code is now backed up on GitHub. GitSave will automatically sync your changes. You can view your code online at: https://github.com/[username]/[repository-name]"

### 7. Run GitSave
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