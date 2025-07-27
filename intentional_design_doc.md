# Intentional - Design Document
*The Intent-Based Development Platform*

## Vision
Enable anyone to build software by describing their intentions, not writing syntax. Create a visual, collaborative environment where humans and AI share the same view and can iterate at the speed of thought.

## Core Philosophy
**Intent-based > Syntax-based**
- Users describe WHAT they want, not HOW to code it
- Visual agreement beats verbal explanation
- Reduce friction between idea and implementation
- Make Phil productive

## Target Users

### Primary: "Phil" - The Vibe Coder
- Has ideas but doesn't know syntax
- Wants to build, not learn programming
- Thinks in products, not code
- Represents millions of potential builders

### Secondary: Developers Who Want Speed
- Rapid prototyping
- Better AI collaboration
- Visual project understanding
- Quick experiments

## Core Features (MVP)

### 1. Visual Project Overview
- **Smart File Tree**
  - Highlights what matters (CLAUDE.md, README, main files)
  - Hides noise (node_modules, build files)
  - Both human and AI see identical view
  - Real-time updates

### 2. Live HTML Canvas
- **Split View**: Code | Preview
- **Instant Updates**: Type/speak intent → see results
- **Interactive Elements**: Buttons, forms work immediately
- **Drawing Layer**: Users can sketch on top
- **Annotation System**: Claude can point/highlight

### 3. Intent Input System
- **Natural Language Box**: "Add a scoreboard to the top"
- **Right-Click Context**: Click any element → "Make this do X"
- **Voice Input** (later): Speak your intentions
- **Visual Indicators**: Show what Claude is modifying

### 4. Git Integration
- **Visual Git Status**: See changes clearly
- **One-Click Commits**: "Save this version"
- **Branch Visualization**: See project evolution
- **Rollback UI**: "Go back to when X worked"

### 5. One-Click Launchers
- **Open in Editor**: VS Code, Cursor, etc.
- **Launch Project**: Godot, Unity, browser
- **Terminal Here**: For power users
- **Deploy** (later): Ship to production

## Technical Architecture

### Frontend
- **Pure HTML/JS/CSS**: No build step initially
- **Canvas API**: For drawing layer
- **LocalStorage**: Save work locally
- **Tailwind CDN**: Quick, good-looking styles

### Backend (Minimal MVP)
- **Node.js + Express**: Simple API
- **File System Access**: Read/write projects
- **WebSockets** (later): Real-time collaboration
- **SQLite**: User data, projects

### Claude Integration
- Users bring their own Claude Code subscription
- Pass visual context to Claude
- Capture Claude's responses
- Update UI based on intent

## User Flow

### First Time Experience
1. Land on getintentional.dev
2. "Try it now" → Simple demo (no signup)
3. "This is amazing!" → Sign up
4. Install Claude Code (guided setup)
5. Create first project
6. Ship something in 30 minutes

### Daily Usage
1. Open Intentional
2. See all projects visually
3. Click project → See current state
4. Describe change → See it happen
5. Like it? → Commit
6. Ready? → Deploy

## Monetization

### Pricing Tiers
- **Beta**: $10/month (first 100 users)
- **Starter**: $20/month
  - 5 projects
  - Basic features
  - Community support
  
- **Pro**: $49/month
  - Unlimited projects
  - Priority features
  - Templates library
  - Deploy integration

- **Team**: $99/month
  - 3 collaborators
  - Shared projects
  - Private templates

### Revenue Streams
1. Subscriptions (primary)
2. Template marketplace (later)
3. Deploy service (later)
4. Enterprise licenses (future)

## MVP Milestones

### Week 1: Foundation
- [ ] Basic file tree viewer
- [ ] HTML preview pane
- [ ] Intent input box
- [ ] Local file read/write

### Week 2: Intelligence
- [ ] Claude integration
- [ ] Visual updates from intent
- [ ] Basic git status
- [ ] Drawing on canvas

### Week 3: Polish
- [ ] User accounts
- [ ] Save/load projects
- [ ] Decent UI/UX
- [ ] Payment integration

### Week 4: Launch
- [ ] Landing page
- [ ] Onboarding flow
- [ ] Documentation
- [ ] Beta launch

## Success Metrics

### Launch Goals
- 100 beta signups
- 10 paying customers
- 1 viral Phil success story
- 5 completed projects

### Long-term Vision
- 10,000 active users
- $300k MRR
- Category-defining product
- "Intentional" becomes a verb

## Risk Mitigation

### Technical Risks
- **Performance**: Start simple, optimize later
- **Security**: Sandboxed execution, user isolation
- **Scaling**: Good problem, worry later

### Business Risks
- **Copycats**: Move fast, build moat through community
- **Claude changes**: Abstract the AI layer
- **Churn**: Focus on Phil's success

## Marketing Strategy

### Pre-Launch
- Build in public (when ready)
- Document Phil's journey
- Create compelling demos

### Launch
- ProductHunt
- Relevant subreddits
- No-code communities
- Direct outreach to strugglers

### Growth
- Template library
- User success stories
- Referral program
- Content marketing

## The Dream
In 1 year, "getting intentional" is how non-developers build software. Phil has shipped 10 projects. Thousands of ideas become reality. Syntax-based development feels as outdated as punch cards.

**Intent-based > Syntax-based**

This is the future of building.