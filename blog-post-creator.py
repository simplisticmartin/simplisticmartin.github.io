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
import webbrowser
import tempfile

try:
    import markdown
    MARKDOWN_AVAILABLE = True
except ImportError:
    MARKDOWN_AVAILABLE = False


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
        
        # Modern color palette (research-based for accessibility)
        self.colors = {
            "bg_primary": "#0f172a",      # Dark navy
            "bg_secondary": "#1e293b",    # Slightly lighter
            "bg_tertiary": "#334155",     # Medium gray
            "card_bg": "#1e293b",
            "text_primary": "#f1f5f9",    # Light text (high contrast)
            "text_secondary": "#94a3b8",  # Medium gray text
            "text_hint": "#64748b",       # Dimmer text (hints)
            "accent": "#3b82f6",          # Blue accent
            "accent_hover": "#2563eb",    # Darker blue (hover)
            "accent_light": "#60a5fa",    # Lighter blue
            "success": "#10b981",         # Green (positive)
            "success_hover": "#059669",   # Darker green
            "warning": "#f59e0b",         # Amber (warnings)
            "error": "#ef4444",           # Red (errors)
            "border": "#334155",          # Border color
            "border_light": "#475569",    # Light border
            "focus": "#60a5fa"            # Focus ring
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
        self.char_count = tk.IntVar(value=0)
        self.word_count = tk.IntVar(value=0)
        self.autosave_status = tk.StringVar(value="")
        self.current_file = None  # Track currently loaded file for editing
        self.recent_files = []  # Track recent files
        self.font_size = tk.IntVar(value=11)
        
        # Post templates
        self.templates = {
            "General": """# Your Post Title

## Introduction

Start with an engaging introduction that hooks your reader.

## Main Section

Write your main content here.

## Conclusion

Summarize your key points.""",
            "AI & ML": """# AI/ML: [Topic]

## Overview

Brief introduction to the AI/ML concept or technique.

## Technical Details

### The Problem
- What problem does this solve?
- Why is it important?

### The Solution
- How does the approach work?
- Key algorithms or techniques

```python
# Code example
import numpy as np

def example():
    pass
```

## Results & Insights

What did you learn? What worked well?

## Resources
- Link 1
- Link 2""",
            "Career": """# Career: [Topic]

## Context

Set the scene - what's the career situation or lesson?

## The Journey

### Challenge
What obstacles did you face?

### Actions Taken
What steps did you take?

### Outcome
What was the result?

## Key Takeaways

1. First lesson
2. Second lesson
3. Third lesson

## Advice for Others

What would you tell someone in a similar situation?""",
            "Quant Finance": """# Quant Finance: [Topic]

## Market Context

What's the financial concept or strategy?

## Mathematical Framework

### Model Description
Describe the quantitative model.

### Key Equations

$$
E[R] = R_f + \\beta(E[R_m] - R_f)
$$

### Implementation

```python
import pandas as pd
import numpy as np

# Your quant code here
```

## Backtesting Results

Show performance metrics and analysis.

## Risk Considerations

What are the limitations and risks?""",
            "Tutorial": """# How to [Do Something]

## What You'll Learn

- Key skill 1
- Key skill 2
- Key skill 3

## Prerequisites

What do readers need to know first?

## Step-by-Step Guide

### Step 1: [First Step]

Detailed explanation.

```bash
# Example command
```

### Step 2: [Second Step]

Detailed explanation.

### Step 3: [Third Step]

Detailed explanation.

## Troubleshooting

Common issues and solutions.

## Next Steps

What to learn next?"""
        }
        
        self.setup_ui()
        self.load_config()
        
        # Auto-update preview
        self.root.after(500, self.auto_update_preview)
        
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
        
        # Left panel - Form (fixed width of 400px)
        left_panel = tk.Frame(content_frame, bg=self.colors["bg_secondary"], relief="flat", width=400)
        left_panel.pack(side="left", fill="y", padx=(0, 12))
        left_panel.pack_propagate(False)
        
        # Right panel - Editor and Preview
        right_panel = tk.Frame(content_frame, bg=self.colors["bg_secondary"], relief="flat")
        right_panel.pack(side="right", fill="both", expand=True)
        
        self.create_form_panel(left_panel)
        self.create_editor_preview_panel(right_panel)
    
    def create_header(self, parent):
        """Create the header with improved visual hierarchy"""
        header = tk.Frame(parent, bg=self.colors["bg_secondary"], height=85)
        header.pack(fill="x", padx=16, pady=(16, 0))
        header.pack_propagate(False)
        
        # Left side - title and status
        left_header = tk.Frame(header, bg=self.colors["bg_secondary"])
        left_header.pack(side="left", fill="both", expand=True, padx=20, pady=15)
        
        title = tk.Label(
            left_header,
            text="✍️ Blog Post Creator",
            font=("Segoe UI", 32, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        )
        title.pack(anchor="w")
        
        subtitle_frame = tk.Frame(left_header, bg=self.colors["bg_secondary"])
        subtitle_frame.pack(anchor="w", pady=(8, 0))
        
        tk.Label(
            subtitle_frame,
            text="📂",
            font=("Segoe UI", 10),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_secondary"]
        ).pack(side="left", padx=(0, 6))
        
        tk.Label(
            subtitle_frame,
            text=os.path.basename(self.repo_path) if self.repo_path else "No repository",
            font=("Segoe UI", 10),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_secondary"]
        ).pack(side="left")
        
        # Right side - tools and status
        right_header = tk.Frame(header, bg=self.colors["bg_secondary"])
        right_header.pack(side="right", padx=20, pady=15)
        
        # Tools row
        tools_row = tk.Frame(right_header, bg=self.colors["bg_secondary"])
        tools_row.pack(pady=(0, 8))
        
        # Template selector
        tk.Label(
            tools_row,
            text="Template:",
            font=("Segoe UI", 9),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_secondary"]
        ).pack(side="left", padx=(0, 6))
        
        self.template_var = tk.StringVar(value="General")
        template_dropdown = ttk.Combobox(
            tools_row,
            textvariable=self.template_var,
            values=list(self.templates.keys()),
            state="readonly",
            width=12,
            font=("Segoe UI", 9)
        )
        template_dropdown.pack(side="left", padx=(0, 10))
        template_dropdown.bind("<<ComboboxSelected>>", lambda e: self.load_template())
        
        # Font size controls
        tk.Label(
            tools_row,
            text="📝",
            font=("Segoe UI", 11),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_secondary"],
            cursor="hand2"
        ).pack(side="left", padx=2)
        
        font_down = tk.Label(
            tools_row,
            text="−",
            font=("Segoe UI", 12, "bold"),
            bg=self.colors["bg_tertiary"],
            fg=self.colors["text_primary"],
            padx=8,
            pady=2,
            cursor="hand2"
        )
        font_down.pack(side="left", padx=2)
        font_down.bind("<Button-1>", lambda e: self.change_font_size(-1))
        
        font_up = tk.Label(
            tools_row,
            text="+",
            font=("Segoe UI", 12, "bold"),
            bg=self.colors["bg_tertiary"],
            fg=self.colors["text_primary"],
            padx=8,
            pady=2,
            cursor="hand2"
        )
        font_up.pack(side="left", padx=2)
        font_up.bind("<Button-1>", lambda e: self.change_font_size(1))
        
        # Word count indicator
        self.word_count_label = tk.Label(
            right_header,
            text="0 words",
            font=("Segoe UI", 11, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["accent_light"]
        )
        self.word_count_label.pack(pady=(0, 4))
        
        status_label = tk.Label(
            right_header,
            textvariable=self.autosave_status,
            font=("Segoe UI", 9),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        )
        status_label.pack()
    
    def create_form_panel(self, parent):
        """Create the left form panel with improved UX"""
        # Header
        header = tk.Frame(parent, bg=self.colors["bg_secondary"])
        header.pack(fill="x", padx=18, pady=(18, 12))
        
        tk.Label(
            header,
            text="Post Details",
            font=("Segoe UI", 14, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w")
        
        tk.Label(
            header,
            text="Fill in the essential information",
            font=("Segoe UI", 9),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(4, 0))
        
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
        
        # Title with auto-slug
        self.create_text_field(scrollable_frame, "Post Title", "title", required=True, placeholder="Your engaging post title")
        
        # Slug (auto-generated)
        self.slug_var = tk.StringVar()
        self.create_text_field(scrollable_frame, "URL Slug", "slug", readonly=True, hint="Auto-generated from title", default_var=self.slug_var)
        
        # Date
        self.create_form_field(scrollable_frame, "Publication Date", "date", default=datetime.now().strftime("%Y-%m-%d"))
        
        # Time
        self.create_form_field(scrollable_frame, "Time", "time", default=datetime.now().strftime("%H:%M:%S"))
        
        # Categories
        self.create_categories_selector(scrollable_frame)
        
        # Tags
        self.create_tags_selector(scrollable_frame)
        
        # Read Time
        self.create_text_field(scrollable_frame, "Read Time", "read_time", default="5", hint="Estimated minutes", width=8)
        
        # Image URL
        self.create_text_field(scrollable_frame, "Featured Image URL", "image", placeholder="/assets/images/post-image.jpg")
        
        # Description with character counter
        self.create_description_field(scrollable_frame)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def create_text_field(self, parent, label, var_name, required=False, readonly=False, placeholder="", hint="", default="", default_var=None, width=None):
        """Create an improved text input field with better UX"""
        container = tk.Frame(parent, bg=self.colors["bg_secondary"])
        container.pack(fill="x", padx=18, pady=(0, 16))
        
        # Label with optional hint
        label_frame = tk.Frame(container, bg=self.colors["bg_secondary"])
        label_frame.pack(fill="x", pady=(0, 6))
        
        label_text = label + (" *" if required else "")
        tk.Label(
            label_frame,
            text=label_text,
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w")
        
        if hint:
            tk.Label(
                label_frame,
                text=hint,
                font=("Segoe UI", 8),
                bg=self.colors["bg_secondary"],
                fg=self.colors["text_hint"]
            ).pack(anchor="w", pady=(2, 0))
        
        # Input field
        if default_var:
            var = default_var
        else:
            if not hasattr(self, f"{var_name}_var"):
                setattr(self, f"{var_name}_var", tk.StringVar(value=default))
            var = getattr(self, f"{var_name}_var")
        
        entry = tk.Entry(
            container,
            textvariable=var,
            font=("Segoe UI", 10),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"],
            insertbackground=self.colors["focus"],
            relief="flat",
            bd=0,
            state="readonly" if readonly else "normal"
        )
        
        if width:
            entry.config(width=width)
        
        entry.pack(fill="x", ipady=10)
        entry.config(highlightthickness=1, highlightbackground=self.colors["border"], highlightcolor=self.colors["focus"])
        
        # Bindings for auto-updates
        if var_name == "title":
            entry.config(state="normal")
            entry.bind("<KeyRelease>", lambda e: self.update_slug_from_title(var.get()))
            entry.bind("<KeyRelease>", lambda e: self.autosave_status.set("✏️ Editing..."), add=True)
        
        return var
    
    def create_description_field(self, parent):
        """Create description field with visual character counter"""
        container = tk.Frame(parent, bg=self.colors["bg_secondary"])
        container.pack(fill="x", padx=18, pady=(0, 16))
        
        # Label with character counter
        label_frame = tk.Frame(container, bg=self.colors["bg_secondary"])
        label_frame.pack(fill="x", pady=(0, 6))
        
        tk.Label(
            label_frame,
            text="Meta Description *",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w", side="left")
        
        self.desc_counter = tk.Label(
            label_frame,
            text="0/160",
            font=("Segoe UI", 9),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        )
        self.desc_counter.pack(anchor="e", side="right")
        
        tk.Label(
            container,
            text="For search results preview (keep under 160 characters)",
            font=("Segoe UI", 8),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(0, 6))
        
        # Description entry
        self.description_var = tk.StringVar()
        self.description_var.trace("w", lambda *args: self.update_desc_count())
        
        desc_entry = tk.Entry(
            container,
            textvariable=self.description_var,
            font=("Segoe UI", 10),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"],
            insertbackground=self.colors["focus"],
            relief="flat",
            bd=0
        )
        desc_entry.pack(fill="x", ipady=10)
        desc_entry.config(highlightthickness=1, highlightbackground=self.colors["border"], highlightcolor=self.colors["focus"])
    
    def update_desc_count(self):
        """Update description character count with visual feedback"""
        length = len(self.description_var.get())
        
        if length > 160:
            color = self.colors["error"]
        elif length > 140:
            color = self.colors["warning"]
        else:
            color = self.colors["text_hint"]
        
        self.desc_counter.config(text=f"{length}/160", fg=color)
        self.auto_update_preview()
    
    def auto_update_preview(self):
        """Auto-update preview with status feedback"""
        self.update_preview()
        self.root.after(1000, lambda: self.autosave_status.set(""))
    
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
        """Create the right side with split editor and live preview"""
        # Header with title
        header = tk.Frame(parent, bg=self.colors["bg_secondary"])
        header.pack(fill="x", padx=15, pady=(15, 0))
        
        tk.Label(
            header,
            text="📝 Content Editor",
            font=("Segoe UI", 11, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["accent"]
        ).pack(side="left", padx=5, pady=8)
        
        tk.Label(
            header,
            text="•",
            font=("Segoe UI", 11),
            bg=self.colors["bg_secondary"],
            fg=self.colors["border"]
        ).pack(side="left", padx=8)
        
        tk.Label(
            header,
            text="👁️ Live Preview",
            font=("Segoe UI", 11, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["accent_light"]
        ).pack(side="left", padx=5, pady=8)
        
        # Split container for editor and preview
        split_container = tk.PanedWindow(
            parent,
            orient=tk.HORIZONTAL,
            bg=self.colors["bg_primary"],
            sashwidth=8,
            sashrelief=tk.FLAT,
            bd=0
        )
        split_container.pack(fill="both", expand=True, padx=0, pady=0)
        
        # Left side - Editor
        self.editor_frame = tk.Frame(split_container, bg=self.colors["bg_primary"])
        split_container.add(self.editor_frame, minsize=400)
        
        # Markdown toolbar
        self.create_markdown_toolbar(self.editor_frame)
        
        # Right side - Preview
        self.preview_frame = tk.Frame(split_container, bg=self.colors["bg_primary"])
        split_container.add(self.preview_frame, minsize=400)
        
        # Editor
        self.content_var = tk.Text(
            self.editor_frame,
            font=("Consolas", 11),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"],
            insertbackground=self.colors["focus"],
            relief="flat",
            bd=0,
            padx=12,
            pady=12,
            wrap="word",
            undo=True,
            maxundo=-1
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
        self.content_var.bind("<KeyRelease>", lambda e: self.auto_update_preview())
        self.content_var.bind("<KeyRelease>", lambda e: self.update_word_count(), add=True)
        
        # Add keyboard shortcuts
        self.content_var.bind("<Control-b>", lambda e: self.wrap_selection("**", "**"))
        self.content_var.bind("<Control-i>", lambda e: self.wrap_selection("*", "*"))
        self.content_var.bind("<Control-s>", lambda e: self.save_draft())
        self.content_var.bind("<Control-f>", lambda e: self.show_find_replace())
        self.content_var.bind("<Control-k>", lambda e: self.insert_markdown("link"))
        
        # Preview
        self.preview_text = scrolledtext.ScrolledText(
            self.preview_frame,
            font=("Segoe UI", 10),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"],
            relief="flat",
            bd=0,
            padx=20,
            pady=20,
            wrap="word"
        )
        self.preview_text.pack(fill="both", expand=True)
        self.preview_text.config(state="disabled")
        
        # Configure text tags for markdown styling
        self.preview_text.tag_config("yaml", foreground=self.colors["text_hint"], font=("Consolas", 9, "italic"))
        self.preview_text.tag_config("h1", foreground=self.colors["accent"], font=("Segoe UI", 16, "bold"), spacing1=10, spacing3=5)
        self.preview_text.tag_config("h2", foreground=self.colors["accent_light"], font=("Segoe UI", 14, "bold"), spacing1=8, spacing3=4)
        self.preview_text.tag_config("h3", foreground=self.colors["accent_light"], font=("Segoe UI", 12, "bold"), spacing1=6, spacing3=3)
        self.preview_text.tag_config("bold", font=("Segoe UI", 10, "bold"))
        self.preview_text.tag_config("italic", font=("Segoe UI", 10, "italic"))
        self.preview_text.tag_config("code", foreground=self.colors["warning"], background=self.colors["bg_tertiary"], font=("Consolas", 9))
        self.preview_text.tag_config("link", foreground=self.colors["accent"], underline=True)
        self.preview_text.tag_config("quote", foreground=self.colors["text_secondary"], font=("Segoe UI", 10, "italic"), lmargin1=20, lmargin2=20)
        
        # Bottom action bar
        action_bar = tk.Frame(parent, bg=self.colors["bg_secondary"])
        action_bar.pack(fill="x", padx=15, pady=12)
        
        # Load Post button
        load_btn = tk.Label(
            action_bar,
            text="📂 Load Post",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_tertiary"],
            fg=self.colors["text_primary"],
            padx=16,
            pady=10,
            cursor="hand2"
        )
        load_btn.pack(side="left", padx=(0, 10))
        load_btn.bind("<Button-1>", lambda e: self.load_post())
        load_btn.bind("<Enter>", lambda e: load_btn.config(bg=self.colors["border_light"]))
        load_btn.bind("<Leave>", lambda e: load_btn.config(bg=self.colors["bg_tertiary"]))
        
        # Save Draft button
        draft_btn = tk.Label(
            action_bar,
            text="💾 Save Draft",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_tertiary"],
            fg=self.colors["text_primary"],
            padx=16,
            pady=10,
            cursor="hand2"
        )
        draft_btn.pack(side="left", padx=(0, 10))
        draft_btn.bind("<Button-1>", lambda e: self.save_draft())
        draft_btn.bind("<Enter>", lambda e: draft_btn.config(bg=self.colors["border_light"]))
        draft_btn.bind("<Leave>", lambda e: draft_btn.config(bg=self.colors["bg_tertiary"]))
        
        # View Rendered button
        if MARKDOWN_AVAILABLE:
            render_btn = tk.Label(
                action_bar,
                text="🌐 View Rendered",
                font=("Segoe UI", 10, "bold"),
                bg=self.colors["accent_light"],
                fg="white",
                padx=16,
                pady=10,
                cursor="hand2"
            )
            render_btn.pack(side="left", padx=(0, 10))
            render_btn.bind("<Button-1>", lambda e: self.view_rendered_preview())
            render_btn.bind("<Enter>", lambda e: render_btn.config(bg=self.colors["accent"]))
            render_btn.bind("<Leave>", lambda e: render_btn.config(bg=self.colors["accent_light"]))
        
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
        self.publish_btn.bind("<Enter>", lambda e: self.publish_btn.config(bg=self.colors["success_hover"]))
        self.publish_btn.bind("<Leave>", lambda e: self.publish_btn.config(bg=self.colors["success"]))
    
    def create_markdown_toolbar(self, parent):
        """Create a markdown formatting toolbar"""
        toolbar = tk.Frame(parent, bg=self.colors["bg_secondary"], height=45)
        toolbar.pack(fill="x", padx=0, pady=(0, 8))
        toolbar.pack_propagate(False)
        
        # Buttons with markdown formatting
        buttons = [
            ("**B**", "Bold", lambda: self.wrap_selection("**", "**")),
            ("*I*", "Italic", lambda: self.wrap_selection("*", "*")),
            ("~~S~~", "Strikethrough", lambda: self.wrap_selection("~~", "~~")),
            ("|", "—", None),  # Separator
            ("H1", "Heading 1", lambda: self.insert_prefix("# ")),
            ("H2", "Heading 2", lambda: self.insert_prefix("## ")),
            ("H3", "Heading 3", lambda: self.insert_prefix("### ")),
            ("|", "—", None),  # Separator
            ("• List", "Bullet List", lambda: self.insert_prefix("- ")),
            ("1. List", "Numbered List", lambda: self.insert_prefix("1. ")),
            ("|", "—", None),  # Separator
            ("[ ] Code", "Code Block", lambda: self.insert_code_block()),
            ("[Link]", "Link", lambda: self.insert_link()),
            ("[Img]", "Image", lambda: self.insert_image()),
            ("|", "—", None),  # Separator
            ("Quote", "Blockquote", lambda: self.insert_prefix("> ")),
            ("|", "—", None),  # Separator
            ("🔍", "Find & Replace", lambda: self.show_find_replace()),
            ("📊", "Statistics", lambda: self.show_stats()),
        ]
        
        for label, tooltip, command in buttons:
            if command is None:
                # Separator
                sep = tk.Label(toolbar, text=label, bg=self.colors["bg_secondary"], fg=self.colors["border"], padx=2)
                sep.pack(side="left", padx=2)
            else:
                btn = tk.Label(
                    toolbar,
                    text=label,
                    font=("Segoe UI", 9, "bold"),
                    bg=self.colors["accent"],
                    fg="white",
                    padx=10,
                    pady=6,
                    cursor="hand2",
                    relief="flat"
                )
                btn.pack(side="left", padx=3, pady=6)
                btn.bind("<Button-1>", lambda e, cmd=command: cmd())
                # Add hover effect
                btn.bind("<Enter>", lambda e, b=btn: b.config(bg=self.colors["accent_hover"]))
                btn.bind("<Leave>", lambda e, b=btn: b.config(bg=self.colors["accent"]))
    
    def wrap_selection(self, prefix, suffix):
        """Wrap selected text with prefix and suffix"""
        try:
            if self.content_var.tag_ranges("sel"):
                start = self.content_var.index("sel.first")
                end = self.content_var.index("sel.last")
                selected = self.content_var.get(start, end)
                self.content_var.delete(start, end)
                self.content_var.insert(start, f"{prefix}{selected}{suffix}")
                self.update_preview()
        except:
            pass
    
    def insert_prefix(self, prefix):
        """Insert prefix at the beginning of current line"""
        try:
            current_line = self.content_var.index("insert linestart")
            self.content_var.insert(current_line, prefix)
            self.update_preview()
        except:
            pass
    
    def insert_code_block(self):
        """Insert a code block"""
        try:
            pos = self.content_var.index("insert")
            self.content_var.insert(pos, "\n```\n\n```\n")
            self.update_preview()
        except:
            pass
    
    def insert_link(self):
        """Insert a link template"""
        try:
            if self.content_var.tag_ranges("sel"):
                start = self.content_var.index("sel.first")
                end = self.content_var.index("sel.last")
                selected = self.content_var.get(start, end)
                self.content_var.delete(start, end)
                self.content_var.insert(start, f"[{selected}](url)")
            else:
                pos = self.content_var.index("insert")
                self.content_var.insert(pos, "[link text](url)")
            self.update_preview()
        except:
            pass
    
    def insert_image(self):
        """Insert an image template"""
        try:
            pos = self.content_var.index("insert")
            self.content_var.insert(pos, "![alt text](image-url)")
            self.update_preview()
        except:
            pass
    
    def update_preview(self):
        """Update the markdown preview with styled rendering"""
        try:
            title = self.title_var.get()
            if not title:
                # Show placeholder if no title
                self.preview_text.config(state="normal")
                self.preview_text.delete("1.0", "end")
                self.preview_text.insert("1.0", "Enter a title to see preview...", "yaml")
                self.preview_text.config(state="disabled")
                return
            
            date = self.date_var.get()
            time = self.time_var.get()
            categories = [key for key, var in self.category_vars.items() if var.get()]
            description = self.description_var.get()
            image = self.image_var.get()
            read_time = self.read_time_var.get()
            content = self.content_var.get("1.0", "end-1c")
            
            # Build YAML frontmatter
            yaml_section = f"""---
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

"""
            
            # Clear preview
            self.preview_text.config(state="normal")
            self.preview_text.delete("1.0", "end")
            
            # Insert YAML with styling
            self.preview_text.insert("end", yaml_section, "yaml")
            
            # Render markdown content with basic styling
            self.render_markdown(content)
            
            self.preview_text.config(state="disabled")
            
        except Exception as e:
            pass
    
    def render_markdown(self, text):
        """Apply basic markdown rendering with text tags"""
        lines = text.split('\n')
        
        for line in lines:
            # Headers
            if line.startswith('# '):
                self.preview_text.insert("end", line[2:] + '\n', "h1")
            elif line.startswith('## '):
                self.preview_text.insert("end", line[3:] + '\n', "h2")
            elif line.startswith('### '):
                self.preview_text.insert("end", line[4:] + '\n', "h3")
            # Block quotes
            elif line.startswith('> '):
                self.preview_text.insert("end", line[2:] + '\n', "quote")
            # Code blocks
            elif line.startswith('```'):
                self.preview_text.insert("end", line + '\n', "code")
            # Lists
            elif line.startswith('- ') or line.startswith('* ') or re.match(r'^\d+\. ', line):
                self.preview_text.insert("end", line + '\n')
            # Regular text with inline formatting
            else:
                self.render_inline_markdown(line + '\n')
    
    def render_inline_markdown(self, text):
        """Render inline markdown (bold, italic, code, links)"""
        pos = 0
        
        # Pattern: **bold**, *italic*, `code`, [link](url)
        pattern = r'(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))'
        parts = re.split(pattern, text)
        
        for part in parts:
            if not part:
                continue
            
            # Bold
            if part.startswith('**') and part.endswith('**'):
                self.preview_text.insert("end", part[2:-2], "bold")
            # Italic
            elif part.startswith('*') and part.endswith('*') and not part.startswith('**'):
                self.preview_text.insert("end", part[1:-1], "italic")
            # Inline code
            elif part.startswith('`') and part.endswith('`'):
                self.preview_text.insert("end", part[1:-1], "code")
            # Links
            elif part.startswith('[') and '](' in part:
                match = re.match(r'\[(.*?)\]\((.*?)\)', part)
                if match:
                    self.preview_text.insert("end", match.group(1), "link")
            # Plain text
            else:
                self.preview_text.insert("end", part)
    
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
            
            # Update status and clear form
            self.autosave_status.set("✅ Post created successfully!")
            self.root.after(3000, lambda: self.autosave_status.set(""))
        
        except Exception as e:
            messagebox.showerror("Error", f"Failed to create post: {str(e)}")
            self.autosave_status.set("❌ Error creating post")
    
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
    
    def update_word_count(self):
        """Update word count and auto-calculate reading time"""
        try:
            content = self.content_var.get("1.0", "end-1c")
            words = len(content.split())
            self.word_count.set(words)
            self.word_count_label.config(text=f"{words} words")
            
            # Auto-calculate reading time (avg 200 words per minute)
            if words > 0:
                read_time = max(1, round(words / 200))
                self.read_time_var.set(str(read_time))
        except:
            pass
    
    def save_draft(self):
        """Save current post as a draft"""
        try:
            if not self.title_var.get():
                messagebox.showerror("Error", "Please enter a post title before saving draft")
                return
            
            # Create drafts directory if it doesn't exist
            drafts_path = os.path.join(self.repo_path, "_drafts") if self.repo_path else os.path.expanduser("~/blog-drafts")
            os.makedirs(drafts_path, exist_ok=True)
            
            # Generate filename
            slug = self.slug_var.get()
            filename = f"{slug}.markdown"
            filepath = os.path.join(drafts_path, filename)
            
            # Build content
            date = self.date_var.get()
            time = self.time_var.get()
            categories = [key for key, var in self.category_vars.items() if var.get()]
            description = self.description_var.get()
            image = self.image_var.get()
            read_time = self.read_time_var.get()
            content = self.content_var.get("1.0", "end-1c")
            
            draft_content = f"""---
layout: post
title: "{self.title_var.get()}"
date: {date} {time}
categories: [{', '.join(categories)}]
tags: [{', '.join(self.tags_list)}]
author: Martin Li
read_time: {read_time}
description: "{description}"
image: {image}
---

{content}"""
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(draft_content)
            
            self.current_file = filepath
            self.autosave_status.set(f"💾 Draft saved: {filename}")
            self.root.after(3000, lambda: self.autosave_status.set(""))
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save draft: {str(e)}")
    
    def load_post(self):
        """Load an existing post or draft for editing"""
        try:
            # Let user choose between posts and drafts
            choice = messagebox.askquestion("Load Post", "Load from _drafts folder?\n(No = load from _posts)")
            
            if choice == 'yes':
                folder = os.path.join(self.repo_path, "_drafts") if self.repo_path else os.path.expanduser("~/blog-drafts")
            else:
                folder = self.posts_path
            
            if not folder or not os.path.exists(folder):
                messagebox.showerror("Error", f"Folder not found: {folder}")
                return
            
            filepath = filedialog.askopenfilename(
                title="Select Post to Load",
                initialdir=folder,
                filetypes=[("Markdown files", "*.markdown *.md"), ("All files", "*.*")]
            )
            
            if not filepath:
                return
            
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Parse frontmatter and content
            parts = content.split('---', 2)
            if len(parts) >= 3:
                frontmatter = parts[1].strip()
                post_content = parts[2].strip()
                
                # Parse frontmatter fields
                for line in frontmatter.split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        key = key.strip()
                        value = value.strip().strip('"')
                        
                        if key == 'title':
                            self.title_var.set(value)
                            self.update_slug_from_title(value)
                        elif key == 'date':
                            date_parts = value.split()
                            if len(date_parts) >= 2:
                                self.date_var.set(date_parts[0])
                                self.time_var.set(date_parts[1])
                        elif key == 'categories':
                            # Parse categories array
                            cats = value.strip('[]').split(',')
                            for cat_var in self.category_vars.values():
                                cat_var.set(False)
                            for cat in cats:
                                cat = cat.strip()
                                if cat in self.category_vars:
                                    self.category_vars[cat].set(True)
                        elif key == 'tags':
                            # Parse tags array
                            self.tags_list.clear()
                            tags = value.strip('[]').split(',')
                            for tag in tags:
                                tag = tag.strip()
                                if tag:
                                    self.tags_list.append(tag)
                            self.update_tags_display()
                        elif key == 'read_time':
                            self.read_time_var.set(value)
                        elif key == 'description':
                            self.description_var.delete("1.0", "end")
                            self.description_var.insert("1.0", value)
                        elif key == 'image':
                            self.image_var.set(value)
                
                # Set content
                self.content_var.delete("1.0", "end")
                self.content_var.insert("1.0", post_content)
                
                self.current_file = filepath
                self.autosave_status.set(f"📂 Loaded: {os.path.basename(filepath)}")
                self.update_preview()
                self.update_word_count()
                
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load post: {str(e)}")
    
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
    
    def load_template(self):
        """Load selected template into editor"""
        template_name = self.template_var.get()
        if template_name in self.templates:
            response = messagebox.askyesno(
                "Load Template",
                f"Load '{template_name}' template? This will replace current content."
            )
            if response:
                self.content_var.delete("1.0", "end")
                self.content_var.insert("1.0", self.templates[template_name])
                self.update_preview()
                self.update_word_count()
                self.autosave_status.set(f"📋 Loaded template: {template_name}")
                self.root.after(2000, lambda: self.autosave_status.set(""))
    
    def change_font_size(self, delta):
        """Increase or decrease editor font size"""
        current_size = self.font_size.get()
        new_size = max(8, min(20, current_size + delta))
        self.font_size.set(new_size)
        self.content_var.config(font=("Consolas", new_size))
        self.autosave_status.set(f"🔠 Font size: {new_size}pt")
        self.root.after(1500, lambda: self.autosave_status.set(""))
    
    def show_find_replace(self):
        """Show find and replace dialog"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Find & Replace")
        dialog.geometry("450x180")
        dialog.configure(bg=self.colors["bg_secondary"])
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Find field
        tk.Label(
            dialog,
            text="Find:",
            font=("Segoe UI", 10),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w", padx=15, pady=(15, 5))
        
        find_var = tk.StringVar()
        find_entry = tk.Entry(
            dialog,
            textvariable=find_var,
            font=("Segoe UI", 10),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"]
        )
        find_entry.pack(fill="x", padx=15, pady=(0, 10))
        find_entry.focus()
        
        # Replace field
        tk.Label(
            dialog,
            text="Replace with:",
            font=("Segoe UI", 10),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w", padx=15, pady=(0, 5))
        
        replace_var = tk.StringVar()
        replace_entry = tk.Entry(
            dialog,
            textvariable=replace_var,
            font=("Segoe UI", 10),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"]
        )
        replace_entry.pack(fill="x", padx=15, pady=(0, 15))
        
        # Buttons
        btn_frame = tk.Frame(dialog, bg=self.colors["bg_secondary"])
        btn_frame.pack(fill="x", padx=15)
        
        def find_next():
            search_text = find_var.get()
            if search_text:
                content = self.content_var.get("1.0", "end")
                start_pos = self.content_var.index("insert")
                pos = content.find(search_text, self.content_var.search(search_text, start_pos))
                if pos >= 0:
                    self.content_var.tag_remove("sel", "1.0", "end")
                    start = f"1.0+{pos}c"
                    end = f"1.0+{pos + len(search_text)}c"
                    self.content_var.tag_add("sel", start, end)
                    self.content_var.mark_set("insert", end)
                    self.content_var.see("insert")
        
        def replace_current():
            if self.content_var.tag_ranges("sel"):
                self.content_var.delete("sel.first", "sel.last")
                self.content_var.insert("insert", replace_var.get())
                find_next()
        
        def replace_all():
            search_text = find_var.get()
            replace_text = replace_var.get()
            if search_text:
                content = self.content_var.get("1.0", "end-1c")
                count = content.count(search_text)
                new_content = content.replace(search_text, replace_text)
                self.content_var.delete("1.0", "end")
                self.content_var.insert("1.0", new_content)
                messagebox.showinfo("Replace All", f"Replaced {count} occurrences")
                dialog.destroy()
        
        tk.Button(
            btn_frame,
            text="Find Next",
            command=find_next,
            bg=self.colors["accent"],
            fg="white",
            font=("Segoe UI", 9),
            relief="flat",
            padx=12,
            pady=6
        ).pack(side="left", padx=(0, 5))
        
        tk.Button(
            btn_frame,
            text="Replace",
            command=replace_current,
            bg=self.colors["bg_tertiary"],
            fg=self.colors["text_primary"],
            font=("Segoe UI", 9),
            relief="flat",
            padx=12,
            pady=6
        ).pack(side="left", padx=5)
        
        tk.Button(
            btn_frame,
            text="Replace All",
            command=replace_all,
            bg=self.colors["success"],
            fg="white",
            font=("Segoe UI", 9),
            relief="flat",
            padx=12,
            pady=6
        ).pack(side="left", padx=5)
    
    def show_stats(self):
        """Show writing statistics"""
        try:
            content = self.content_var.get("1.0", "end-1c")
            words = content.split()
            word_count = len(words)
            char_count = len(content)
            char_no_spaces = len(content.replace(" ", "").replace("\\n", ""))
            line_count = content.count("\\n") + 1
            paragraph_count = len([p for p in content.split("\\n\\n") if p.strip()])
            
            # Count sentences (rough estimate)
            sentence_count = content.count(".") + content.count("!") + content.count("?")
            
            # Average word length
            avg_word_length = round(char_no_spaces / word_count, 1) if word_count > 0 else 0
            
            # Reading time
            read_time = max(1, round(word_count / 200))
            
            # Count headings
            heading_count = len(re.findall(r"^#{1,6} ", content, re.MULTILINE))
            
            # Count code blocks
            code_block_count = content.count("```") // 2
            
            # Count links
            link_count = len(re.findall(r"\\[.*?\\]\\(.*?\\)", content))
            
            # Create stats dialog
            dialog = tk.Toplevel(self.root)
            dialog.title("📊 Writing Statistics")
            dialog.geometry("400x500")
            dialog.configure(bg=self.colors["bg_primary"])
            dialog.transient(self.root)
            
            # Header
            tk.Label(
                dialog,
                text="📊 Writing Statistics",
                font=("Segoe UI", 18, "bold"),
                bg=self.colors["bg_primary"],
                fg=self.colors["text_primary"]
            ).pack(pady=(20, 10))
            
            tk.Label(
                dialog,
                text=self.title_var.get() or "Untitled Post",
                font=("Segoe UI", 10),
                bg=self.colors["bg_primary"],
                fg=self.colors["text_secondary"]
            ).pack(pady=(0, 20))
            
            # Stats container
            stats_container = tk.Frame(dialog, bg=self.colors["bg_primary"])
            stats_container.pack(fill="both", expand=True, padx=30)
            
            def add_stat(label, value, emoji="📈"):
                frame = tk.Frame(stats_container, bg=self.colors["bg_secondary"])
                frame.pack(fill="x", pady=5)
                
                tk.Label(
                    frame,
                    text=f"{emoji} {label}",
                    font=("Segoe UI", 10),
                    bg=self.colors["bg_secondary"],
                    fg=self.colors["text_secondary"],
                    anchor="w"
                ).pack(side="left", padx=15, pady=10)
                
                tk.Label(
                    frame,
                    text=str(value),
                    font=("Segoe UI", 12, "bold"),
                    bg=self.colors["bg_secondary"],
                    fg=self.colors["accent_light"],
                    anchor="e"
                ).pack(side="right", padx=15, pady=10)
            
            add_stat("Words", f"{word_count:,}", "📝")
            add_stat("Characters", f"{char_count:,}", "🔤")
            add_stat("Characters (no spaces)", f"{char_no_spaces:,}", "🔡")
            add_stat("Lines", line_count, "📄")
            add_stat("Paragraphs", paragraph_count, "¶")
            add_stat("Sentences", sentence_count, "⚫")
            add_stat("Avg. word length", f"{avg_word_length} chars", "📏")
            add_stat("Reading time", f"{read_time} min", "⏱️")
            add_stat("Headings", heading_count, "#")
            add_stat("Code blocks", code_block_count, "💻")
            add_stat("Links", link_count, "🔗")
            
            # Close button
            tk.Button(
                dialog,
                text="Close",
                command=dialog.destroy,
                bg=self.colors["accent"],
                fg="white",
                font=("Segoe UI", 10, "bold"),
                relief="flat",
                padx=30,
                pady=10,
                cursor="hand2"
            ).pack(pady=20)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to generate statistics: {str(e)}")
    
    def view_rendered_preview(self):
        """Generate HTML preview and open in browser"""
        if not MARKDOWN_AVAILABLE:
            messagebox.showerror("Error", "Markdown library not installed. Install with: pip install markdown")
            return
        
        try:
            title = self.title_var.get()
            if not title:
                messagebox.showerror("Error", "Please enter a post title")
                return
            
            # Get all form data
            date = self.date_var.get()
            time = self.time_var.get()
            categories = [key for key, var in self.category_vars.items() if var.get()]
            description = self.description_var.get()
            image = self.image_var.get()
            read_time = self.read_time_var.get()
            content = self.content_var.get("1.0", "end-1c")
            
            if not content.strip():
                messagebox.showerror("Error", "Please write some content")
                return
            
            # Convert markdown to HTML
            html_content = markdown.markdown(content, extensions=['fenced_code', 'codehilite'])
            
            # Create complete HTML page with Jekyll-style styling
            html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }}
        
        .container {{
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 15px;
            font-weight: 700;
        }}
        
        .meta {{
            font-size: 0.9em;
            opacity: 0.9;
            margin-bottom: 15px;
        }}
        
        .meta span {{
            margin-right: 20px;
        }}
        
        .description {{
            font-size: 1.1em;
            font-style: italic;
            opacity: 0.95;
            margin-top: 15px;
        }}
        
        .content {{
            padding: 40px 30px;
            line-height: 1.8;
        }}
        
        .content h1 {{
            font-size: 2em;
            margin: 30px 0 15px 0;
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }}
        
        .content h2 {{
            font-size: 1.6em;
            margin: 25px 0 12px 0;
            color: #764ba2;
        }}
        
        .content h3 {{
            font-size: 1.3em;
            margin: 20px 0 10px 0;
            color: #667eea;
        }}
        
        .content p {{
            margin: 15px 0;
            text-align: justify;
        }}
        
        .content ul, .content ol {{
            margin: 15px 0 15px 30px;
        }}
        
        .content li {{
            margin: 8px 0;
        }}
        
        .content code {{
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            color: #e83e8c;
            font-size: 0.9em;
        }}
        
        .content pre {{
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 15px 0;
            line-height: 1.4;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }}
        
        .content pre code {{
            background: none;
            color: inherit;
            padding: 0;
            font-size: 1em;
        }}
        
        .content blockquote {{
            border-left: 4px solid #667eea;
            padding-left: 20px;
            margin: 15px 0;
            color: #666;
            font-style: italic;
        }}
        
        .content a {{
            color: #667eea;
            text-decoration: none;
            border-bottom: 1px dotted #667eea;
            transition: all 0.2s;
        }}
        
        .content a:hover {{
            color: #764ba2;
            border-bottom: 1px solid #764ba2;
        }}
        
        .content img {{
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }}
        
        .footer {{
            background: #f9f9f9;
            padding: 20px 30px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 0.9em;
            color: #999;
        }}
        
        .badge {{
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            margin: 3px;
        }}
        
        .preview-notice {{
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 500;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{title}</h1>
            <div class="meta">
                <span>📅 {date} {time}</span>
                <span>⏱️ {read_time} min read</span>
            </div>
            {f'<div class="meta"><span>👤 Categories:</span>' + ''.join([f'<span class="badge">{cat}</span>' for cat in categories]) + '</div>' if categories else ''}
            {f'<div class="description">{description}</div>' if description else ''}
        </div>
        
        <div class="preview-notice">
            🔍 Preview Mode - This is how your post will look on the blog
        </div>
        
        <div class="content">
            {html_content}
        </div>
        
        <div class="footer">
            <p>Blog post created with ✍️ Blog Post Creator</p>
            <p style="margin-top: 10px; font-size: 0.8em;">Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </div>
</body>
</html>"""
            
            # Create temporary HTML file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as f:
                f.write(html)
                temp_file = f.name
            
            # Open in default browser
            webbrowser.open(f'file://{temp_file}')
            self.autosave_status.set("🌐 Opened rendered preview in browser")
            self.root.after(3000, lambda: self.autosave_status.set(""))
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to generate preview: {str(e)}")

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
