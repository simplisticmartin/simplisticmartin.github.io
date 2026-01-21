

# 📝 Complete Blog Guide - How to Add & Manage Posts

## 🚀 Quick Start - Adding a New Post

### Method 1: Use a Template (EASIEST)

1. **Go to `_drafts/` folder**
2. **Choose your category template:**
   - `CAREER-template.md` → Career advice, JPMorgan insights
   - `AI-template.md` → AI/ML projects, Georgia Tech lessons
   - `QUANT-FINANCE-template.md` → Finance, trading, algorithms
   - `LEARNING-template.md` → Study tips, course reviews
   - `PUBLIC-SPEAKING-template.md` → Presentations, talks
   - `YOUTUBE-template.md` → Video content
   - `NONSENSE-template.md` → Random fun stuff

3. **Copy the template** to `_posts/` folder
4. **Rename it:** `YYYY-MM-DD-your-post-title.md`
   - Example: `2026-01-21-my-first-career-post.md`

5. **Fill in the content** - Just replace the example text!

6. **That's it!** Your post is now live.

---

## 📁 File Structure

```
simplisticmartin.github.io/
├── _posts/               ← Published posts go here
│   ├── 2026-01-21-my-post.md
│   └── 2026-01-22-another-post.md
├── _drafts/              ← Templates and drafts
│   ├── CAREER-template.md
│   ├── AI-template.md
│   ├── QUANT-FINANCE-template.md
│   ├── LEARNING-template.md
│   ├── PUBLIC-SPEAKING-template.md
│   ├── YOUTUBE-template.md
│   └── NONSENSE-template.md
└── assets/images/blog/   ← Your post images
    ├── career-default.jpg
    └── ai-default.jpg
```

---

## ✍️ Post Front Matter Explained

Every post starts with "front matter" - metadata between `---` lines:

```yaml
---
layout: post                              # Always "post"
title: "Your Amazing Post Title"          # Shows on blog
date: 2026-01-21 12:00:00                # YYYY-MM-DD HH:MM:SS
categories: [career]                      # See categories below
tags: [tag1, tag2, tag3]                 # For SEO and organization
author: Martin Li                         # Your name
read_time: 5                             # Estimated minutes to read
description: "Brief summary"              # For previews & SEO
image: /assets/images/blog/image.jpg     # Optional featured image
---
```

---

## 📚 Blog Categories

### Available Categories (use the slug in square brackets)

| Category | Slug | When to Use |
|----------|------|-------------|
| 💼 Career | `[career]` | Job advice, work experiences at JPMC |
| 🤖 AI & ML | `[ai]` | AI projects, ML algorithms, Georgia Tech AI coursework |
| 📈 Quant Finance | `[quant-finance]` | Financial engineering, algorithmic trading |
| 📚 Learning | `[learning]` | Study tips, course reviews, OMSCS experiences |
| 🎤 Public Speaking | `[public-speaking]` | Presentations, talks, communication tips |
| 🎥 YouTube | `[youtube]` | Video content, tutorials |
| 🎲 Nonsense | `[nonsense]` | Random fun stuff, personal thoughts |

### Multiple Categories

You can assign multiple categories to one post:

```yaml
categories: [career, ai]              # Career post about AI
categories: [learning, quant-finance] # Learning quant finance
```

---

## 🏷️ Suggested Tags by Category

### Career
```yaml
tags: [software-engineering, jpmorgan-chase, career-advice, professional-development, 
       tech-industry, interviews, resume-tips, networking]
```

### AI & Machine Learning
```yaml
tags: [artificial-intelligence, machine-learning, deep-learning, neural-networks,
       tensorflow, pytorch, georgia-tech, computer-vision, nlp, reinforcement-learning]
```

### Quant Finance
```yaml
tags: [quantitative-finance, algorithmic-trading, financial-engineering, options,
       derivatives, portfolio-optimization, risk-management, python, backtrader]
```

### Learning
```yaml
tags: [georgia-tech, omscs, study-tips, online-learning, course-review,
       time-management, productivity, education, work-life-balance]
```

### Public Speaking
```yaml
tags: [public-speaking, presentations, technical-talks, communication,
       slides, conference, workshop, teaching]
```

### YouTube
```yaml
tags: [youtube, video, tutorial, screencast, demo, content-creation,
       video-editing, education]
```

### Nonsense
```yaml
tags: [random, fun, humor, personal, thoughts, life, musings]
```

---

## 📝 Writing Tips

### 1. Start with Templates
All templates have a structure that works. Just fill in your content!

### 2. Keep Paragraphs Short
- 2-4 sentences max
- Makes it easier to read online
- Better for mobile viewers

### 3. Use Headers Properly
```markdown
# H1 - Only use once (your main title)
## H2 - Major sections
### H3 - Subsections
```

### 4. Add Code Blocks
````markdown
```python
def hello_world():
    print("Code is highlighted automatically!")
```
````

### 5. Include Images
```markdown
![Alt text](/assets/images/blog/my-image.jpg)
```

Put your images in: `assets/images/blog/`

### 6. Use Quotes for Emphasis
```markdown
> **Pro Tip:** Important insights go in blockquotes!
```

### 7. Create Lists
```markdown
- Bullet point
- Another point

1. Numbered list
2. Another item
```

---

## 🎯 Example: Creating a New Post

### Step-by-Step

**1. Copy a template:**
```bash
cp _drafts/CAREER-template.md _posts/2026-01-21-thriving-at-jpmorgan.md
```

**2. Edit the front matter:**
```yaml
---
layout: post
title: "5 Lessons from My First Year at JPMorgan Chase"
date: 2026-01-21 14:30:00
categories: [career]
tags: [jpmorgan-chase, career-advice, software-engineering, tech-industry]
author: Martin Li
read_time: 6
description: "What I learned in my first year as a Software Engineer at JPMorgan Chase"
image: /assets/images/blog/jpmc-office.jpg
---
```

**3. Write your content:**
Just replace the template text with your actual content!

**4. Preview locally:**
```bash
bundle exec jekyll serve
# Visit http://localhost:4000/Blog.html
```

**5. Publish:**
- The post is automatically live once it's in `_posts/`!
- On GitHub Pages, push to deploy

---

## 🔍 Testing Your Post

### Before Publishing, Check:

- [ ] File name: `YYYY-MM-DD-title.md` format
- [ ] File in `_posts/` folder (not `_drafts/`)
- [ ] Front matter has all required fields
- [ ] Categories are correct (lowercase slugs)
- [ ] Date is correct
- [ ] Images load (if used)
- [ ] Links work
- [ ] Code blocks format correctly
- [ ] No typos (run spell check!)

### Preview Locally:
```bash
cd simplisticmartin.github.io
bundle exec jekyll serve --drafts  # Include drafts
```

Visit: http://localhost:4000/Blog.html

---

## 🎨 Customizing Post Appearance

### Featured Images

Add a featured image that shows on the blog card:

```yaml
image: /assets/images/blog/my-image.jpg
```

**Image Guidelines:**
- Size: 1200x630px (optimal for social sharing)
- Format: JPG or PNG
- Keep under 500KB
- Use descriptive names

### Read Time

Estimate reading time (words ÷ 200):

```yaml
read_time: 5  # 5 minutes
```

---

## 📊 Blog Categories System

### How Categories Work

1. **Category Cards** - Show on main blog page
2. **Filter Buttons** - Click to filter posts
3. **Auto-Count** - Shows number of posts per category
4. **URL Links** - Direct link: `/Blog.html#career`

### Category Filter

Posts automatically filter when users:
- Click a category card
- Click a filter button
- Visit with a URL hash: `/Blog.html#ai`

---

## 🚀 Pro Tips

### 1. Use Drafts Folder
Work on posts in `_drafts/` first. Jekyll won't publish them until you move them to `_posts/`.

### 2. Date Format is Important
```
✅ GOOD: 2026-01-21-my-post.md
❌ BAD:  01-21-2026-my-post.md
❌ BAD:  2026-1-21-my-post.md  (needs leading zero)
```

### 3. Hyphens vs Underscores
```
✅ GOOD: my-awesome-post.md
❌ BAD:  my_awesome_post.md
```

### 4. Preview Before Publishing
Always run `bundle exec jekyll serve` to preview locally first!

### 5. Commit Messages
```bash
git add _posts/2026-01-21-new-post.md
git commit -m "Add: New career post about JPMorgan"
git push
```

---

## 🆘 Troubleshooting

### Post Not Showing?
- Check file name format: `YYYY-MM-DD-title.md`
- Check date isn't in the future
- File must be in `_posts/` folder
- Check front matter has `layout: post`

### Images Not Loading?
- Check path: `/assets/images/blog/image.jpg`
- Check file actually exists
- Check file name spelling (case-sensitive)

### Category Not Filtering?
- Use lowercase slug: `[career]` not `[Career]`
- Check category is defined in `_config.yml`
- Clear browser cache

### Server Won't Start?
```bash
# Try cleaning and rebuilding
bundle exec jekyll clean
bundle exec jekyll serve
```

---

## 📅 Content Calendar Ideas

### Career Posts
- Monthly: "What I Learned This Month at JPMC"
- Quarterly: "Career Growth Q1 Review"
- As-needed: Technical interviews, promotions, projects

### AI Posts
- Per course: Georgia Tech OMSCS course reviews
- Per project: ML project writeups
- Weekly: AI paper summaries

### Learning Posts
- Semester: Course reflections
- Monthly: Study techniques that worked
- As-needed: Resource recommendations

---

## ✅ Quick Checklist for Each Post

```markdown
Before Publishing:
☐ File named correctly: YYYY-MM-DD-title.md
☐ In _posts/ folder
☐ Front matter complete
☐ Categories assigned
☐ Tags added
☐ Description written (< 160 chars)
☐ Content proofread
☐ Code blocks tested
☐ Images optimized
☐ Previewed locally
☐ All links work
```

---

## 🎉 You're Ready!

Start with a template, fill in your content, and publish! The blog system handles everything else automatically.

**Need help?** Check the templates in `_drafts/` - they have examples for everything!

---

**Happy blogging! 📝✨**

