# Kartik Challenge - Vercel Deployment Guide

Aapka project Vercel par deployment ke liye **100% ready** kar diya gaya hai! 🎉

---

## 🚀 Option 1: GitHub ke zariye Deploy karein (Recommended)

Sabse asaan aur automatic tareeqa:

### Step 1: Git Repository initialize karein aur GitHub par push karein
Terminal / PowerShell mein ye run karein:

```powershell
cd "C:\Users\mahad\.gemini\antigravity-ide\scratch\kartik-challenge"

# Git repository initialize karein
git init

# Files stage karein
git add .

# Initial commit
git commit -m "feat: ready for vercel deployment"

# GitHub remote add karein (apne GitHub repo ka URL yahan dalein)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kartik-challenge.git
git push -u origin main
```

### Step 2: Vercel Dashboard par Import karein
1. [vercel.com](https://vercel.com) par login karein.
2. **"Add New..."** -> **"Project"** par click karein.
3. Apna GitHub repo **`kartik-challenge`** select karein.
4. **Project Settings**:
   - **Framework Preset**: `Vite` (Vercel automatically detect kar lega)
   - **Root Directory**: `./` (Default)
   - **Build Command**: `npm run build` (Default)
   - **Output Directory**: `dist` (Default)
5. **Environment Variables** (Optional, default secrets already coded):
   - `JWT_SECRET`: `kartik-sacred-jwt-secret-2026` (ya koi bhi secret key)
6. **"Deploy"** button par click karein!

Aapki site **1-2 minute mein live** ho jayegi (e.g. `https://kartik-challenge.vercel.app`)!

---

## ⚡ Option 2: Vercel CLI ke zariye Direct Deploy karein

Agar GitHub par push nahi karna chahte aur direct terminal se deploy karna hai:

```powershell
cd "C:\Users\mahad\.gemini\antigravity-ide\scratch\kartik-challenge"

# Vercel CLI run karein
npx vercel
```

Poochhe gaye prompts par:
- `Set up and deploy?` -> **y**
- `Which scope?` -> (Apna account choose karein)
- `Link to existing project?` -> **n**
- `What's your project's name?` -> **kartik-challenge**
- `In which directory is your code located?` -> **./**
- `Want to modify settings?` -> **n**

Production deployment ke liye:
```powershell
npx vercel --prod
```

---

## 📁 Key Files Configured:
- **`vercel.json`**: API rewrites (`/api/*` -> `api/index.js`) aur SPA page routing (`/index.html`).
- **`api/index.js`**: Vercel Serverless Function entry point jo Express app ko wrap karta hai.
- **`server/db.js`**: Serverless compatible storage (`/tmp/kartik-data/store.json`) with in-memory fallback.
- **`server/index.js`**: Serverless export & URL normalization middleware.
- **`.vercelignore`**: Unnecessary files ko upload hone se rokta hai.
