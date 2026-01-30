#!/usr/bin/env python3
"""
Blog Post Creator - A modern desktop application for creating Jekyll blog posts
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext, font
import json
import os
import subprocess
from datetime import datetime
from pathlib import Path
import re


class ModernFrame(tk.Frame):
    """A custom frame with rounded corners aesthetic"""
    def __init__(self, parent, bg_color="#ffffff", **kwargs):
        super().__init__(parent, bg=bg_color, **kwargs)
        self.bg_color = bg_color


class BlogPostCreator:
    def __init__(self, root):
        self.root = root
        self.root.title("✍️ Blog Post Creator")
        self.root.geometry("1600x900")
        self.root.minsize(1200, 700)
        
        # Modern color palette
        self.colors = {
            "bg_primary": "#0f172a",      # Dark navy
            "bg_secondary": "#1e293b",    # Slightly lighter
            "bg_tertiary": "#334155",     # Medium gray
            "card_bg": "#1e293b",
            "text_primary": "#f1f5f9",    # Light text
            "text_secondary": "#cbd5e1",
            "accent": "#3b82f6",          # Blue
            "accent_hover": "#2563eb",
            "success": "#10b981",
            "border": "#475569"
        }
        
        self.root.configure(bg=self.colors["bg_primary"])
        
        # Detect repo path
        self.repo_path = self.detect_repo_path()
        self.posts_path = os.path.join(self.repo_path, "_posts") if self.repo_path else None
        
        # Categories and their emojis
        self.categories = {
            "career": "💼 Career",
            "ai": "🤖 AI & ML",
            "quant-finance": "📈 Quant Finance",
            "learning": "📚 Learning",
            "public-speaking": "🎤 Speaking",
            "youtube": "🎥 YouTube",
            "nonsense": "🎲 Nonsense"
        }
        
        self.tags_list = []
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
        """Create the modern main UI"""
        # Main container
        main_container = tk.Frame(self.root, bg=self.colors["bg_primary"])
        main_container.pack(fill="both", expand=True)
        
        # Header
        self.create_header(main_container)
        
        # Content area with paned window
        content_frame = tk.Frame(main_container, bg=self.colors["bg_primary"])
        content_frame.pack(fill="both", expand=True, padx=12, pady=12)
        
        # Left panel - Form
        left_panel = tk.Frame(content_frame, bg=self.colors["bg_secondary"], relief="flat")
        left_panel.pack(side="left", fill="both", expand=False, padx=(0, 12), width=450)
        
        # Right panel - Editor and Preview
        right_panel = tk.Frame(content_frame, bg=self.colors["bg_secondary"], relief="flat")
        right_panel.pack(side="right", fill="both", expand=True)
        
        self.create_form_panel(left_panel)
        self.create_editor_preview_panel(right_panel)
    
    def create_header(self, parent):
        """Create the header section"""
        header = tk.Frame(parent, bg=self.colors["bg_secondary"], height=70)
        header.pack(fill="x", padx=12, pady=(12, 0))
        header.pack_propagate(False)
        
        # Title
        title_label = tk.Label(
            header,
            text="✍️  Blog Post Creator",
            font=("Segoe UI", 28, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        )
        title_label.pack(side="left", padx=20, pady=15)
        
        # Subtitle
        subtitle = tk.Label(
            header,
            text=f"Modern & Efficient • {os.path.basename(self.repo_path) if self.repo_path else 'No repo'}",
            font=("Segoe UI", 10),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_secondary"]
        )
        subtitle.pack(side="left", padx=20, pady=15)
    
    def create_form_panel(self, parent):
        """Create the left side form panel"""
        # Scrollable container
        canvas = tk.Canvas(parent, bg=self.colors["bg_secondary"], highlightthickness=0, bd=0)
        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors["bg_secondary"])
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Enable mouse wheel scrolling
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        canvas.bind_all("<MouseWheel>", _on_mousewheel)
        
        # Title
        self.create_form_field(scrollable_frame, "Post Title", "title", required=True)
        
        # Slug
        self.slug_var = tk.StringVar()
        self.create_form_field(scrollable_frame, "URL Slug", "slug", readonly=True, default_var=self.slug_var)
        
        # Date
        self.create_form_field(scrollable_frame, "Publication Date", "date", default=datetime.now().strftime("%Y-%m-%d"))
        
        # Time
        self.create_form_field(scrollable_frame, "Time", "time", default=datetime.now().strftime("%H:%M:%S"))
        
        # Categories
        self.create_categories_selector(scrollable_frame)
        
        # Tags
        self.create_tags_selector(scrollable_frame)
        
        # Read Time
        self.create_form_field(scrollable_frame, "Read Time (min)", "read_time", default="5")
        
        # Image URL
        self.create_form_field(scrollable_frame, "Featured Image URL", "image")
        
        # Description
        self.create_form_field(scrollable_frame, "Meta Description", "description", multiline=True, required=True, height=4)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def create_form_field(self, parent, label, var_name, required=False, readonly=False, multiline=False, default="", default_var=None, height=1):
        """Create a form field with modern styling"""
        container = tk.Frame(parent, bg=self.colors["bg_secondary"])
        container.pack(fill="x", padx=15, pady=(0, 14))
        
        # Label
        label_text = label + (" *" if required else "")
        label_widget = tk.Label(
            container,
            text=label_text,
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        )
        label_widget.pack(anchor="w", pady=(0, 6))
        
        # Input field
        if not hasattr(self, f"{var_name}_var"):
            setattr(self, f"{var_name}_var", tk.StringVar(value=default))
        
        var = getattr(self, f"{var_name}_var")
        
        if multiline:
            entry = tk.Text(
                container,
                font=("Segoe UI", 9),
                bg=self.colors["bg_primary"],
                fg=self.colors["text_primary"],
                insertbackground=self.colors["accent"],
                relief="flat",
                bd=0,
                height=height,
                padx=12,
                pady=10,
                wrap="word"
            )
            entry.pack(fill="both", expand=True)
            entry.insert("1.0", default)
            
            if var_name == "title":
                entry.bind("<KeyRelease>", lambda e: self.update_slug_from_title(entry.get("1.0", "end-1c")))
            if var_name == "description":
                entry.bind("<KeyRelease>", self.update_desc_count)
        else:
            entry = tk.Entry(
                container,
                textvariable=var,
                font=("Segoe UI", 10),
                bg=self.colors["bg_primary"],
                fg=self.colors["text_primary"],
                insertbackground=self.colors["accent"],
                relief="flat",
                bd=0,
                state="readonly" if readonly else "normal"
            )
            entry.pack(fill="x")
            entry.config(highlightthickness=1, highlightbackground=self.colors["border"], highlightcolor=self.colors["accent"])
            
            if var_name == "title":
                entry.config(state="normal")
                entry.bind("<KeyRelease>", lambda e: self.update_slug_from_title(var.get()))
    
    def update_slug_from_title(self, title):
        """Generate slug from title"""
        slug = re.sub(r'[^\w\s-]', '', title).lower().strip().replace(' ', '-').replace('--', '-')
        self.slug_var.set(slug)
        self.update_preview()
    
    def update_desc_count(self, event=None):
        """Update character count for description"""
        self.update_preview()
    
    def create_categories_selector(self, parent):
        """Create category checkboxes"""
        container = tk.Frame(parent, bg=self.colors["bg_secondary"])
        container.pack(fill="x", padx=15, pady=(0, 14))
        
        label = tk.Label(
            container,
            text="Categories *",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        )
        label.pack(anchor="w", pady=(0, 8))
        
        self.category_vars = {}
        grid = tk.Frame(container, bg=self.colors["bg_secondary"])
        grid.pack(fill="x")
        
        for idx, (key, label_text) in enumerate(self.categories.items()):
            var = tk.BooleanVar()
            self.category_vars[key] = var
            
            cb = tk.Checkbutton(
                grid,
                text=label_text,
                variable=var,
                font=("Segoe UI", 9),
                bg=self.colors["bg_secondary"],
                fg=self.colors["text_primary"],
                selectcolor=self.colors["bg_secondary"],
                activebackground=self.colors["bg_secondary"],
                activeforeground=self.colors["accent"],
                highlightthickness=0,
                command=self.update_preview
            )
            cb.grid(row=idx // 2, column=idx % 2, sticky="w", padx=(0, 15), pady=4)
    
    def create_tags_selector(self, parent):
        """Create tags input with tag display"""
        container = tk.Frame(parent, bg=self.colors["bg_secondary"])
        container.pack(fill="x", padx=15, pady=(0, 14))
        
        label = tk.Label(
            container,
            text="Tags",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        )
        label.pack(anchor="w", pady=(0, 8))
        
        # Tags display area
        self.tags_display = tk.Frame(
            container,
            bg=self.colors["bg_primary"],
            relief="flat",
            bd=0
        )
        self.tags_display.pack(fill="x", pady=(0, 8))
        self.tags_display.config(highlightthickness=1, highlightbackground=self.colors["border"])
        
        # Tag input
        self.tag_input_var = tk.StringVar()
        tag_input = tk.Entry(
            container,
            textvariable=self.tag_input_var,
            font=("Segoe UI", 9),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"],
            insertbackground=self.colors["accent"],
            relief="flat",
            bd=0
        )
        tag_input.pack(fill="x")
        tag_input.config(highlightthickness=1, highlightbackground=self.colors["border"], highlightcolor=self.colors["accent"])
        tag_input.bind("<Return>", self.add_tag)
        tag_input.bind("<KeyRelease>", lambda e: self.update_preview())
    
    def add_tag(self, event=None):
        """Add a tag to the list"""
        tag = self.tag_input_var.get().strip().lower()
        if tag and tag not in self.tags_list:
            self.tags_list.append(tag)
            self.tag_input_var.set("")
            self.render_tags()
            self.update_preview()
    
    def render_tags(self):
        """Render tags display"""
        for widget in self.tags_display.winfo_children():
            widget.destroy()
        
        if not self.tags_list:
            return
        
        for tag in self.tags_list:
            tag_frame = tk.Frame(self.tags_display, bg=self.colors["accent"])
            tag_frame.pack(side="left", padx=4, pady=6)
            
            tag_label = tk.Label(
                tag_frame,
                text=tag,
                bg=self.colors["accent"],
                fg="white",
                font=("Segoe UI", 9),
                padx=8,
                pady=4
            )
            tag_label.pack(side="left")
            
            def remove_tag(t=tag):
                self.tags_list.remove(t)
                self.render_tags()
                self.update_preview()
            
            remove_btn = tk.Label(
                tag_frame,
                text="✕",
                bg=self.colors["accent"],
                fg="white",
                font=("Segoe UI", 8),
                padx=6,
                cursor="hand2"
            )
            remove_btn.pack(side="left", padx=(2, 0))
            remove_btn.bind("<Button-1>", lambda e: remove_tag())
    
    def create_editor_preview_panel(self, parent):
        """Create the right side with editor and preview"""
        # Notebook style tabs using frames
        tab_container = tk.Frame(parent, bg=self.colors["bg_secondary"])
        tab_container.pack(fill="x", padx=15, pady=(15, 10))
        
        # Tab buttons
        self.tab_editor_btn = tk.Label(
            tab_container,
            text="📝 Content",
            font=("Segoe UI", 11, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["accent"],
            padx=15,
            pady=8,
            cursor="hand2"
        )
        self.tab_editor_btn.pack(side="left", padx=(0, 2))
        self.tab_editor_btn.bind("<Button-1>", lambda e: self.switch_tab("editor"))
        
        self.tab_preview_btn = tk.Label(
            tab_container,
            text="👁️ Preview",
            font=("Segoe UI", 11, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_secondary"],
            padx=15,
            pady=8,
            cursor="hand2"
        )
        self.tab_preview_btn.pack(side="left", padx=2)
        self.tab_preview_btn.bind("<Button-1>", lambda e: self.switch_tab("preview"))
        
        # Content area
        self.editor_frame = tk.Frame(parent, bg=self.colors["bg_primary"])
        self.editor_frame.pack(fill="both", expand=True)
        
        self.preview_frame = tk.Frame(parent, bg=self.colors["bg_primary"])
        
        # Editor
        self.content_var = tk.Text(
            self.editor_frame,
            font=("Courier New", 10),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"],
            insertbackground=self.colors["accent"],
            relief="flat",
            bd=0,
            padx=12,
            pady=12,
            wrap="word"
        )
        self.content_var.pack(fill="both", expand=True)
        
        # Template
        template = """# Your Post Title

## Introduction

Start with an engaging introduction that hooks your reader.

## Main Section

Write your main content here using:
- Clear headings
- Short paragraphs
- Bullet points for lists
- Code examples when relevant

```python
# Example code block
def hello_world():
    print("Hello, World!")
```

## Conclusion

Summarize your key points and call to action."""
        
        self.content_var.insert("1.0", template)
        self.content_var.bind("<KeyRelease>", lambda e: self.update_preview())
        
        # Preview
        self.preview_text = scrolledtext.ScrolledText(
            self.preview_frame,
            font=("Courier New", 9),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"],
            insertbackground=self.colors["accent"],
            relief="flat",
            bd=0,
            padx=12,
            pady=12,
            state="disabled"
        )
        self.preview_text.pack(fill="both", expand=True)
        
        # Bottom action bar
        action_bar = tk.Frame(parent, bg=self.colors["bg_secondary"])
        action_bar.pack(fill="x", padx=15, pady=12)
        
        refresh_btn = tk.Label(
            action_bar,
            text="🔄 Refresh Preview",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["accent"],
            fg="white",
            padx=16,
            pady=10,
            cursor="hand2",
            relief="flat"
        )
        refresh_btn.pack(side="left", padx=(0, 10))
        refresh_btn.bind("<Button-1>", lambda e: self.update_preview())
        
        self.publish_btn = tk.Label(
            action_bar,
            text="✅ Create & Publish",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["success"],
            fg="white",
            padx=16,
            pady=10,
            cursor="hand2"
        )
        self.publish_btn.pack(side="left")
        self.publish_btn.bind("<Button-1>", lambda e: self.create_post())
        
        self.current_tab = "editor"
    
    def switch_tab(self, tab):
        """Switch between editor and preview tabs"""
        self.current_tab = tab
        
        if tab == "editor":
            self.tab_editor_btn.config(fg=self.colors["accent"])
            self.tab_preview_btn.config(fg=self.colors["text_secondary"])
            self.preview_frame.pack_forget()
            self.editor_frame.pack(fill="both", expand=True)
        else:
            self.tab_editor_btn.config(fg=self.colors["text_secondary"])
            self.tab_preview_btn.config(fg=self.colors["accent"])
            self.editor_frame.pack_forget()
            self.preview_frame.pack(fill="both", expand=True)
            self.update_preview()
    
    def update_preview(self):
        """Update the markdown preview"""
        try:
            title = self.title_var.get()
            if not title:
                return
            
            date = self.date_var.get()
            time = self.time_var.get()
            categories = [key for key, var in self.category_vars.items() if var.get()]
            description = self.description_var.get("1.0", "end-1c")
            image = self.image_var.get()
            read_time = self.read_time_var.get()
            content = self.content_var.get("1.0", "end-1c")
            
            markdown = f"""---
layout: post
title: "{title}"
date: {date} {time}
categories: [{', '.join(categories)}]
tags: [{', '.join(self.tags_list)}]
author: Martin Li
read_time: {read_time}
description: "{description}"
image: {image}
---

{content}"""
            
            self.preview_text.config(state="normal")
            self.preview_text.delete("1.0", "end")
            self.preview_text.insert("1.0", markdown)
            self.preview_text.config(state="disabled")
            
        except Exception as e:
            pass
    
    def create_post(self):
        """Create the blog post file"""
        try:
            if not self.title_var.get():
                messagebox.showerror("Error", "Please enter a post title")
                return
            
            categories = [key for key, var in self.category_vars.items() if var.get()]
            if not categories:
                messagebox.showerror("Error", "Please select at least one category")
                return
            
            if not self.posts_path or not os.path.exists(self.posts_path):
                messagebox.showerror("Error", "Could not find _posts directory")
                return
            
            preview = self.preview_text.get("1.0", "end-1c")
            if not preview:
                messagebox.showerror("Error", "Please fill in all required fields")
                return
            
            date = self.date_var.get()
            slug = self.slug_var.get()
            filename = f"{date}-{slug}.markdown"
            filepath = os.path.join(self.posts_path, filename)
            
            if os.path.exists(filepath):
                response = messagebox.askyesno("File Exists", f"File {filename} already exists. Overwrite?")
                if not response:
                    return
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(preview)
            
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
            
            subprocess.run(["git", "add", f"_posts/{filename}"], check=True, capture_output=True)
            commit_message = f"Add: Blog post - {self.title_var.get()}"
            subprocess.run(["git", "commit", "-m", commit_message], check=True, capture_output=True)
            subprocess.run(["git", "push"], check=True, capture_output=True)
            
            messagebox.showinfo("Success", f"✅ Published!\n\n📝 {filename}\n🚀 Pushed to GitHub")
            
        except subprocess.CalledProcessError as e:
            messagebox.showerror("Git Error", f"Failed to push:\n{e.stderr.decode()}")
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
                            if cat in self.category_vars:
                                self.category_vars[cat].set(selected)
            except:
                pass
    
    def save_config(self):
        """Save configuration for next use"""
        config = {
            "last_categories": {cat: var.get() for cat, var in self.category_vars.items()}
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
    
    # Configure window
    root.update_idletasks()
    
    # Cleanup on close
    def on_closing():
        app.save_config()
        root.destroy()
    
    root.protocol("WM_DELETE_WINDOW", on_closing)
    root.mainloop()
