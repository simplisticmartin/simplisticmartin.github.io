# 🚀 New Post Workflow - Super Simple!

## The Absolute Easiest Way to Add a Blog Post

### Option 1: Use File Explorer (Windows)

1. **Open File Explorer** → Navigate to:
   ```
   C:\Users\Marti\Desktop\gith\simplisticmartin.github.io\_drafts\
   ```

2. **Choose your template:**
   - `CAREER-template.md` → Work & career stuff
   - `AI-template.md` → AI & machine learning
   - `QUANT-FINANCE-template.md` → Finance & trading
   - `LEARNING-template.md` → Study tips & courses
   - `PUBLIC-SPEAKING-template.md` → Presentations
   - `YOUTUBE-template.md` → Video content
   - `NONSENSE-template.md` → Random fun stuff

3. **Copy the template file**

4. **Paste it in the `_posts` folder:**
   ```
   C:\Users\Marti\Desktop\gith\simplisticmartin.github.io\_posts\
   ```

5. **Rename it** to today's date + your title:
   ```
   2026-01-21-my-awesome-post.md
   ```

6. **Open in any text editor** (VS Code, Notepad++, etc.)

7. **Edit the top section** (between the `---` lines):
   - Change the title
   - Update the date
   - Update the description
   - Keep the category

8. **Replace the template content** with your actual blog post

9. **Save the file**

10. **Done!** Your post is ready!

---

### Option 2: Use PowerShell (Quick)

```powershell
# Navigate to project
cd C:\Users\Marti\Desktop\gith\simplisticmartin.github.io

# Copy template and rename in one step
Copy-Item "_drafts\CAREER-template.md" "_posts\2026-01-21-my-post-title.md"

# Open in VS Code (or your editor)
code "_posts\2026-01-21-my-post-title.md"
```

Edit and save!

---

## 📝 What to Edit in the Template

When you open the template, you'll see this at the top:

```yaml
---
layout: post                          ← KEEP THIS
title: "Your Post Title"              ← CHANGE TO YOUR TITLE
date: 2026-01-21 12:00:00            ← CHANGE TO TODAY'S DATE
categories: [career]                  ← KEEP OR CHANGE CATEGORY
tags: [tag1, tag2]                   ← ADD RELEVANT TAGS
author: Martin Li                     ← KEEP THIS
read_time: 5                         ← ESTIMATE READING TIME
description: "Brief summary"          ← WRITE A SHORT DESCRIPTION
image: /assets/images/blog/img.jpg   ← OPTIONAL: ADD IMAGE PATH
---
```

Below the `---` is your actual blog content. Replace all the example text!

---

## 🎯 Real Example

Let's say you want to write about your day at JPMorgan:

**1. Copy template:**
```
_drafts\CAREER-template.md 
→ 
_posts\2026-01-21-first-month-at-jpmc.md
```

**2. Edit the front matter:**
```yaml
---
layout: post
title: "5 Things I Learned in My First Month at JPMorgan Chase"
date: 2026-01-21 14:00:00
categories: [career]
tags: [jpmorgan-chase, career-advice, software-engineering, fintech]
author: Martin Li
read_time: 6
description: "Lessons from my first month as a Software Engineer at JPMorgan Chase"
---
```

**3. Write your content:**
```markdown
# Starting at JPMorgan Chase

My first month at JPMC has been incredible. Here's what I learned...

## Lesson 1: Enterprise Scale is Different

Working on systems that handle billions of transactions...
```

**4. Save and preview:**
```bash
bundle exec jekyll serve
```

**5. Visit:** http://localhost:4000/Blog.html

---

## 📊 How Your Post Will Appear

### On Blog Page
```
┌─────────────────────────────┐
│  💼 [Your Image]            │
│                             │
│  📅 January 21, 2026        │
│  🏷️ career                  │
│                             │
│  Your Post Title            │
│                             │
│  Your description text...   │
│                             │
│  [Read More →]              │
└─────────────────────────────┘
```

### When Filtered
- Click "💼 Career" → Only career posts show
- Click "🤖 AI" → Only AI posts show
- Click "All" → All posts show

---

## 🎨 Category Color Coding

Your categories have consistent colors:
- 💼 Career → Teal
- 🤖 AI → Green
- 📈 Quant Finance → Turquoise
- 📚 Learning → Teal
- 🎤 Public Speaking → Green
- 🎥 YouTube → Turquoise
- 🎲 Nonsense → Teal

---

## ✅ Pre-Publish Checklist

Quick checklist before you publish:

```
☐ File name: 2026-MM-DD-title.md (with leading zeros)
☐ File location: _posts/ folder
☐ Title: Descriptive and engaging
☐ Date: Correct format
☐ Categories: At least one category
☐ Tags: 3-5 relevant tags
☐ Description: Under 160 characters
☐ Content: Spell-checked
☐ Preview: Looks good at localhost:4000
```

---

## 🚀 Publishing Workflow

### Locally (Testing)
```bash
# Already running? Your post shows up automatically!
# Not running? Start server:
bundle exec jekyll serve
```

### GitHub Pages (Live)
```bash
# After you're happy with your post:
git add _posts/2026-01-21-my-post.md
git commit -m "Add: New career post about JPMC"
git push origin master

# GitHub Pages will automatically build and deploy
# Live in ~2-5 minutes
```

---

## 💡 Content Ideas by Category

### 💼 Career
- "Day in the life at JPMorgan Chase"
- "Interview tips for software engineers"
- "Career lessons learned"
- "Tech stack at JPMC"

### 🤖 AI
- "Implementing neural networks in PyTorch"
- "Georgia Tech AI course review"
- "AI project walkthroughs"
- "Research paper summaries"

### 📈 Quant Finance
- "Building a trading algorithm"
- "Options pricing models"
- "Portfolio optimization with Python"
- "Financial data analysis"

### 📚 Learning
- "How I balance work and OMSCS"
- "Study techniques that work"
- "Georgia Tech course reviews"
- "Resource recommendations"

### 🎤 Public Speaking
- "My first tech talk"
- "Presentation tips"
- "Overcoming stage fright"
- "Creating effective slides"

### 🎥 YouTube
- "New tutorial video"
- "Behind the scenes"
- "Video series announcement"
- "Viewer Q&A"

### 🎲 Nonsense
- "Random thoughts"
- "Weekend adventures"
- "Funny coding stories"
- "Book/movie reviews"

---

## 🎉 You're All Set!

**Remember:** Start with a template, fill it in, save to `_posts/`, and you're done!

The blog system handles:
- ✅ Displaying your post
- ✅ Category filtering
- ✅ RSS feed
- ✅ SEO optimization
- ✅ Social sharing
- ✅ Mobile responsiveness

You just focus on writing great content! ✍️

---

**Happy blogging!** 🚀
