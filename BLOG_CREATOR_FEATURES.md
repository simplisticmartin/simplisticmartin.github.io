# 📝 Blog Post Creator - Feature Guide

## ✨ Latest Improvements

### 📋 **Template System**
- **Location**: Top-right dropdown menu
- **Templates Available**:
  - General - Standard blog post structure
  - AI & ML - Technical AI/ML posts with code examples
  - Career - Career journey and lessons learned
  - Quant Finance - Financial modeling with equations
  - Tutorial - Step-by-step how-to guides
- **Usage**: Select template → Confirm to replace current content
- **Benefit**: Start writing faster with pre-structured content

### 🔍 **Find & Replace**
- **Shortcut**: `Ctrl+F`
- **Features**:
  - Find Next - Navigate through matches
  - Replace - Replace current match
  - Replace All - Replace all occurrences at once
- **Use Case**: Quick editing, consistent terminology updates

### 📊 **Writing Statistics**
- **Access**: Click 📊 button in toolbar
- **Metrics Shown**:
  - Word count & character count
  - Lines, paragraphs, sentences
  - Average word length
  - Estimated reading time
  - Headings, code blocks, links count
- **Benefit**: Track writing progress and content structure

### 🔠 **Font Size Controls**
- **Location**: Top-right (+ and − buttons)
- **Range**: 8pt to 20pt
- **Default**: 11pt Consolas
- **Benefit**: Adjust for comfort and screen size

### 📂 **Load Existing Posts**
- **Feature**: Edit published posts or drafts
- **Process**:
  1. Click "📂 Load Post"
  2. Choose _drafts or _posts folder
  3. Select markdown file
  4. All metadata auto-populated
- **Benefit**: Full edit capability for existing content

### 💾 **Save Draft**
- **Shortcut**: `Ctrl+S`
- **Location**: Saves to `_drafts` folder
- **Auto-naming**: Uses slug from title
- **Benefit**: Work in progress without publishing

### 📈 **Auto Reading Time**
- **Calculation**: Based on 200 words/minute
- **Updates**: Real-time as you type
- **Display**: In form field automatically
- **Benefit**: Accurate reader expectations

### ⌨️ **Keyboard Shortcuts**
- `Ctrl+B` - Bold selected text
- `Ctrl+I` - Italic selected text
- `Ctrl+S` - Save draft
- `Ctrl+F` - Find & replace
- `Ctrl+K` - Insert link

### 🎨 **Enhanced Markdown Preview**
- **Styled Rendering**:
  - Headers in blue with size hierarchy
  - Bold/italic formatting
  - Code with syntax highlighting colors
  - Links with underlines
  - Blockquotes with indentation
- **YAML Frontmatter**: Dimmed, monospace font
- **Real-time Updates**: 300ms debounce for smooth typing

### 📊 **Word Count Display**
- **Location**: Top-right header
- **Updates**: Real-time while typing
- **Color**: Accent blue for visibility
- **Format**: "1,234 words" with comma separators

### ✅ **Status Feedback**
- Draft saved confirmation
- Post created success
- Template loaded notification
- Font size changes
- Auto-dismiss after 2-3 seconds

## 🎯 Complete Workflow

1. **Start New Post**
   - Select template (optional)
   - Fill in title (auto-generates slug)
   - Choose categories and tags
   - Set date/time (auto-filled to now)

2. **Write Content**
   - Use markdown toolbar for formatting
   - Check word count in real-time
   - Preview styled output
   - Save draft frequently (Ctrl+S)

3. **Polish & Review**
   - Use Find & Replace for consistency
   - Check statistics for content metrics
   - Adjust font size for comfortable editing
   - Verify preview rendering

4. **Publish**
   - Click "✅ Create & Publish"
   - Choose to push to GitHub
   - Automatic git commit with title
   - Success confirmation

## 🚀 Pro Tips

- **Templates**: Customize templates in the code for your writing style
- **Drafts**: Use drafts for posts in progress, load anytime to continue
- **Statistics**: Check regularly to ensure balanced content structure
- **Font Size**: Adjust based on time of day and screen distance
- **Find/Replace**: Great for changing technical terms or fixing typos in bulk
- **Word Count**: Aim for 800-1500 words for blog posts
- **Reading Time**: 3-7 minutes is ideal for most readers

## 🎨 UI Features

- **Dark Theme**: Eye-friendly dark navy background
- **Accent Colors**: Blue for interactive elements
- **Status Colors**: 
  - Green for success
  - Amber for warnings
  - Red for errors
  - Gray for hints
- **Typography**: Segoe UI for UI, Consolas for code
- **Hover Effects**: Visual feedback on all buttons
- **Responsive**: Adapts to window resizing

## 📝 Markdown Support

- Headers (H1-H3)
- Bold, italic, strikethrough
- Inline code and code blocks
- Bullet and numbered lists
- Links and images
- Blockquotes
- YAML frontmatter

## 🔧 Technical Details

- **Auto-save**: Drafts saved to `_drafts` folder
- **Git Integration**: Automatic commit and push
- **Config Persistence**: Remembers category selections
- **File Format**: Markdown with Jekyll frontmatter
- **Encoding**: UTF-8 for international characters
- **Undo Support**: Full undo/redo in editor

---

**Version**: 2.0
**Last Updated**: January 30, 2026
**Platform**: Windows, Mac, Linux (Python + Tkinter)
