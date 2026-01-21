# 🚀 Deployment Checklist

Before deploying your modernized portfolio to GitHub Pages, go through this checklist to ensure everything is configured correctly.

## ✅ Configuration

### 1. Update Site Information
- [ ] Edit `_config.yml`
  - [ ] Update `title` with your name
  - [ ] Update `tagline` with your professional title
  - [ ] Update `description`
  - [ ] Update `email` address
  - [ ] Update `author` name
  - [ ] Update `url` to your GitHub Pages URL
  - [ ] Update social links (GitHub, LinkedIn)

### 2. Personalize Content
- [ ] Replace `/img/profile-pic.jpg` with your photo
- [ ] Update `/Resume.pdf` with your resume
- [ ] Update `/about.md` with your information
- [ ] Review and update `index.html` content

### 3. Add Your Projects
- [ ] Edit `assets/js/projects-data.js`
- [ ] Add your projects with:
  - [ ] Title
  - [ ] Description
  - [ ] Tags/technologies
  - [ ] GitHub link (if public)
  - [ ] Demo link (if available)
  - [ ] Project images

### 4. Verify Old Version
- [ ] Confirm `/old-version/` folder exists
- [ ] Test old version is accessible
- [ ] Verify link in navigation works

## 🎨 Customization (Optional)

### Colors
- [ ] Customize colors in `assets/css/modern.css` if desired
- [ ] Test color contrast for accessibility

### Fonts
- [ ] Keep default fonts or update in `_layouts/default.html`
- [ ] Update CSS font variables if changed

### Images
- [ ] Add project screenshots to `/img/screenshots/`
- [ ] Add project icons to `/img/project-icons/`
- [ ] Optimize all images (compress to < 200KB each)

## 📝 Content

### Blog Posts
- [ ] Review existing blog posts
- [ ] Write at least one new blog post
- [ ] Verify post metadata (title, date, categories, tags)
- [ ] Check all images in posts load correctly

### Pages
- [ ] Review About page
- [ ] Test all internal links
- [ ] Verify external links open in new tabs

## 🔍 Testing

### Local Testing
- [ ] Run `bundle install`
- [ ] Run `bundle exec jekyll serve`
- [ ] Visit `http://localhost:4000`
- [ ] Test all pages load correctly
- [ ] Test navigation (especially mobile menu)
- [ ] Test smooth scrolling
- [ ] Verify particle animation works
- [ ] Check responsive design on different screen sizes

### Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile browsers

### Functionality Testing
- [ ] All navigation links work
- [ ] Mobile hamburger menu opens/closes
- [ ] Smooth scroll to sections works
- [ ] Projects display correctly
- [ ] Blog posts render properly
- [ ] Social links work
- [ ] Resume PDF downloads
- [ ] Old version link works
- [ ] 404 page displays correctly

### Visual Testing
- [ ] Profile image displays
- [ ] All icons load (Font Awesome)
- [ ] Fonts load correctly (Inter & Poppins)
- [ ] Colors look good
- [ ] Spacing is consistent
- [ ] No layout issues on mobile

## 🚀 Performance

### Optimization
- [ ] Images are compressed
- [ ] No console errors
- [ ] Page loads quickly
- [ ] Animations are smooth

### SEO
- [ ] Meta descriptions are present
- [ ] Page titles are descriptive
- [ ] Images have alt text
- [ ] Links have descriptive text

## 📊 Analytics (Optional)

### Google Analytics
- [ ] Get Google Analytics 4 property ID
- [ ] Add to `_config.yml` under `google_analytics`
- [ ] Test tracking is working

## 🔐 Security

### Links
- [ ] External links have `rel="noopener"`
- [ ] External links have `target="_blank"`
- [ ] No broken links

## 📱 GitHub Pages Setup

### Repository Settings
- [ ] Repository is public
- [ ] GitHub Pages is enabled
- [ ] Source is set to `master` branch
- [ ] Custom domain configured (if using one)

### Deployment
- [ ] All changes committed
- [ ] Push to GitHub: `git push origin master`
- [ ] Wait for GitHub Pages to build (2-10 minutes)
- [ ] Visit your site: `https://yourusername.github.io`

### Post-Deployment Testing
- [ ] Site loads on GitHub Pages
- [ ] All assets load (CSS, JS, images)
- [ ] HTTPS works
- [ ] No 404 errors in browser console
- [ ] Mobile version works
- [ ] Test on actual mobile device

## 📈 Post-Launch

### Monitoring
- [ ] Check Google Search Console
- [ ] Submit sitemap: `https://yourusername.github.io/sitemap.xml`
- [ ] Monitor analytics (if enabled)
- [ ] Check for broken links periodically

### Social Media
- [ ] Share on LinkedIn
- [ ] Share on Twitter
- [ ] Update GitHub profile README
- [ ] Add to resume

### Maintenance
- [ ] Plan regular blog posts
- [ ] Update projects as you complete them
- [ ] Keep resume current
- [ ] Fix any issues reported

## 🐛 Troubleshooting

### Site Not Loading
- [ ] Check GitHub Pages is enabled
- [ ] Verify repository is public
- [ ] Check build status in repository actions
- [ ] Review `_config.yml` for errors

### CSS/JS Not Loading
- [ ] Check file paths are correct
- [ ] Clear browser cache
- [ ] Check browser console for errors
- [ ] Verify files exist in repository

### Images Not Showing
- [ ] Verify image paths (case-sensitive)
- [ ] Check images are committed to repository
- [ ] Use relative paths: `/img/image.jpg`
- [ ] Check image file extensions

### Jekyll Build Errors
- [ ] Run `bundle exec jekyll build` locally
- [ ] Check for syntax errors in files
- [ ] Verify all required files exist
- [ ] Check front matter formatting

## 📞 Need Help?

If you encounter issues:
1. Check `GETTING_STARTED.md`
2. Review `UPGRADE_SUMMARY.md`
3. Search GitHub Pages documentation
4. Open an issue on the repository

## ✨ Final Steps

Once everything is working:
- [ ] Take screenshots for your portfolio
- [ ] Write a blog post about the upgrade
- [ ] Share your new site!
- [ ] Celebrate! 🎉

---

## Quick Deployment Commands

```bash
# Install dependencies (first time only)
bundle install

# Test locally
bundle exec jekyll serve

# Commit changes
git add .
git commit -m "Deploy modernized portfolio"

# Push to GitHub
git push origin master

# Your site will be live at:
# https://yourusername.github.io
```

---

**Ready to deploy? Check all the boxes above and push to GitHub!** 🚀
