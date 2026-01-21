# 📝 Blog Quick Reference Card

## ⚡ Super Fast Guide

### Add a New Post in 3 Steps

```bash
# 1. Copy a template
cp _drafts/CAREER-template.md _posts/2026-01-21-my-post.md

# 2. Edit the file (add your content)

# 3. Preview
bundle exec jekyll serve
# Visit http://localhost:4000/Blog.html
```

That's it! Your post is live locally. Push to GitHub to publish.

---

## 📋 Blog Categories Cheat Sheet

| Icon | Category | Slug | Example Topics |
|------|----------|------|----------------|
| 💼 | Career | `career` | JPMC experiences, job advice, career growth |
| 🤖 | AI & ML | `ai` | ML projects, Georgia Tech courses, AI research |
| 📈 | Quant Finance | `quant-finance` | Trading algorithms, financial models, derivatives |
| 📚 | Learning | `learning` | Study tips, OMSCS reviews, course reflections |
| 🎤 | Public Speaking | `public-speaking` | Tech talks, presentations, communication |
| 🎥 | YouTube | `youtube` | Video tutorials, screencasts, demos |
| 🎲 | Nonsense | `nonsense` | Random thoughts, fun stuff, personal stories |

---

## 📝 Template Front Matter

Copy & paste this, then customize:

```yaml
---
layout: post
title: "Your Post Title Here"
date: 2026-01-21 12:00:00
categories: [career]
tags: [tag1, tag2, tag3]
author: Martin Li
read_time: 5
description: "Brief description under 160 characters"
image: /assets/images/blog/image.jpg
---
```

---

## 📅 File Naming Rules

```
✅ CORRECT: 2026-01-21-my-awesome-post.md
❌ WRONG:   01-21-2026-my-awesome-post.md
❌ WRONG:   2026-1-21-my-awesome-post.md
❌ WRONG:   my-awesome-post.md
```

**Pattern:** `YYYY-MM-DD-title-with-hyphens.md`

---

## 🎯 Category Selection Guide

**Ask yourself:** What's the PRIMARY topic?

- Talking about work/career? → **Career** 💼
- Explaining AI/ML concepts? → **AI** 🤖
- Financial trading/quant? → **Quant Finance** 📈
- Study tips/course review? → **Learning** 📚
- Gave a presentation? → **Public Speaking** 🎤
- Made a video? → **YouTube** 🎥
- Everything else/fun? → **Nonsense** 🎲

**Can use multiple:** `categories: [career, ai]`

---

## 🖼️ Image Paths

```markdown
# Absolute path (recommended)
![Image](/assets/images/blog/my-image.jpg)

# In post front matter
image: /assets/images/blog/featured.jpg
```

**Put images in:** `assets/images/blog/`

---

## 💻 Code Blocks

````markdown
```python
# Python code
def hello():
    print("Hello!")
```

```javascript
// JavaScript code
console.log("Hello!");
```

```bash
# Bash commands
git commit -m "message"
```
````

---

## 🔗 Adding Links

```markdown
[Link Text](https://example.com)
[Internal Link](/about)
```

---

## ✨ Special Formatting

```markdown
**Bold text**
*Italic text*
`inline code`

> Quote or important note

---
Horizontal line
```

---

## 🚀 Common Commands

```bash
# Preview locally
bundle exec jekyll serve

# Preview with drafts
bundle exec jekyll serve --drafts

# Clean and rebuild
bundle exec jekyll clean
bundle exec jekyll serve

# Stop server
# Press Ctrl+C in terminal
```

---

## 📱 Where Posts Appear

- ✅ Main Blog page (`/Blog.html`)
- ✅ RSS Feed (`/feed.xml`)
- ✅ Category filters
- ✅ Search engines (via sitemap)
- ✅ Social media previews

---

## 🎯 Tips for Success

1. **Use templates** - They have the right structure
2. **Write often** - Consistency matters
3. **Keep it real** - Authentic voice resonates
4. **Add value** - Solve problems, teach, inspire
5. **Check locally** - Always preview before pushing

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Post not showing | Check date format in filename |
| 404 error | Check file is in `_posts/` folder |
| Categories not working | Use lowercase slug in square brackets |
| Images broken | Check path starts with `/` |
| Server error | Run `bundle exec jekyll clean` |

---

## 📞 Need Help?

- Check: `HOW_TO_BLOG.md` (detailed guide)
- Check: `_drafts/` templates (examples)
- Check: Existing posts in `_posts/` (reference)

---

**Print this page and keep it handy!** 📄✨

