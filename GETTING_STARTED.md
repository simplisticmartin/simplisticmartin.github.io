# 🚀 Getting Started Guide

Welcome to your modern portfolio and blog! This guide will help you get up and running.

## 📋 Prerequisites

Before you begin, make sure you have:
- Git installed
- Ruby 2.7 or higher
- Bundler gem (`gem install bundler`)
- A text editor (VS Code recommended)

## 🔧 Initial Setup

### 1. Install Dependencies

```bash
# Navigate to your project directory
cd simplisticmartin.github.io

# Install Ruby gems
bundle install
```

### 2. Configure Your Site

Edit `_config.yml` with your information:

```yaml
title: "Your Name"
tagline: "Your Professional Title"
description: "Your site description"
email: your.email@example.com
author: Your Name

social:
  github: yourusername
  linkedin: yourusername
  email: your.email@example.com

url: "https://yourusername.github.io"
```

### 3. Update Your Profile

Replace the profile image:
- Add your photo to `/img/profile-pic.jpg`
- Recommended size: 500x500px
- Format: JPG or PNG

### 4. Add Your Projects

Edit `assets/js/projects-data.js`:

```javascript
const projects = [
  {
    title: "Project Name",
    description: "Project description...",
    image: "/img/project-icons/project.png",
    tags: ["JavaScript", "React", "Node.js"],
    github: "https://github.com/yourusername/project",
    demo: "https://project-demo.com",
    featured: true
  },
  // Add more projects...
];
```

### 5. Update Your Resume

- Replace `/Resume.pdf` with your resume
- Or update the link in navigation files

## 📝 Creating Blog Posts

### Quick Start

1. Create a new file in `_posts/` directory
2. Name it: `YYYY-MM-DD-title.markdown`
3. Use the template from `_drafts/TEMPLATE.md`

### Blog Post Format

```markdown
---
layout: post
title: "My First Post"
date: 2026-01-20 12:00:00
categories: [category1, category2]
tags: [tag1, tag2, tag3]
author: Your Name
read_time: 5
description: "Post description"
---

Your content here...
```

### Preview Your Post

```bash
# Start the development server
bundle exec jekyll serve

# Visit http://localhost:4000
```

## 🎨 Customization

### Colors

Edit `assets/css/modern.css`:

```css
:root {
  --primary-color: #6366f1;    /* Main brand color */
  --secondary-color: #ec4899;   /* Accent color */
  /* Modify other variables... */
}
```

### Fonts

Change fonts in `_layouts/default.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap" rel="stylesheet">
```

Then update CSS:

```css
:root {
  --font-primary: 'YourFont', sans-serif;
}
```

## 🚀 Deployment

### GitHub Pages (Recommended)

1. **Commit your changes:**
```bash
git add .
git commit -m "Update portfolio"
```

2. **Push to GitHub:**
```bash
git push origin master
```

3. **Enable GitHub Pages:**
   - Go to your repository settings
   - Scroll to "GitHub Pages"
   - Select "master" branch as source
   - Save

4. **Your site will be live at:**
   `https://yourusername.github.io`

### Custom Domain (Optional)

1. Add `CNAME` file with your domain
2. Configure DNS settings with your registrar
3. Enable HTTPS in GitHub settings

## 🧪 Testing Locally

```bash
# Serve site with drafts
bundle exec jekyll serve --drafts

# Serve with live reload
bundle exec jekyll serve --livereload

# Build for production
bundle exec jekyll build
```

## 📊 Analytics (Optional)

### Google Analytics

1. Get your GA4 tracking ID
2. Add to `_config.yml`:
```yaml
google_analytics: "G-XXXXXXXXXX"
```

## 🔍 SEO Optimization

Your site is already optimized with:
- ✅ Meta descriptions
- ✅ Open Graph tags
- ✅ Twitter Cards
- ✅ Sitemap
- ✅ robots.txt
- ✅ RSS feed

### Improve SEO Further:

1. **Write good meta descriptions** for each post
2. **Use descriptive titles** (50-60 characters)
3. **Optimize images** (compress before uploading)
4. **Use internal links** between posts
5. **Submit sitemap** to Google Search Console

## 🐛 Troubleshooting

### Jekyll won't start

```bash
# Update gems
bundle update

# Clean cache
bundle exec jekyll clean

# Rebuild
bundle exec jekyll serve
```

### CSS not updating

- Clear browser cache (Ctrl+Shift+R)
- Check file paths in HTML
- Verify CSS file exists

### Images not showing

- Check file paths (case-sensitive)
- Ensure images are in correct directory
- Use relative paths: `/img/image.jpg`

## 📚 Useful Resources

- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [GitHub Pages Guide](https://docs.github.com/en/pages)
- [Markdown Guide](https://www.markdownguide.org/)
- [Font Awesome Icons](https://fontawesome.com/icons)

## 💡 Tips & Best Practices

### Writing

- Keep paragraphs short (3-4 sentences)
- Use headings to organize content
- Add images to break up text
- Include code examples when relevant
- Proofread before publishing

### Images

- Optimize for web (< 200KB)
- Use descriptive file names
- Add alt text for accessibility
- Consider using WebP format

### Performance

- Minimize custom JavaScript
- Optimize images
- Use external CDNs for libraries
- Enable browser caching

## 🆘 Need Help?

- **Documentation:** Check the README.md
- **Issues:** Open an issue on GitHub
- **Questions:** Email simplisticmartin@gmail.com

## 🎉 Next Steps

1. ✅ Customize your site information
2. ✅ Add your projects
3. ✅ Write your first blog post
4. ✅ Push to GitHub Pages
5. ✅ Share with the world!

---

**Happy coding! 🚀**
