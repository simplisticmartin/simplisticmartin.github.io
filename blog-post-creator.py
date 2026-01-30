#!/usr/bin/env python3
"""
Blog Post Creator - A local desktop application for creating Jekyll blog posts
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import json
import os
import subprocess
from datetime import datetime
from pathlib import Path
import re


class BlogPostCreator:
    def __init__(self, root):
        self.root = root
        self.root.title("Blog Post Creator")
        self.root.geometry("1200x900")
        
        # Set theme colors
        self.root.configure(bg="#f5f5f5")
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Define colors
        self.primary_color = "#667eea"
        self.secondary_color = "#764ba2"
        self.bg_color = "#f5f5f5"
        self.card_bg = "#ffffff"
        self.text_color = "#1a1a1a"
        self.border_color = "#e0e0e0"
        self.success_color = "#10b981"
        
        # Detect repo path
        self.repo_path = self.detect_repo_path()
        self.posts_path = os.path.join(self.repo_path, "_posts") if self.repo_path else None
        
        # Categories and their emojis
        self.categories = {
            "Career": "💼",
            "AI & Machine Learning": "🤖",
            "Quant Finance": "📈",
            "Learning": "📚",
            "Public Speaking": "🎤",
            "YouTube": "🎥",
            "Nonsense": "🎲"
        }
        
        self.setup_ui()
        self.load_config()
        
    def detect_repo_path(self):
        """Detect the GitHub Pages repository path"""
        # Check common locations
        common_paths = [
            os.path.expanduser("~/Desktop/gith/simplisticmartin.github.io"),
            os.path.expanduser("~/Desktop/github/simplisticmartin.github.io"),
            os.path.expanduser("~/Documents/simplisticmartin.github.io"),
        ]
        
        for path in common_paths:
            if os.path.exists(os.path.join(path, "_posts")):
                return path
        
        # Fallback: ask user
        repo = filedialog.askdirectory(title="Select your GitHub Pages repository")
        return repo if repo else None
    
    def setup_ui(self):
        """Create the main UI"""
        # Main container
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Header
        header_frame = ttk.Frame(main_frame)
        header_frame.pack(fill="x", pady=(0, 20))
        
        title_label = ttk.Label(
            header_frame,
            text="✍️  Blog Post Creator",
            font=("Segoe UI", 24, "bold")
        )
        title_label.pack(side="left")
        
        subtitle_label = ttk.Label(
            header_frame,
            text=f"Repository: {os.path.basename(self.repo_path) if self.repo_path else 'Not found'}",
            font=("Segoe UI", 10)
        )
        subtitle_label.pack(side="left", padx=(20, 0))
        
        # Create notebook for tabs
        notebook = ttk.Notebook(main_frame)
        notebook.pack(fill="both", expand=True)
        
        # Tab 1: Post Details
        self.details_frame = ttk.Frame(notebook)
        notebook.add(self.details_frame, text="Post Details")
        self.setup_details_tab()
        
        # Tab 2: Content
        self.content_frame = ttk.Frame(notebook)
        notebook.add(self.content_frame, text="Content")
        self.setup_content_tab()
        
        # Tab 3: Preview & Publish
        self.preview_frame = ttk.Frame(notebook)
        notebook.add(self.preview_frame, text="Preview & Publish")
        self.setup_preview_tab()
        
    def setup_details_tab(self):
        """Setup the post details tab"""
        canvas = tk.Canvas(self.details_frame, bg=self.bg_color, highlightthickness=0)
        scrollbar = ttk.Scrollbar(self.details_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Title
        ttk.Label(scrollable_frame, text="Post Title *", font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(10, 5))
        self.title_var = tk.StringVar()
        title_entry = ttk.Entry(scrollable_frame, textvariable=self.title_var, font=("Segoe UI", 10), width=50)
        title_entry.pack(anchor="w", fill="x", pady=(0, 15))
        title_entry.bind("<KeyRelease>", self.update_slug)
        
        # Slug
        ttk.Label(scrollable_frame, text="URL Slug (auto-generated) *", font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(0, 5))
        self.slug_var = tk.StringVar()
        slug_entry = ttk.Entry(scrollable_frame, textvariable=self.slug_var, font=("Segoe UI", 10), width=50, state="readonly")
        slug_entry.pack(anchor="w", fill="x", pady=(0, 15))
        
        # Date and Time
        ttk.Label(scrollable_frame, text="Publication Date & Time *", font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(0, 5))
        
        date_frame = ttk.Frame(scrollable_frame)
        date_frame.pack(anchor="w", fill="x", pady=(0, 15))
        
        self.date_var = tk.StringVar(value=datetime.now().strftime("%Y-%m-%d"))
        date_entry = ttk.Entry(date_frame, textvariable=self.date_var, font=("Segoe UI", 10), width=15)
        date_entry.pack(side="left", padx=(0, 10))
        
        self.time_var = tk.StringVar(value=datetime.now().strftime("%H:%M:%S"))
        time_entry = ttk.Entry(date_frame, textvariable=self.time_var, font=("Segoe UI", 10), width=15)
        time_entry.pack(side="left")
        
        # Categories
        ttk.Label(scrollable_frame, text="Categories * (Select at least one)", font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(10, 10))
        
        self.categories_vars = {}
        categories_frame = ttk.Frame(scrollable_frame)
        categories_frame.pack(anchor="w", fill="x", pady=(0, 15))
        
        for idx, (cat, emoji) in enumerate(self.categories.items()):
            var = tk.BooleanVar()
            self.categories_vars[cat] = var
            cb = ttk.Checkbutton(categories_frame, text=f"{emoji} {cat}", variable=var)
            cb.grid(row=idx // 2, column=idx % 2, sticky="w", padx=(0, 20), pady=5)
        
        # Tags
        ttk.Label(scrollable_frame, text="Tags (comma-separated)", font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(10, 5))
        self.tags_var = tk.StringVar()
        tags_entry = ttk.Entry(scrollable_frame, textvariable=self.tags_var, font=("Segoe UI", 10), width=50)
        tags_entry.pack(anchor="w", fill="x", pady=(0, 15))
        tags_label = ttk.Label(scrollable_frame, text="e.g., software-engineering, tutorial, python", font=("Segoe UI", 9), foreground="#666")
        tags_label.pack(anchor="w", pady=(0, 15))
        
        # Read Time
        ttk.Label(scrollable_frame, text="Estimated Read Time (minutes) *", font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(0, 5))
        self.read_time_var = tk.IntVar(value=5)
        read_time_spin = ttk.Spinbox(scrollable_frame, from_=1, to=60, textvariable=self.read_time_var, width=10)
        read_time_spin.pack(anchor="w", pady=(0, 15))
        
        # Featured Image
        ttk.Label(scrollable_frame, text="Featured Image URL", font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(10, 5))
        self.image_var = tk.StringVar()
        image_entry = ttk.Entry(scrollable_frame, textvariable=self.image_var, font=("Segoe UI", 10), width=50)
        image_entry.pack(anchor="w", fill="x", pady=(0, 5))
        image_label = ttk.Label(scrollable_frame, text="e.g., /assets/images/my-post.jpg", font=("Segoe UI", 9), foreground="#666")
        image_label.pack(anchor="w", pady=(0, 15))
        
        # Description
        ttk.Label(scrollable_frame, text="Meta Description (for SEO) *", font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(10, 5))
        self.description_var = tk.StringVar()
        description_entry = ttk.Entry(scrollable_frame, textvariable=self.description_var, font=("Segoe UI", 10), width=50)
        description_entry.pack(anchor="w", fill="x", pady=(0, 5))
        description_entry.bind("<KeyRelease>", self.update_desc_count)
        
        self.desc_count_label = ttk.Label(scrollable_frame, text="0/160 characters", font=("Segoe UI", 9), foreground="#666")
        self.desc_count_label.pack(anchor="w", pady=(0, 15))
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def setup_content_tab(self):
        """Setup the content tab"""
        ttk.Label(self.content_frame, text="Post Content (Markdown)", font=("Segoe UI", 11, "bold")).pack(anchor="w", padx=10, pady=(10, 5))
        
        self.content_var = tk.Text(self.content_frame, font=("Courier New", 10), wrap="word", height=25)
        self.content_var.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        
        # Add scrollbar
        scrollbar = ttk.Scrollbar(self.content_frame, command=self.content_var.yview)
        self.content_var.config(yscrollcommand=scrollbar.set)
        
        # Insert template
        template = """# Your Post Title

## Introduction

Start with an engaging introduction that hooks your reader.

## Main Section

Write your main content here. Use:
- Clear headings
- Short paragraphs
- Bullet points for lists
- Code blocks for examples

### Subsection

Break down complex ideas into digestible pieces.

```python
# Example code block
def hello_world():
    print("Hello, World!")
```

## Conclusion

Summarize your key points and call to action."""
        
        self.content_var.insert("1.0", template)
    
    def setup_preview_tab(self):
        """Setup the preview and publish tab"""
        # Preview section
        ttk.Label(self.preview_frame, text="Markdown Preview", font=("Segoe UI", 11, "bold")).pack(anchor="w", padx=10, pady=(10, 5))
        
        self.preview_var = scrolledtext.ScrolledText(
            self.preview_frame,
            font=("Courier New", 9),
            bg="#1e1e1e",
            fg="#d4d4d4",
            height=20,
            state="disabled"
        )
        self.preview_var.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        
        # Button frame
        button_frame = ttk.Frame(self.preview_frame)
        button_frame.pack(fill="x", padx=10, pady=10)
        
        refresh_btn = ttk.Button(button_frame, text="🔄 Refresh Preview", command=self.update_preview)
        refresh_btn.pack(side="left", padx=(0, 5))
        
        self.publish_btn = ttk.Button(button_frame, text="✅ Create Post", command=self.create_post)
        self.publish_btn.pack(side="left", padx=5)
        
        # Auto-refresh preview when switching tabs
        self.preview_frame.bind("<Visibility>", lambda e: self.root.after(100, self.update_preview))
    
    def update_slug(self, event=None):
        """Generate slug from title"""
        title = self.title_var.get()
        slug = re.sub(r'[^\w\s-]', '', title).lower().strip().replace(' ', '-').replace('--', '-')
        self.slug_var.set(slug)
    
    def update_desc_count(self, event=None):
        """Update character count for description"""
        length = len(self.description_var.get())
        self.desc_count_label.config(text=f"{length}/160 characters")
    
    def update_preview(self):
        """Update the markdown preview"""
        try:
            # Validate inputs
            if not self.title_var.get():
                messagebox.showwarning("Validation", "Please enter a post title")
                return
            
            selected_categories = [cat for cat, var in self.categories_vars.items() if var.get()]
            if not selected_categories:
                messagebox.showwarning("Validation", "Please select at least one category")
                return
            
            # Build frontmatter
            title = self.title_var.get()
            date = self.date_var.get()
            time = self.time_var.get()
            categories = [cat.lower().replace(" & ", "-").replace(" ", "-") for cat in selected_categories]
            tags = [tag.strip() for tag in self.tags_var.get().split(",") if tag.strip()]
            description = self.description_var.get()
            image = self.image_var.get()
            read_time = self.read_time_var.get()
            content = self.content_var.get("1.0", "end-1c")
            
            # Build markdown
            markdown = f"""---
layout: post
title: "{title}"
date: {date} {time}
categories: [{', '.join(categories)}]
tags: [{', '.join(tags)}]
author: Martin Li
read_time: {read_time}
description: "{description}"
image: {image}
---

{content}"""
            
            # Update preview
            self.preview_var.config(state="normal")
            self.preview_var.delete("1.0", "end")
            self.preview_var.insert("1.0", markdown)
            self.preview_var.config(state="disabled")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to generate preview: {str(e)}")
    
    def create_post(self):
        """Create the blog post file"""
        try:
            # Validate inputs
            if not self.title_var.get():
                messagebox.showerror("Error", "Please enter a post title")
                return
            
            selected_categories = [cat for cat, var in self.categories_vars.items() if var.get()]
            if not selected_categories:
                messagebox.showerror("Error", "Please select at least one category")
                return
            
            if not self.posts_path or not os.path.exists(self.posts_path):
                messagebox.showerror("Error", "Could not find _posts directory")
                return
            
            # Get the preview content
            preview = self.preview_var.get("1.0", "end-1c")
            if not preview:
                messagebox.showerror("Error", "Please click 'Refresh Preview' first")
                return
            
            # Generate filename
            date = self.date_var.get()
            slug = self.slug_var.get()
            filename = f"{date}-{slug}.markdown"
            filepath = os.path.join(self.posts_path, filename)
            
            # Check if file exists
            if os.path.exists(filepath):
                response = messagebox.askyesno("File Exists", f"File {filename} already exists. Overwrite?")
                if not response:
                    return
            
            # Write file
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(preview)
            
            # Ask if user wants to commit and push
            response = messagebox.askyesno(
                "Success",
                f"Post created: {filename}\n\nDo you want to commit and push to GitHub?"
            )
            
            if response:
                self.commit_and_push(filename)
            else:
                messagebox.showinfo("Success", f"Post saved to:\n{filepath}")
        
        except Exception as e:
            messagebox.showerror("Error", f"Failed to create post: {str(e)}")
    
    def commit_and_push(self, filename):
        """Commit and push the new post to GitHub"""
        try:
            os.chdir(self.repo_path)
            
            # Stage the file
            subprocess.run(["git", "add", f"_posts/{filename}"], check=True, capture_output=True)
            
            # Commit
            commit_message = f"Add: Blog post - {self.title_var.get()}"
            subprocess.run(["git", "commit", "-m", commit_message], check=True, capture_output=True)
            
            # Push
            subprocess.run(["git", "push"], check=True, capture_output=True)
            
            messagebox.showinfo("Success", f"Post published!\n\n📝 File: {filename}\n✅ Committed and pushed to GitHub")
            
        except subprocess.CalledProcessError as e:
            messagebox.showerror("Git Error", f"Failed to push to GitHub:\n{e.stderr.decode()}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to commit/push: {str(e)}")
    
    def load_config(self):
        """Load saved configuration"""
        config_path = os.path.expanduser("~/.blog-creator-config.json")
        if os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    config = json.load(f)
                    if "last_categories" in config:
                        for cat, selected in config["last_categories"].items():
                            if cat in self.categories_vars:
                                self.categories_vars[cat].set(selected)
            except:
                pass
    
    def save_config(self):
        """Save configuration for next use"""
        config = {
            "last_categories": {cat: var.get() for cat, var in self.categories_vars.items()}
        }
        config_path = os.path.expanduser("~/.blog-creator-config.json")
        try:
            with open(config_path, "w") as f:
                json.dump(config, f)
        except:
            pass


if __name__ == "__main__":
    root = tk.Tk()
    app = BlogPostCreator(root)
    root.mainloop()
    app.save_config()
