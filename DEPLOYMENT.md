# Deployment Guide

## Step 1: Set up Git (if not already done)

First, configure your Git identity:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 2: Push to GitHub

### Option A: Using GitHub Website (Easiest)

1. Go to https://github.com and sign in (or create an account)
2. Click the "+" icon in the top right → "New repository"
3. Name it (e.g., "match3-element-battle")
4. Choose Public or Private
5. **Don't** initialize with README (we already have one)
6. Click "Create repository"
7. GitHub will show you commands - use these:

```bash
cd C:\Users\Johnathan\match3-game
git remote add origin https://github.com/YOUR_USERNAME/match3-element-battle.git
git branch -M main
git push -u origin main
```

### Option B: Using GitHub CLI

If you have GitHub CLI installed:

```bash
gh repo create match3-element-battle --public --source=. --remote=origin --push
```

## Step 3: Deploy to a Website

### Option 1: GitHub Pages (FREE & EASIEST)

1. Go to your repository on GitHub
2. Click "Settings" → "Pages" (in left sidebar)
3. Under "Source", select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"
6. Your site will be live at: `https://YOUR_USERNAME.github.io/match3-element-battle`

**Note**: You may need to add a `gh-pages` branch or use GitHub Actions. Alternatively, create a simple workflow file.

### Option 2: Netlify (FREE - Recommended)

1. Go to https://www.netlify.com and sign up/login
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repository
4. Build settings:
   - Build command: (leave empty)
   - Publish directory: `/` (root)
5. Click "Deploy site"
6. Your site will be live at: `https://random-name.netlify.app`
7. You can add a custom domain in Site settings → Domain management

### Option 3: Vercel (FREE)

1. Go to https://vercel.com and sign up/login
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Framework Preset: "Other"
5. Root Directory: `./`
6. Click "Deploy"
7. Your site will be live at: `https://random-name.vercel.app`

### Option 4: Custom Domain

After deploying to any service above:

1. Buy a domain from:
   - Namecheap (https://www.namecheap.com)
   - Google Domains (https://domains.google)
   - GoDaddy (https://www.godaddy.com)
2. In your hosting service (Netlify/Vercel/GitHub Pages):
   - Go to Domain settings
   - Add your custom domain
   - Follow DNS configuration instructions
3. Wait for DNS propagation (usually 5-60 minutes)

## Quick Deploy Commands

After setting up Git config, run these in order:

```bash
# Navigate to project
cd C:\Users\Johnathan\match3-game

# Commit your files
git add .
git commit -m "Initial commit: Match 3 Element Battle Game"

# Add GitHub remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## File Structure

Your project is ready to deploy as-is! The structure is:
```
match3-game/
├── index.html
├── game.js
├── style.css
├── README.md
└── .gitignore
```

All files are static HTML/CSS/JS, so no build process is needed!

