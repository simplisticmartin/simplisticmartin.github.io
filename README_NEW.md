# 🚀 Modern Portfolio & Blog

[![Jekyll](https://img.shields.io/badge/Jekyll-CC0000?style=for-the-badge&logo=jekyll&logoColor=white)](https://jekyllrb.com/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=github&logoColor=white)](https://pages.github.com/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A modern, responsive portfolio and blog website built with the latest web technologies and best practices. Features a clean design, smooth animations, and optimized performance.

🌐 **Live Site:** [simplisticmartin.github.io](https://simplisticmartin.github.io)

## ✨ Features

### 🎨 Modern Design
- Clean, professional aesthetic with modern gradients
- Responsive design that works on all devices
- Smooth animations and transitions
- Interactive particle background
- Dark mode support (auto-detects system preference)

### 📱 Fully Responsive
- Mobile-first approach
- Optimized for tablets, phones, and desktops
- Hamburger menu for mobile navigation

### 📝 Powerful Blog
- Jekyll-powered static blog
- SEO optimized with meta tags
- Social sharing buttons
- Previous/Next post navigation
- Reading time estimates
- Syntax highlighting for code blocks

### 🚀 Performance Optimized
- Fast page loads
- Lazy loading images
- Minimal JavaScript
- Optimized CSS with CSS variables
- Perfect Lighthouse scores

### 🔍 SEO Ready
- Meta tags and Open Graph support
- Sitemap generation
- RSS feed
- Structured data

## 🛠️ Technologies Used

- **Jekyll** - Static site generator
- **GitHub Pages** - Free hosting
- **HTML5 & CSS3** - Modern web standards
- **JavaScript (ES6+)** - Interactive features
- **Font Awesome** - Icon library
- **Google Fonts** - Typography (Inter & Poppins)

## 📦 Installation & Setup

### Prerequisites
- Ruby (2.7+)
- Bundler
- Git

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/simplisticmartin/simplisticmartin.github.io.git
cd simplisticmartin.github.io
```

2. **Install dependencies**
```bash
bundle install
```

3. **Run the development server**
```bash
bundle exec jekyll serve
```

4. **View your site**
Open your browser and navigate to `http://localhost:4000`

### Building for Production

```bash
bundle exec jekyll build
```

The site will be generated in the `_site` directory.

## 📝 Creating New Blog Posts

Create a new file in the `_posts` directory with the format: `YYYY-MM-DD-title.markdown`

```markdown
---
layout: post
title: "Your Post Title"
date: 2026-01-20 12:00:00
categories: [category1, category2]
tags: [tag1, tag2, tag3]
author: Martin Li
read_time: 5
description: "A brief description of your post"
---

Your content here...
```

## 🎨 Customization

### Colors
Edit CSS variables in `assets/css/modern.css`:
```css
:root {
  --primary-color: #6366f1;
  --secondary-color: #ec4899;
  /* ... more variables */
}
```

### Site Information
Edit `_config.yml`:
```yaml
title: "Your Name"
tagline: "Your Tagline"
email: your.email@example.com
# ... more settings
```

### Projects
Edit `assets/js/projects-data.js` to add your projects.

## 📁 Project Structure

```
simplisticmartin.github.io/
├── _layouts/           # HTML layouts
│   ├── default.html    # Base layout
│   ├── post.html       # Blog post layout
│   └── page.html       # Page layout
├── _posts/             # Blog posts
├── _includes/          # Reusable components
├── assets/
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript files
│   └── images/         # Images
├── old-version/        # Previous version backup
├── _config.yml         # Jekyll configuration
├── Gemfile             # Ruby dependencies
└── index.html          # Homepage
```

## 🌟 Key Features Explained

### Particle Animation
The hero section features an interactive particle system that responds to mouse movement. Built with vanilla JavaScript and HTML5 Canvas.

### Smooth Scroll
Smooth scrolling navigation with offset compensation for the fixed navbar.

### Intersection Observer
Elements fade in as they scroll into view using the modern Intersection Observer API.

### SEO Optimization
- Jekyll SEO Tag plugin
- Meta descriptions
- Open Graph tags
- Twitter Cards
- Sitemap
- RSS Feed

## 🔗 Links

- **Old Version:** [View Legacy Site](/old-version/)
- **GitHub:** [Source Code](https://github.com/simplisticmartin/simplisticmartin.github.io)
- **Resume:** [Download PDF](/Resume.pdf)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Found a bug or want to contribute? Feel free to open an issue or submit a pull request!

## 📧 Contact

**Martin Li**
- Email: simplisticmartin@gmail.com
- GitHub: [@simplisticmartin](https://github.com/simplisticmartin)
- LinkedIn: [simplisticmartin](https://www.linkedin.com/in/simplisticmartin)

---

⭐ **Star this repo if you found it helpful!**

Built with ❤️ using Jekyll and GitHub Pages
