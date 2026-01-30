# Blog Post Creator - Local Desktop Application

A polished desktop application for creating Jekyll blog posts locally. No need to manually format markdown or use the web interface.

## Features

✨ **Easy to Use**
- Modern tabbed interface (Details, Content, Preview & Publish)
- Auto-slug generation from title
- Category selection with emojis
- Character counter for SEO descriptions
- Live markdown preview

🎯 **Smart Functionality**
- Automatically detects your GitHub Pages repository
- Saves posts directly to `_posts/` directory
- Optional one-click commit & push to GitHub
- Remembers your last selected categories
- Full emoji support for categories

🔧 **Integrated Workflow**
- Create posts entirely offline
- Git integration to commit and push
- Template content to get started quickly
- Validates all required fields

## Installation & Usage

### Windows
1. Double-click `launch-blog-creator.bat` to launch the app
2. Fill in your post details
3. Write content in the "Content" tab
4. Review in "Preview & Publish" tab
5. Click "Create Post" to save and optionally push to GitHub

### macOS / Linux
1. Run `./launch-blog-creator.sh`
2. Same workflow as Windows

### Manual Launch
```bash
python3 blog-post-creator.py
```

## Requirements
- Python 3.6+
- tkinter (comes with Python)
- Git (for commit/push feature)

## What It Does

### Tab 1: Post Details
- **Title**: Your blog post title (auto-generates URL slug)
- **Categories**: Select from 7 categories with emojis
- **Tags**: Add comma-separated tags
- **Date & Time**: Publication date/time
- **Read Time**: Estimated reading time in minutes
- **Featured Image**: URL to post image
- **Description**: SEO meta description (character counter)

### Tab 2: Content
- Write your post in Markdown
- Comes with a helpful template
- Full syntax support

### Tab 3: Preview & Publish
- Live markdown preview with Jekyll frontmatter
- "Create Post" button to save the file
- Optional automatic Git commit & push

## File Naming Convention

Posts are saved as: `YYYY-MM-DD-your-slug-title.markdown`

Example: `2026-01-29-my-awesome-post.markdown`

## Configuration

The app remembers your last selected categories in `~/.blog-creator-config.json`

## Git Integration

When you click "Create Post", you'll be asked if you want to:
1. Save the file locally only, OR
2. Commit and push to GitHub automatically

The app will:
1. Stage the new post file
2. Commit with message: "Add: Blog post - [Your Title]"
3. Push to your remote repository

## Troubleshooting

**"Could not find _posts directory"**
- Make sure your GitHub Pages repository is properly set up
- The app tries to auto-detect common locations, but you can manually select it

**Git errors when pushing**
- Ensure you have git configured with your GitHub credentials
- Check that your remote is set up correctly: `git remote -v`

**Python/tkinter errors**
- Ensure Python 3.6+ is installed
- tkinter usually comes with Python. On Linux, you may need to install it separately:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install python3-tk
  
  # macOS (Homebrew)
  brew install python-tk
  ```

## Tips

💡 **For Best Results:**
- Keep titles clear and descriptive (slug will be auto-generated)
- Use standard Markdown syntax in the content
- Add featured images for better visual appeal
- Categories and tags help with discoverability
- Keep meta descriptions under 160 characters for SEO

📚 **Markdown Guide:**
```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
- Bullet list
1. Numbered list

[Link text](https://example.com)

![Image alt](image-url)

\`\`\`python
# Code block
code here
\`\`\`
```

## License

MIT License - Feel free to modify and share!
