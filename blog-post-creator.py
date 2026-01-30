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
import threading

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
        self.autosave_timer = None
        self.last_autosave_path = None
        self.outline_items = []  # Track heading structure
        self.show_outline = tk.BooleanVar(value=True)  # Toggle outline visibility
        
        # YAML Editor state
        self.yaml_editor_mode = tk.BooleanVar(value=False)  # Toggle between visual and raw YAML
        self.yaml_fields = {
            "title": tk.StringVar(),
            "description": tk.StringVar(),
            "date": tk.StringVar(value=datetime.now().strftime("%Y-%m-%d")),
            "categories": tk.StringVar(),  # Comma-separated
            "tags": tk.StringVar(),  # Comma-separated
            "canonical_url": tk.StringVar(),
            "featured_image": tk.StringVar(),
            "draft": tk.BooleanVar(value=False),
            "read_time": tk.StringVar(value="5")
        }
        
        # Post status (Tier 2)
        self.post_status = tk.StringVar(value="Draft")  # Draft, In Review, Ready, Published
        
        # Content blocks/callouts (Tier 2)
        self.content_blocks = {
            "warning": "⚠️ **Warning:** ",
            "insight": "💡 **Insight:** ",
            "info": "ℹ️ **Info:** ",
            "success": "✅ **Success:** ",
            "error": "❌ **Error:** ",
            "tip": "🎯 **Tip:** ",
            "note": "📌 **Note:** "
        }
        
        # Image manager (Tier 2)
        self.uploaded_images = []  # Track uploaded images
        
        # Cross-post templates (Tier 3)
        self.cross_post_templates = {
            "twitter": "Tweet this!\n{title}\n{excerpt}\n{url}\n\n#writing #blog",
            "linkedin": "LinkedIn Post:\n{title}\n\n{excerpt}\n\nRead more: {url}",
            "newsletter": "Newsletter:\n{title}\n\n{excerpt}\n\n[Read Full Article]({url})",
            "youtube": "Video Description:\n{title}\n\nTopics covered:\n- {excerpt}\n\nBlog: {url}"
        }
        
        self.snippets = {
            "table": "| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |",
            "checklist": "- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3",
            "hr": "---",
            "details": "<details>\n<summary>Click to expand</summary>\n\nContent goes here\n\n</details>",
            "callout": "> **Note:** Important information here",
            "math": "$$E = mc^2$$",
            "tabs": "<tabs>\n  <tab label=\"Tab 1\">Content 1</tab>\n  <tab label=\"Tab 2\">Content 2</tab>\n</tabs>"
        }
        
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
        self.start_autosave_timer()
        
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
        
        # Outline sidebar (collapsible)
        self.outline_panel = tk.Frame(content_frame, bg=self.colors["bg_secondary"], relief="flat", width=250)
        self.outline_panel.pack(side="left", fill="y", padx=(0, 8))
        self.outline_panel.pack_propagate(False)
        self.create_outline_navigator(self.outline_panel)
        
        # Left panel - Form (fixed width of 400px)
        left_panel = tk.Frame(content_frame, bg=self.colors["bg_secondary"], relief="flat", width=400)
        left_panel.pack(side="left", fill="y", padx=(0, 12))
        left_panel.pack_propagate(False)
        
        # Right panel - Editor and Preview
        right_panel = tk.Frame(content_frame, bg=self.colors["bg_secondary"], relief="flat")
        right_panel.pack(side="right", fill="both", expand=True)
        
        self.create_form_panel(left_panel)
        self.create_editor_preview_panel(right_panel)
    
    def create_outline_navigator(self, parent):
        """Create a collapsible outline/heading navigator sidebar"""
        # Header
        header = tk.Frame(parent, bg=self.colors["bg_secondary"])
        header.pack(fill="x", padx=12, pady=(12, 8))
        
        tk.Label(
            header,
            text="📋 Outline",
            font=("Segoe UI", 11, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w")
        
        tk.Label(
            header,
            text="Auto-extracted headings",
            font=("Segoe UI", 8),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(2, 0))
        
        # Scrollable outline list
        canvas = tk.Canvas(
            parent,
            bg=self.colors["bg_primary"],
            highlightthickness=0,
            bd=0
        )
        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        self.outline_frame = tk.Frame(canvas, bg=self.colors["bg_primary"])
        
        self.outline_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=self.outline_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True, padx=0, pady=0)
        scrollbar.pack(side="right", fill="y")
        
        self.outline_canvas = canvas
    
    def update_outline(self):
        """Extract headings from editor and update outline"""
        try:
            content = self.content_var.get("1.0", "end-1c")
            lines = content.split("\n")
            
            # Extract headings with their line numbers
            headings = []
            for i, line in enumerate(lines):
                match = re.match(r'^(#{1,3})\s+(.+)$', line)
                if match:
                    level = len(match.group(1))  # 1, 2, or 3
                    text = match.group(2)
                    headings.append({
                        'level': level,
                        'text': text,
                        'line': i + 1,
                        'index': f"{i + 1}.0"
                    })
            
            self.outline_items = headings
            self._refresh_outline_display()
        except:
            pass
    
    def _refresh_outline_display(self):
        """Refresh the outline display with current headings"""
        # Clear existing items
        for widget in self.outline_frame.winfo_children():
            widget.destroy()
        
        if not self.outline_items:
            tk.Label(
                self.outline_frame,
                text="No headings found",
                font=("Segoe UI", 9),
                bg=self.colors["bg_primary"],
                fg=self.colors["text_hint"],
                padx=12,
                pady=20
            ).pack(anchor="w")
            return
        
        # Display outline items
        for item in self.outline_items:
            indent = "  " * (item['level'] - 1)
            emoji = ["#️⃣", "##️⃣", "###️⃣"][item['level'] - 1]
            
            # Calculate word count for this section
            section_start = item['line'] - 1
            section_end = len(self.content_var.get("1.0", "end-1c").split("\n"))
            
            # Find next heading
            for next_item in self.outline_items:
                if next_item['line'] > item['line']:
                    section_end = next_item['line'] - 1
                    break
            
            # Count words in section
            section_lines = self.content_var.get(f"{section_start + 1}.0", f"{section_end}.0").split("\n")
            word_count = sum(len(line.split()) for line in section_lines)
            
            btn_frame = tk.Frame(self.outline_frame, bg=self.colors["bg_primary"])
            btn_frame.pack(fill="x", padx=8, pady=2)
            
            # Outline button
            btn = tk.Label(
                btn_frame,
                text=f"{emoji} {item['text'][:25]}{'...' if len(item['text']) > 25 else ''}",
                font=("Segoe UI", 9),
                bg=self.colors["bg_secondary"],
                fg=self.colors["accent_light"],
                padx=10,
                pady=6,
                cursor="hand2",
                relief="flat",
                anchor="w"
            )
            btn.pack(fill="x", side="left", expand=True)
            btn.bind("<Button-1>", lambda e, idx=item['index']: self._jump_to_heading(idx))
            btn.bind("<Enter>", lambda e, b=btn: b.config(bg=self.colors["border_light"]))
            btn.bind("<Leave>", lambda e, b=btn: b.config(bg=self.colors["bg_secondary"]))
            
            # Word count label
            tk.Label(
                btn_frame,
                text=f"{word_count}w",
                font=("Segoe UI", 8),
                bg=self.colors["bg_primary"],
                fg=self.colors["text_hint"],
                padx=4
            ).pack(side="right")
    
    def _jump_to_heading(self, line_index):
        """Jump editor to specific heading"""
        self.content_var.mark_set("insert", line_index)
        self.content_var.see(line_index)
        self.content_var.focus()
    
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
        
        # Word count indicator with stats
        self.stats_frame = tk.Frame(right_header, bg=self.colors["bg_secondary"])
        self.stats_frame.pack(pady=(0, 4))
        
        self.word_count_label = tk.Label(
            self.stats_frame,
            text="0 words • 0 min",
            font=("Segoe UI", 11, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["accent_light"]
        )
        self.word_count_label.pack(side="left", padx=(0, 15))
        
        self.char_count_label = tk.Label(
            self.stats_frame,
            text="0 chars",
            font=("Segoe UI", 9),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        )
        self.char_count_label.pack(side="left")
        
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
        
        header_left = tk.Frame(header, bg=self.colors["bg_secondary"])
        header_left.pack(anchor="w", side="left")
        
        tk.Label(
            header_left,
            text="Post Details",
            font=("Segoe UI", 14, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w")
        
        tk.Label(
            header_left,
            text="Fill in the essential information",
            font=("Segoe UI", 9),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(4, 0))
        
        # YAML Editor toggle
        yaml_toggle = tk.Frame(header, bg=self.colors["bg_secondary"])
        yaml_toggle.pack(anchor="e", side="right")
        
        yaml_btn = tk.Button(
            yaml_toggle,
            text="⚙️ YAML" if not self.yaml_editor_mode.get() else "📋 Form",
            font=("Segoe UI", 9, "bold"),
            bg=self.colors["accent"],
            fg=self.colors["text_primary"],
            relief="flat",
            padx=10,
            pady=5,
            command=self.toggle_yaml_editor
        )
        yaml_btn.pack()
        self.yaml_toggle_btn = yaml_btn
        
        # Main container that switches between form and YAML editor
        self.form_container = tk.Frame(parent, bg=self.colors["bg_secondary"])
        self.form_container.pack(fill="both", expand=True)
        
        # Create both views
        self.create_form_view(self.form_container)
        self.create_yaml_editor_view(self.form_container)
        
        # Show form by default
        self.show_form_view()
    
    def show_form_view(self):
        """Display the form view and hide YAML editor"""
        if not hasattr(self, 'form_view_container'):
            return
        self.form_view_container.pack(fill="both", expand=True)
        if hasattr(self, 'yaml_view_container'):
            self.yaml_view_container.pack_forget()
        self.yaml_editor_mode.set(False)
    
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
    
    def create_form_view(self, parent):
        """Create the visual form editor view"""
        # Create wrapper container
        self.form_view_container = tk.Frame(parent, bg=self.colors["bg_secondary"])
        
        # Scrollable container
        canvas = tk.Canvas(self.form_view_container, bg=self.colors["bg_secondary"], highlightthickness=0, bd=0, name="form_canvas")
        scrollbar = ttk.Scrollbar(self.form_view_container, orient="vertical", command=canvas.yview)
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
        
        # Post Status (Tier 2)
        self.create_status_selector(scrollable_frame)
        
        # Image URL
        self.create_text_field(scrollable_frame, "Featured Image URL", "image", placeholder="/assets/images/post-image.jpg")
        
        # Description with character counter
        self.create_description_field(scrollable_frame)
        
        # Pack the canvas and scrollbar in the form_view_container
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def create_yaml_editor_view(self, parent):
        """Create the raw YAML editor view"""
        # Container for YAML editor
        self.yaml_view_container = tk.Frame(parent, bg=self.colors["bg_secondary"], name="yaml_view")
        
        # Header
        header = tk.Frame(self.yaml_view_container, bg=self.colors["bg_secondary"])
        header.pack(fill="x", padx=18, pady=(12, 8))
        
        tk.Label(
            header,
            text="Raw YAML Frontmatter",
            font=("Segoe UI", 11, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w")
        
        tk.Label(
            header,
            text="Edit the YAML metadata directly (advanced)",
            font=("Segoe UI", 8),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(2, 0))
        
        # YAML text editor
        editor_frame = tk.Frame(self.yaml_view_container, bg=self.colors["bg_primary"])
        editor_frame.pack(fill="both", expand=True, padx=18, pady=12)
        
        self.yaml_text_editor = tk.Text(
            editor_frame,
            font=("Consolas", 10),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"],
            insertbackground=self.colors["focus"],
            relief="flat",
            bd=0,
            wrap="none",
            height=20
        )
        self.yaml_text_editor.pack(fill="both", expand=True)
        
        # Scrollbar for YAML editor
        yaml_scrollbar = ttk.Scrollbar(editor_frame, orient="vertical", command=self.yaml_text_editor.yview)
        yaml_scrollbar.pack(side="right", fill="y")
        self.yaml_text_editor.config(yscrollcommand=yaml_scrollbar.set)
        
        # Sync button
        sync_frame = tk.Frame(self.yaml_view_container, bg=self.colors["bg_secondary"])
        sync_frame.pack(fill="x", padx=18, pady=(0, 12))
        
        tk.Button(
            sync_frame,
            text="💾 Sync to Form",
            font=("Segoe UI", 9, "bold"),
            bg=self.colors["success"],
            fg=self.colors["text_primary"],
            relief="flat",
            padx=12,
            pady=5,
            command=self.sync_yaml_to_form
        ).pack(anchor="w")
        
        # Initially hide YAML view (form view shown by default)
        self.yaml_view_container.pack_forget()
    
    def toggle_yaml_editor(self):
        """Toggle between form view and YAML editor view"""
        current_mode = self.yaml_editor_mode.get()
        
        # Update YAML from form before switching
        if not current_mode:
            self.sync_form_to_yaml()
        
        # Toggle mode
        self.yaml_editor_mode.set(not current_mode)
        
        # Update button text
        new_text = "📋 Form" if self.yaml_editor_mode.get() else "⚙️ YAML"
        self.yaml_toggle_btn.config(text=new_text)
        
        # Show/hide views
        if self.yaml_editor_mode.get():
            self.form_view_container.pack_forget()
            self.yaml_view_container.pack(fill="both", expand=True)
        else:
            self.yaml_view_container.pack_forget()
            self.form_view_container.pack(fill="both", expand=True)
    
    def sync_form_to_yaml(self):
        """Sync form fields to YAML text editor"""
        title = getattr(self, "title_var", tk.StringVar()).get()
        description = self.description_var.get()
        date = getattr(self, "date_var", tk.StringVar()).get()
        categories = getattr(self, "categories_var", tk.StringVar()).get()
        tags = getattr(self, "tags_var", tk.StringVar()).get()
        read_time = getattr(self, "read_time_var", tk.StringVar()).get()
        image = getattr(self, "image_var", tk.StringVar()).get()
        
        # Build YAML frontmatter
        yaml_text = f"""---
title: "{title}"
date: {date}
categories: {categories}
tags: {tags}
description: "{description}"
read_time: "{read_time}"
featured_image: "{image}"
draft: false
---"""
        
        self.yaml_text_editor.delete("1.0", "end")
        self.yaml_text_editor.insert("1.0", yaml_text)
    
    def sync_yaml_to_form(self):
        """Parse YAML and update form fields"""
        yaml_content = self.yaml_text_editor.get("1.0", "end")
        
        try:
            # Simple YAML parser (handles basic cases)
            import re
            
            # Extract YAML block
            yaml_match = re.search(r'^---\n(.*?)\n---', yaml_content, re.DOTALL)
            if not yaml_match:
                messagebox.showerror("YAML Parse Error", "Invalid YAML format. Must be wrapped in --- ---")
                return
            
            yaml_lines = yaml_match.group(1).strip().split('\n')
            
            for line in yaml_lines:
                if ':' not in line:
                    continue
                    
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip().strip('"\'')
                
                if key == "title":
                    self.title_var.set(value)
                elif key == "date":
                    self.date_var.set(value)
                elif key == "categories":
                    self.categories_var.set(value)
                elif key == "tags":
                    self.tags_var.set(value)
                elif key == "description":
                    self.description_var.set(value)
                elif key == "read_time":
                    self.read_time_var.set(value)
                elif key == "featured_image":
                    self.image_var.set(value)
            
            messagebox.showinfo("Success", "YAML synced to form!")
            
            # Switch back to form view
            self.toggle_yaml_editor()
            
        except Exception as e:
            messagebox.showerror("Parse Error", f"Failed to parse YAML:\n{str(e)}")
    
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
    
    def create_status_selector(self, parent):
        """Create post status selector (Tier 2)"""
        container = tk.Frame(parent, bg=self.colors["bg_secondary"])
        container.pack(fill="x", padx=18, pady=(0, 16))
        
        label_frame = tk.Frame(container, bg=self.colors["bg_secondary"])
        label_frame.pack(fill="x", pady=(0, 6))
        
        tk.Label(
            label_frame,
            text="Post Status",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w")
        
        tk.Label(
            label_frame,
            text="Workflow: Draft → In Review → Ready → Published",
            font=("Segoe UI", 8),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(2, 0))
        
        # Status buttons
        status_frame = tk.Frame(container, bg=self.colors["bg_secondary"])
        status_frame.pack(fill="x")
        
        status_options = ["Draft", "In Review", "Ready", "Published"]
        status_colors = {
            "Draft": self.colors["text_hint"],
            "In Review": self.colors["warning"],
            "Ready": self.colors["accent_light"],
            "Published": self.colors["success"]
        }
        
        for status in status_options:
            btn = tk.Button(
                status_frame,
                text=status,
                font=("Segoe UI", 9),
                bg=self.colors["bg_tertiary"],
                fg=self.colors["text_primary"],
                relief="flat",
                padx=12,
                pady=6,
                command=lambda s=status: self.post_status.set(s)
            )
            btn.pack(side="left", padx=(0, 8))
            
            # Highlight selected status
            def update_btn_style(btn=btn, s=status):
                if self.post_status.get() == s:
                    btn.config(bg=status_colors[s], fg="#ffffff")
                else:
                    btn.config(bg=self.colors["bg_tertiary"], fg=self.colors["text_primary"])
            
            self.post_status.trace("w", lambda *args, btn=btn, s=status: update_btn_style())
    
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
        """Create the right side with split editor, live preview, and SEO panel"""
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
        
        tk.Label(
            header,
            text="•",
            font=("Segoe UI", 11),
            bg=self.colors["bg_secondary"],
            fg=self.colors["border"]
        ).pack(side="left", padx=8)
        
        tk.Label(
            header,
            text="📊 SEO & Readability",
            font=("Segoe UI", 11, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["success"]
        ).pack(side="left", padx=5, pady=8)
        
        # Split container for editor and preview (horizontal)
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
        
        # Middle-Right split (vertical) for preview and SEO panel
        middle_container = tk.PanedWindow(
            split_container,
            orient=tk.VERTICAL,
            bg=self.colors["bg_primary"],
            sashwidth=6,
            sashrelief=tk.FLAT,
            bd=0
        )
        split_container.add(middle_container, minsize=350)
        
        # Preview
        self.preview_frame = tk.Frame(middle_container, bg=self.colors["bg_primary"])
        middle_container.add(self.preview_frame, minsize=300)
        
        # SEO Panel
        self.seo_frame = tk.Frame(middle_container, bg=self.colors["bg_secondary"], relief="flat")
        middle_container.add(self.seo_frame, minsize=200)
        self.create_seo_panel(self.seo_frame)
        
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
        self.content_var.bind("<KeyRelease>", lambda e: self.update_outline(), add=True)
        self.content_var.bind("<KeyRelease>", lambda e: self.update_seo_metrics(), add=True)
        
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
        
        # Revision Timeline (Tier 3)
        revision_btn = tk.Label(
            action_bar,
            text="⏰ Revisions",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["accent"],
            fg="white",
            padx=16,
            pady=10,
            cursor="hand2"
        )
        revision_btn.pack(side="left", padx=(0, 10))
        revision_btn.bind("<Button-1>", lambda e: self.show_revision_timeline())
        revision_btn.bind("<Enter>", lambda e: revision_btn.config(bg=self.colors["accent_hover"]))
        revision_btn.bind("<Leave>", lambda e: revision_btn.config(bg=self.colors["accent"]))
        
        # Cross-Post Generator (Tier 3)
        crosspost_btn = tk.Label(
            action_bar,
            text="📤 Cross-Post",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["warning"],
            fg="white",
            padx=16,
            pady=10,
            cursor="hand2"
        )
        crosspost_btn.pack(side="left", padx=(0, 10))
        crosspost_btn.bind("<Button-1>", lambda e: self.show_crosspost_generator())
        crosspost_btn.bind("<Enter>", lambda e: crosspost_btn.config(bg="#d97706"))
        crosspost_btn.bind("<Leave>", lambda e: crosspost_btn.config(bg=self.colors["warning"]))
        
        # Internal Link Recommender (Tier 3)
        link_btn = tk.Label(
            action_bar,
            text="🔗 Link Ideas",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["accent"],
            fg="white",
            padx=16,
            pady=10,
            cursor="hand2"
        )
        link_btn.pack(side="left", padx=(0, 10))
        link_btn.bind("<Button-1>", lambda e: self.show_link_recommender())
        link_btn.bind("<Enter>", lambda e: link_btn.config(bg=self.colors["accent_hover"]))
        link_btn.bind("<Leave>", lambda e: link_btn.config(bg=self.colors["accent"]))
        
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
    
    def create_seo_panel(self, parent):
        """Create the SEO and readability scoring panel"""
        # Header
        header = tk.Frame(parent, bg=self.colors["bg_secondary"])
        header.pack(fill="x", padx=12, pady=(12, 8))
        
        tk.Label(
            header,
            text="📊 SEO & Readability",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w")
        
        tk.Label(
            header,
            text="Real-time content analysis",
            font=("Segoe UI", 8),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(2, 0))
        
        # Scrollable content
        canvas = tk.Canvas(parent, bg=self.colors["bg_secondary"], highlightthickness=0, bd=0)
        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        self.seo_content = tk.Frame(canvas, bg=self.colors["bg_secondary"])
        
        self.seo_content.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=self.seo_content, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # SEO metrics - will be updated in real-time
        self.seo_metrics = {}
        
        # Flesch Reading Ease
        self.seo_metrics["flesch"] = self.create_seo_metric(self.seo_content, "📖 Reading Ease", "Flesch score")
        
        # Average Sentence Length
        self.seo_metrics["sentence_length"] = self.create_seo_metric(self.seo_content, "✏️ Avg Sentence", "Words per sentence")
        
        # Passive Voice Percentage
        self.seo_metrics["passive_voice"] = self.create_seo_metric(self.seo_content, "🎯 Passive Voice", "Percentage of sentences")
        
        # Keyword Density
        self.seo_metrics["keyword_density"] = self.create_seo_metric(self.seo_content, "🔑 Keyword Density", "From title words")
        
        # Long Paragraphs Warning
        self.seo_metrics["long_paragraphs"] = self.create_seo_metric(self.seo_content, "⚠️ Long Paragraphs", "Paragraphs > 100 words")
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def create_seo_metric(self, parent, label, sublabel):
        """Create a single SEO metric display"""
        container = tk.Frame(parent, bg=self.colors["bg_secondary"])
        container.pack(fill="x", padx=12, pady=(0, 10))
        
        # Label
        label_frame = tk.Frame(container, bg=self.colors["bg_secondary"])
        label_frame.pack(fill="x", pady=(0, 4))
        
        tk.Label(
            label_frame,
            text=label,
            font=("Segoe UI", 9, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w", side="left")
        
        # Value and status indicator (color-coded)
        metric_value = tk.Label(
            label_frame,
            text="—",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_secondary"]
        )
        metric_value.pack(anchor="e", side="right")
        
        # Sublabel
        tk.Label(
            container,
            text=sublabel,
            font=("Segoe UI", 8),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(0, 6))
        
        # Status bar (colored background)
        status_bar = tk.Frame(
            container,
            bg=self.colors["border"],
            height=6
        )
        status_bar.pack(fill="x", pady=(0, 0))
        
        return {
            "value": metric_value,
            "container": container,
            "status_bar": status_bar
        }
    
    def update_seo_metrics(self):
        """Calculate and update all SEO metrics"""
        try:
            content = self.content_var.get("1.0", "end-1c")
            title = self.title_var.get()
            
            if not content or not title:
                return
            
            # Calculate metrics
            flesch_score = self.calculate_flesch_kincaid(content)
            avg_sentence_length = self.calculate_avg_sentence_length(content)
            passive_voice_pct = self.calculate_passive_voice(content)
            keyword_density = self.calculate_keyword_density(content, title)
            long_paragraph_count = self.count_long_paragraphs(content)
            
            # Update displays
            self.update_metric_display("flesch", f"{flesch_score:.0f}", flesch_score)
            self.update_metric_display("sentence_length", f"{avg_sentence_length:.1f} words", avg_sentence_length, threshold=15, invert=True)
            self.update_metric_display("passive_voice", f"{passive_voice_pct:.1f}%", passive_voice_pct, threshold=15, invert=True)
            self.update_metric_display("keyword_density", f"{keyword_density:.1f}%", keyword_density, min_val=1, max_val=3)
            self.update_metric_display("long_paragraphs", f"{long_paragraph_count} paragraphs", long_paragraph_count, threshold=3, invert=True)
            
        except Exception as e:
            pass
    
    def calculate_flesch_kincaid(self, text):
        """Calculate Flesch Reading Ease score (0-100, higher is easier)"""
        import re
        
        # Count sentences
        sentences = len(re.split(r'[.!?]+', text)) - 1
        if sentences == 0:
            return 0
        
        # Count words
        words = len(text.split())
        
        # Count syllables (approximation)
        syllables = self.count_syllables(text)
        
        # Flesch Reading Ease = 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
        if words > 0:
            fre = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
            return max(0, min(100, fre))
        return 0
    
    def count_syllables(self, text):
        """Approximate syllable count"""
        import re
        text = text.lower()
        syllable_count = 0
        vowels = "aeiouy"
        previous_was_vowel = False
        
        for char in text:
            is_vowel = char in vowels
            if is_vowel and not previous_was_vowel:
                syllable_count += 1
            previous_was_vowel = is_vowel
        
        # Adjustments
        if text.endswith("e"):
            syllable_count -= 1
        if text.endswith("le") and len(text) > 2 and text[-3] not in vowels:
            syllable_count += 1
        
        return max(1, syllable_count)
    
    def calculate_avg_sentence_length(self, text):
        """Calculate average words per sentence"""
        import re
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return 0
        
        total_words = sum(len(s.split()) for s in sentences)
        return total_words / len(sentences)
    
    def calculate_passive_voice(self, text):
        """Approximate percentage of passive voice sentences"""
        import re
        
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return 0
        
        # Simple heuristic: look for "was", "were", "be", "been" patterns
        passive_indicators = r'\b(was|were|be|been|by)\b'
        passive_count = sum(1 for s in sentences if re.search(passive_indicators, s.lower()))
        
        return (passive_count / len(sentences)) * 100
    
    def calculate_keyword_density(self, text, title):
        """Calculate keyword density (title keywords in content)"""
        if not title:
            return 0
        
        import re
        title_words = [w.lower() for w in title.split() if len(w) > 3]
        if not title_words:
            return 0
        
        content_words = text.lower().split()
        total_words = len(content_words)
        
        if total_words == 0:
            return 0
        
        keyword_count = sum(content_words.count(kw) for kw in title_words)
        return (keyword_count / total_words) * 100
    
    def count_long_paragraphs(self, text):
        """Count paragraphs with more than 100 words"""
        paragraphs = text.split('\n\n')
        long_paragraphs = sum(1 for p in paragraphs if len(p.split()) > 100)
        return long_paragraphs
    
    def update_metric_display(self, metric_key, value_text, score, threshold=50, min_val=0, max_val=100, invert=False):
        """Update a metric's display with color coding"""
        metric = self.seo_metrics.get(metric_key)
        if not metric:
            return
        
        # Determine color (green, yellow, red)
        if invert:
            # For metrics where lower is better (sentence length, passive voice)
            if score <= threshold * 0.5:
                color = self.colors["success"]  # 🟢 Good
                emoji = "🟢"
            elif score <= threshold:
                color = self.colors["warning"]  # 🟡 Fair
                emoji = "🟡"
            else:
                color = self.colors["error"]    # 🔴 Needs work
                emoji = "🔴"
        else:
            # For metrics where higher is better or in range
            if min_val <= score <= max_val:
                color = self.colors["success"]
                emoji = "🟢"
            elif score < min_val or score > max_val * 1.5:
                color = self.colors["error"]
                emoji = "🔴"
            else:
                color = self.colors["warning"]
                emoji = "🟡"
        
        metric["value"].config(text=f"{emoji} {value_text}", fg=color)
        metric["status_bar"].config(bg=color)
    
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
            ("☑️", "Checklist", lambda: self.insert_snippet("checklist")),
            ("|", "—", None),  # Separator
            ("[ ] Code", "Code Block", lambda: self.insert_code_block()),
            ("[Link]", "Link", lambda: self.insert_link()),
            ("[Img]", "Image", lambda: self.insert_image()),
            ("|", "—", None),  # Separator
            ("Quote", "Blockquote", lambda: self.insert_prefix("> ")),
            ("📋", "Table", lambda: self.insert_snippet("table")),
            ("---", "Divider", lambda: self.insert_snippet("hr")),
            ("🎨", "Blocks", lambda: self.show_content_blocks()),
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
        """Open Image Manager (Tier 2) - drag/drop, auto-slug, auto-insert"""
        dialog = tk.Toplevel(self.root)
        dialog.title("🖼️ Image Manager")
        dialog.geometry("500x400")
        dialog.configure(bg=self.colors["bg_primary"])
        
        # Header
        header = tk.Frame(dialog, bg=self.colors["bg_secondary"])
        header.pack(fill="x", padx=16, pady=(16, 12))
        
        tk.Label(
            header,
            text="🖼️ Image Manager",
            font=("Segoe UI", 12, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w")
        
        tk.Label(
            header,
            text="Upload and insert images with auto-naming",
            font=("Segoe UI", 9),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(4, 0))
        
        # Upload button
        button_frame = tk.Frame(dialog, bg=self.colors["bg_primary"])
        button_frame.pack(fill="x", padx=16, pady=12)
        
        tk.Button(
            button_frame,
            text="📁 Select Image File",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["accent"],
            fg="white",
            relief="flat",
            padx=16,
            pady=10,
            command=lambda: self.upload_image(dialog)
        ).pack(anchor="w")
        
        # Quick URL insert
        url_frame = tk.Frame(dialog, bg=self.colors["bg_secondary"])
        url_frame.pack(fill="x", padx=16, pady=(0, 12))
        
        tk.Label(
            url_frame,
            text="Or paste image URL:",
            font=("Segoe UI", 9, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w", pady=(0, 6))
        
        self.image_url_var = tk.StringVar()
        url_entry = tk.Entry(
            url_frame,
            textvariable=self.image_url_var,
            font=("Segoe UI", 10),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"],
            relief="flat",
            bd=0
        )
        url_entry.pack(fill="x", ipady=10)
        url_entry.config(highlightthickness=1, highlightbackground=self.colors["border"], highlightcolor=self.colors["focus"])
        
        # Alt text
        alt_frame = tk.Frame(dialog, bg=self.colors["bg_secondary"])
        alt_frame.pack(fill="x", padx=16, pady=(0, 12))
        
        tk.Label(
            alt_frame,
            text="Alt Text:",
            font=("Segoe UI", 9, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w", pady=(0, 6))
        
        self.image_alt_var = tk.StringVar()
        alt_entry = tk.Entry(
            alt_frame,
            textvariable=self.image_alt_var,
            font=("Segoe UI", 10),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"],
            relief="flat",
            bd=0
        )
        alt_entry.pack(fill="x", ipady=10)
        alt_entry.config(highlightthickness=1, highlightbackground=self.colors["border"], highlightcolor=self.colors["focus"])
        
        # Insert button
        insert_frame = tk.Frame(dialog, bg=self.colors["bg_primary"])
        insert_frame.pack(fill="x", padx=16, pady=12)
        
        tk.Button(
            insert_frame,
            text="✅ Insert Image",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["success"],
            fg="white",
            relief="flat",
            padx=16,
            pady=10,
            command=lambda: self.insert_image_markdown(dialog)
        ).pack(anchor="e")
    
    def upload_image(self, dialog):
        """File picker for images (Tier 2)"""
        from tkinter import filedialog
        import shutil
        from pathlib import Path
        
        try:
            file_path = filedialog.askopenfilename(
                title="Select Image",
                filetypes=[("Image files", "*.png *.jpg *.jpeg *.gif *.webp"), ("All files", "*.*")]
            )
            
            if file_path:
                # Generate slug from filename
                filename = Path(file_path).stem
                slug = "-".join(filename.lower().split())
                ext = Path(file_path).suffix
                
                # Destination
                assets_path = os.path.join(self.repo_path, "assets", "images") if self.repo_path else "./assets/images"
                os.makedirs(assets_path, exist_ok=True)
                
                dest_file = os.path.join(assets_path, f"{slug}{ext}")
                shutil.copy(file_path, dest_file)
                
                # Set URL
                url = f"/assets/images/{slug}{ext}"
                self.image_url_var.set(url)
                self.image_alt_var.set(filename.replace("-", " ").title())
                
                messagebox.showinfo("Success", f"Image uploaded to {url}")
        except Exception as e:
            messagebox.showerror("Error", f"Upload failed: {str(e)}")
    
    def insert_image_markdown(self, dialog):
        """Insert image markdown syntax"""
        url = self.image_url_var.get()
        alt = self.image_alt_var.get()
        
        if not url:
            messagebox.showwarning("Required", "Please provide image URL")
            return
        
        markdown = f"![{alt}]({url})"
        
        try:
            pos = self.content_var.index("insert")
            self.content_var.insert(pos, markdown)
            self.update_preview()
            dialog.destroy()
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
        """Update word count, character count, and auto-calculate reading time"""
        try:
            content = self.content_var.get("1.0", "end-1c")
            words = len(content.split())
            chars = len(content)
            self.word_count.set(words)
            
            # Auto-calculate reading time (avg 200 words per minute)
            if words > 0:
                read_time = max(1, round(words / 200))
                self.read_time_var.set(str(read_time))
            else:
                read_time = 0
            
            # Update display with inline stats
            self.word_count_label.config(text=f"{words:,} words • {read_time} min")
            self.char_count_label.config(text=f"{chars:,} chars")
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
    
    def show_content_blocks(self):
        """Display content blocks/callouts menu (Tier 2)"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Content Blocks")
        dialog.geometry("400x350")
        dialog.configure(bg=self.colors["bg_primary"])
        dialog.resizable(False, False)
        
        # Header
        header = tk.Frame(dialog, bg=self.colors["bg_secondary"])
        header.pack(fill="x", padx=16, pady=(16, 12))
        
        tk.Label(
            header,
            text="🎨 Content Blocks",
            font=("Segoe UI", 12, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w")
        
        tk.Label(
            header,
            text="Quick insert styled content blocks",
            font=("Segoe UI", 9),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(4, 0))
        
        # Scrollable blocks list
        canvas = tk.Canvas(dialog, bg=self.colors["bg_primary"], highlightthickness=0, bd=0)
        scrollbar = ttk.Scrollbar(dialog, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors["bg_primary"])
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Add block options
        for block_name, block_prefix in self.content_blocks.items():
            btn = tk.Button(
                scrollable_frame,
                text=f"{block_prefix}Your text here",
                font=("Segoe UI", 10),
                bg=self.colors["bg_secondary"],
                fg=self.colors["text_primary"],
                relief="flat",
                padx=12,
                pady=10,
                justify="left",
                command=lambda prefix=block_prefix: self.insert_content_block(prefix, dialog)
            )
            btn.pack(fill="x", padx=12, pady=6)
            btn.bind("<Enter>", lambda e, b=btn: b.config(bg=self.colors["border_light"]))
            btn.bind("<Leave>", lambda e, b=btn: b.config(bg=self.colors["bg_secondary"]))
        
        canvas.pack(side="left", fill="both", expand=True, padx=12)
        scrollbar.pack(side="right", fill="y")
    
    def insert_content_block(self, prefix, dialog):
        """Insert a content block at cursor position"""
        try:
            pos = self.content_var.index("insert")
            self.content_var.insert(pos, f"{prefix}Your text here\n")
            self.update_preview()
            dialog.destroy()
        except:
            pass
    
    def show_crosspost_generator(self):
        """Generate cross-post content for multiple platforms (Tier 3)"""
        dialog = tk.Toplevel(self.root)
        dialog.title("📤 Cross-Post Generator")
        dialog.geometry("600x500")
        dialog.configure(bg=self.colors["bg_primary"])
        
        # Header
        header = tk.Frame(dialog, bg=self.colors["bg_secondary"])
        header.pack(fill="x", padx=16, pady=(16, 12))
        
        tk.Label(
            header,
            text="📤 Cross-Post Generator",
            font=("Segoe UI", 12, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w")
        
        tk.Label(
            header,
            text="Generate content snippets for different platforms",
            font=("Segoe UI", 9),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(4, 0))
        
        # Get current content
        title = self.title_var.get()
        content = self.content_var.get("1.0", "end-1c")
        excerpt = " ".join(content.split()[:30])  # First 30 words
        url = f"https://yoursite.com/{self.slug_var.get()}" if self.slug_var.get() else "https://yoursite.com/post"
        
        # Scrollable content
        canvas = tk.Canvas(dialog, bg=self.colors["bg_primary"], highlightthickness=0, bd=0)
        scrollbar = ttk.Scrollbar(dialog, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors["bg_primary"])
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Generate snippets for each platform
        platforms = {
            "🐦 Twitter/X": f"{title}\n{excerpt}...\n\n{url}",
            "💼 LinkedIn": f"📝 {title}\n\n{excerpt}...\n\nRead the full article: {url}",
            "📧 Newsletter": f"Subject: {title}\n\n{excerpt}...\n\n[Read More]({url})",
            "🎥 YouTube": f"Title: {title}\n\nDescription:\n{excerpt}...\n\nBlog: {url}"
        }
        
        for platform, snippet in platforms.items():
            # Platform frame
            frame = tk.Frame(scrollable_frame, bg=self.colors["bg_secondary"], relief="flat")
            frame.pack(fill="x", padx=12, pady=8)
            
            # Platform label
            tk.Label(
                frame,
                text=platform,
                font=("Segoe UI", 10, "bold"),
                bg=self.colors["bg_secondary"],
                fg=self.colors["accent"]
            ).pack(anchor="w", padx=12, pady=(8, 4))
            
            # Snippet text
            snippet_text = tk.Text(
                frame,
                font=("Consolas", 9),
                bg=self.colors["bg_primary"],
                fg=self.colors["text_primary"],
                relief="flat",
                bd=0,
                height=4,
                wrap="word"
            )
            snippet_text.pack(fill="both", padx=12, pady=(0, 8))
            snippet_text.insert("1.0", snippet)
            snippet_text.config(state="disabled")
            
            # Copy button
            copy_btn = tk.Button(
                frame,
                text="📋 Copy",
                font=("Segoe UI", 8, "bold"),
                bg=self.colors["accent"],
                fg="white",
                relief="flat",
                padx=8,
                pady=4,
                command=lambda s=snippet: self.copy_to_clipboard(s, dialog)
            )
            copy_btn.pack(anchor="e", padx=12, pady=(0, 8))
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def copy_to_clipboard(self, text, dialog=None):
        """Copy text to clipboard"""
        try:
            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            self.root.update()
            if dialog:
                messagebox.showinfo("Success", "Copied to clipboard!")
        except Exception as e:
            messagebox.showerror("Error", f"Copy failed: {str(e)}")
    
    def show_revision_timeline(self):
        """Show git revision history/timeline (Tier 3)"""
        try:
            # Get git log for current file
            if not self.current_file:
                messagebox.showinfo("Info", "No post loaded yet. Save a draft first.")
                return
            
            result = subprocess.run(
                ["git", "log", "--oneline", "--", self.current_file],
                capture_output=True,
                text=True,
                cwd=self.repo_path
            )
            
            if result.returncode != 0:
                messagebox.showinfo("No History", "This post hasn't been committed yet.")
                return
            
            commits = result.stdout.strip().split('\n')
            
            dialog = tk.Toplevel(self.root)
            dialog.title("⏰ Revision Timeline")
            dialog.geometry("600x450")
            dialog.configure(bg=self.colors["bg_primary"])
            
            # Header
            header = tk.Frame(dialog, bg=self.colors["bg_secondary"])
            header.pack(fill="x", padx=16, pady=(16, 12))
            
            tk.Label(
                header,
                text="⏰ Revision Timeline",
                font=("Segoe UI", 12, "bold"),
                bg=self.colors["bg_secondary"],
                fg=self.colors["text_primary"]
            ).pack(anchor="w")
            
            tk.Label(
                header,
                text=f"Git history for this post ({len(commits)} revisions)",
                font=("Segoe UI", 9),
                bg=self.colors["bg_secondary"],
                fg=self.colors["text_hint"]
            ).pack(anchor="w", pady=(4, 0))
            
            # Scrollable commits
            canvas = tk.Canvas(dialog, bg=self.colors["bg_primary"], highlightthickness=0, bd=0)
            scrollbar = ttk.Scrollbar(dialog, orient="vertical", command=canvas.yview)
            scrollable_frame = tk.Frame(canvas, bg=self.colors["bg_primary"])
            
            scrollable_frame.bind(
                "<Configure>",
                lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
            )
            
            canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
            canvas.configure(yscrollcommand=scrollbar.set)
            
            # Add commits
            for i, commit in enumerate(commits[:20]):  # Show last 20
                parts = commit.split(' ', 1)
                commit_hash = parts[0]
                message = parts[1] if len(parts) > 1 else "No message"
                
                frame = tk.Frame(scrollable_frame, bg=self.colors["bg_secondary"], relief="flat")
                frame.pack(fill="x", padx=12, pady=4)
                
                # Commit info
                info_frame = tk.Frame(frame, bg=self.colors["bg_secondary"])
                info_frame.pack(fill="x", padx=12, pady=8)
                
                tk.Label(
                    info_frame,
                    text=f"#{i+1} {commit_hash}",
                    font=("Segoe UI", 9, "bold"),
                    bg=self.colors["bg_secondary"],
                    fg=self.colors["accent"]
                ).pack(anchor="w", side="left")
                
                tk.Label(
                    info_frame,
                    text=message,
                    font=("Segoe UI", 9),
                    bg=self.colors["bg_secondary"],
                    fg=self.colors["text_primary"]
                ).pack(anchor="w", side="left", padx=(8, 0))
                
                # Diff button
                diff_btn = tk.Button(
                    frame,
                    text="📊 View Diff",
                    font=("Segoe UI", 8, "bold"),
                    bg=self.colors["accent_light"],
                    fg="white",
                    relief="flat",
                    padx=8,
                    pady=4,
                    command=lambda ch=commit_hash, msg=message: self.show_commit_diff(ch, msg)
                )
                diff_btn.pack(anchor="e", padx=12, pady=(0, 8))
            
            canvas.pack(side="left", fill="both", expand=True)
            scrollbar.pack(side="right", fill="y")
        
        except Exception as e:
            messagebox.showerror("Error", f"Failed to get revisions: {str(e)}")
    
    def show_commit_diff(self, commit_hash, message):
        """Show diff for a specific commit"""
        try:
            result = subprocess.run(
                ["git", "show", commit_hash],
                capture_output=True,
                text=True,
                cwd=self.repo_path
            )
            
            if result.returncode != 0:
                messagebox.showerror("Error", "Could not retrieve commit diff")
                return
            
            diff_dialog = tk.Toplevel(self.root)
            diff_dialog.title(f"Diff: {commit_hash}")
            diff_dialog.geometry("700x500")
            diff_dialog.configure(bg=self.colors["bg_primary"])
            
            # Header
            header = tk.Frame(diff_dialog, bg=self.colors["bg_secondary"])
            header.pack(fill="x", padx=16, pady=(16, 12))
            
            tk.Label(
                header,
                text=f"📊 Commit: {message}",
                font=("Segoe UI", 11, "bold"),
                bg=self.colors["bg_secondary"],
                fg=self.colors["text_primary"]
            ).pack(anchor="w")
            
            # Diff viewer
            diff_text = scrolledtext.ScrolledText(
                diff_dialog,
                font=("Consolas", 9),
                bg=self.colors["bg_primary"],
                fg=self.colors["text_primary"],
                relief="flat",
                bd=0
            )
            diff_text.pack(fill="both", expand=True, padx=16, pady=12)
            diff_text.insert("1.0", result.stdout)
            diff_text.config(state="disabled")
        
        except Exception as e:
            messagebox.showerror("Error", f"Failed to show diff: {str(e)}")
    
    def show_link_recommender(self):
        """Suggest internal links based on keyword matching (Tier 3)"""
        content = self.content_var.get("1.0", "end-1c")
        title = self.title_var.get()
        
        if not content or not title:
            messagebox.showinfo("Info", "Need both title and content to find link opportunities")
            return
        
        # Extract keywords from title (words > 3 chars)
        keywords = [w.lower() for w in title.split() if len(w) > 3]
        
        # Scan content for natural linking opportunities
        lines = content.split('\n')
        link_opportunities = []
        
        for i, line in enumerate(lines, 1):
            for keyword in keywords:
                if keyword in line.lower() and '[' not in line and ']' not in line:
                    # Found a keyword that's not already linked
                    if len(line) > 10:  # Meaningful context
                        link_opportunities.append({
                            'line': i,
                            'keyword': keyword,
                            'text': line.strip()[:60] + '...' if len(line) > 60 else line.strip()
                        })
        
        dialog = tk.Toplevel(self.root)
        dialog.title("🔗 Internal Link Recommender")
        dialog.geometry("600x450")
        dialog.configure(bg=self.colors["bg_primary"])
        
        # Header
        header = tk.Frame(dialog, bg=self.colors["bg_secondary"])
        header.pack(fill="x", padx=16, pady=(16, 12))
        
        tk.Label(
            header,
            text="🔗 Internal Link Opportunities",
            font=("Segoe UI", 12, "bold"),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w")
        
        if not link_opportunities:
            tk.Label(
                header,
                text="No keyword matches found. Keywords are auto-extracted from your title.",
                font=("Segoe UI", 9),
                bg=self.colors["bg_secondary"],
                fg=self.colors["text_hint"]
            ).pack(anchor="w", pady=(4, 0))
            return
        
        tk.Label(
            header,
            text=f"Found {len(link_opportunities)} places to add links",
            font=("Segoe UI", 9),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_hint"]
        ).pack(anchor="w", pady=(4, 0))
        
        # Scrollable opportunities
        canvas = tk.Canvas(dialog, bg=self.colors["bg_primary"], highlightthickness=0, bd=0)
        scrollbar = ttk.Scrollbar(dialog, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors["bg_primary"])
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Add opportunities
        for opp in link_opportunities[:15]:
            frame = tk.Frame(scrollable_frame, bg=self.colors["bg_secondary"], relief="flat")
            frame.pack(fill="x", padx=12, pady=8)
            
            # Keyword and line info
            info_frame = tk.Frame(frame, bg=self.colors["bg_secondary"])
            info_frame.pack(fill="x", padx=12, pady=(8, 4))
            
            tk.Label(
                info_frame,
                text=f"📍 Line {opp['line']}: \"{opp['keyword']}\"",
                font=("Segoe UI", 9, "bold"),
                bg=self.colors["bg_secondary"],
                fg=self.colors["accent"]
            ).pack(anchor="w", side="left")
            
            # Context
            tk.Label(
                frame,
                text=f"Context: {opp['text']}",
                font=("Segoe UI", 8),
                bg=self.colors["bg_secondary"],
                fg=self.colors["text_secondary"],
                wraplength=400,
                justify="left"
            ).pack(anchor="w", padx=12, pady=(0, 4))
            
            # Action button
            btn_frame = tk.Frame(frame, bg=self.colors["bg_secondary"])
            btn_frame.pack(fill="x", padx=12, pady=(0, 8))
            
            tk.Button(
                btn_frame,
                text="🔗 Add Link",
                font=("Segoe UI", 8, "bold"),
                bg=self.colors["accent_light"],
                fg="white",
                relief="flat",
                padx=8,
                pady=4,
                command=lambda ln=opp['line'], kw=opp['keyword']: self.add_suggested_link(ln, kw, dialog)
            ).pack(anchor="e")
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def add_suggested_link(self, line_num, keyword, dialog):
        """Add a suggested internal link"""
        # Create link dialog
        link_dialog = tk.Toplevel(dialog)
        link_dialog.title("Add Link")
        link_dialog.geometry("400x200")
        link_dialog.configure(bg=self.colors["bg_primary"])
        
        # URL input
        tk.Label(
            link_dialog,
            text="Link URL:",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w", padx=16, pady=(16, 8))
        
        url_var = tk.StringVar(value=f"/blog/{keyword.lower().replace(' ', '-')}")
        url_entry = tk.Entry(
            link_dialog,
            textvariable=url_var,
            font=("Segoe UI", 10),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"],
            relief="flat",
            bd=0
        )
        url_entry.pack(fill="x", padx=16, ipady=10)
        url_entry.config(highlightthickness=1, highlightbackground=self.colors["border"], highlightcolor=self.colors["focus"])
        
        # Link text input
        tk.Label(
            link_dialog,
            text="Link Text:",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["bg_primary"],
            fg=self.colors["text_primary"]
        ).pack(anchor="w", padx=16, pady=(12, 8))
        
        text_var = tk.StringVar(value=keyword)
        text_entry = tk.Entry(
            link_dialog,
            textvariable=text_var,
            font=("Segoe UI", 10),
            bg=self.colors["bg_secondary"],
            fg=self.colors["text_primary"],
            relief="flat",
            bd=0
        )
        text_entry.pack(fill="x", padx=16, ipady=10)
        text_entry.config(highlightthickness=1, highlightbackground=self.colors["border"], highlightcolor=self.colors["focus"])
        
        # Insert button
        def insert_link():
            url = url_var.get()
            text = text_var.get()
            markdown_link = f"[{text}]({url})"
            
            # Find and replace first occurrence of keyword on that line
            content = self.content_var.get("1.0", "end-1c")
            lines = content.split('\n')
            
            if line_num - 1 < len(lines):
                line = lines[line_num - 1]
                # Replace first occurrence of keyword
                import re
                new_line = re.sub(rf'\b{re.escape(keyword)}\b', markdown_link, line, count=1, flags=re.IGNORECASE)
                lines[line_num - 1] = new_line
                
                # Update content
                self.content_var.delete("1.0", "end")
                self.content_var.insert("1.0", '\n'.join(lines))
                self.update_preview()
                link_dialog.destroy()
                dialog.destroy()
                messagebox.showinfo("Success", f"Link added to line {line_num}")
        
        tk.Button(
            link_dialog,
            text="✅ Add Link",
            font=("Segoe UI", 10, "bold"),
            bg=self.colors["success"],
            fg="white",
            relief="flat",
            padx=16,
            pady=10,
            command=insert_link
        ).pack(anchor="e", padx=16, pady=12)

    
    
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
    
    def insert_snippet(self, snippet_name):
        """Insert a markdown snippet at cursor position"""
        if snippet_name not in self.snippets:
            return
        
        try:
            snippet = self.snippets[snippet_name]
            pos = self.content_var.index("insert")
            self.content_var.insert(pos, snippet + "\n")
            self.update_preview()
            self.update_word_count()
            self.autosave_status.set(f"📋 Inserted: {snippet_name}")
            self.root.after(1500, lambda: self.autosave_status.set(""))
        except:
            pass
    
    def start_autosave_timer(self):
        """Start periodic auto-save of drafts"""
        def autosave():
            try:
                if self.title_var.get():
                    # Auto-save draft periodically
                    if self.autosave_timer:
                        self.root.after_cancel(self.autosave_timer)
                    self.autosave_timer = self.root.after(60000, autosave)  # Every 60 seconds
                    
                    # Quick auto-save without showing message
                    drafts_path = os.path.join(self.repo_path, "_drafts") if self.repo_path else os.path.expanduser("~/blog-drafts")
                    os.makedirs(drafts_path, exist_ok=True)
                    
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
                    
                    # Build frontmatter
                    fm_lines = [
                        "---",
                        "layout: post",
                        f'title: "{self.title_var.get()}"',
                        f"date: {date} {time}",
                        f"categories: [{', '.join(categories)}]",
                        f"tags: [{', '.join(self.tags_list)}]",
                        "author: Martin Li",
                        f"read_time: {read_time}",
                        f'description: "{description}"',
                        f"image: {image}",
                        "---",
                        "",
                        content
                    ]
                    draft_content = "\n".join(fm_lines)
                    
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(draft_content)
                    
                    self.last_autosave_path = filepath
            except:
                pass
        
        autosave()
    
    def insert_inline_code(self):
        """Insert inline code formatting"""
        try:
            if self.content_var.tag_ranges("sel"):
                self.wrap_selection("`", "`")
            else:
                pos = self.content_var.index("insert")
                self.content_var.insert(pos, "`code`")
                self.content_var.mark_set("insert", f"{pos}+1c")
            self.update_preview()
        except:
            pass
    
    def add_syntax_highlight_tags(self):
        """Configure syntax highlighting tags for editor preview"""
        # These would be applied in update_preview for live syntax highlighting
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
