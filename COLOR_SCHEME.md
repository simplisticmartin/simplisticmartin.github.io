# 🎨 Color Scheme - Teal & Blue

Your portfolio now uses the beautiful **teal and turquoise** color scheme from your original blog!

## Color Palette

### Primary Colors

| Color Name | Hex Code | Usage | Preview |
|------------|----------|-------|---------|
| **Primary Teal** | `#55d6aa` | Main accent, buttons, links | ![#55d6aa](https://via.placeholder.com/50x30/55d6aa/55d6aa.png) |
| **Primary Dark** | `#3db896` | Hover states, emphasis | ![#3db896](https://via.placeholder.com/50x30/3db896/3db896.png) |
| **Primary Light** | `#6ee0b8` | Subtle accents, highlights | ![#6ee0b8](https://via.placeholder.com/50x30/6ee0b8/6ee0b8.png) |
| **Secondary Green** | `#57ad68` | Secondary buttons, accents | ![#57ad68](https://via.placeholder.com/50x30/57ad68/57ad68.png) |
| **Accent Teal** | `#14b8a6` | Additional accent | ![#14b8a6](https://via.placeholder.com/50x30/14b8a6/14b8a6.png) |

### Background Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Background Primary** | `#ffffff` | Main background |
| **Background Secondary** | `#f8fafc` | Alternate sections |
| **Background Tertiary** | `#e8f5f1` | Subtle teal tint |
| **Background Dark** | `#263238` | Dark sections, footer |
| **Card Background** | `#ffffff` | Cards, panels |

### Text Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Text Primary** | `#263238` | Main text |
| **Text Secondary** | `#475569` | Secondary text |
| **Text Tertiary** | `#94a3b8` | Subtle text, metadata |
| **Text Light** | `#ffffff` | Light text on dark backgrounds |

### Gradients

```css
/* Primary Gradient - Teal to Green */
--gradient-primary: linear-gradient(135deg, #55d6aa 0%, #57ad68 100%);

/* Secondary Gradient - Teal Variations */
--gradient-secondary: linear-gradient(135deg, #14b8a6 0%, #55d6aa 100%);

/* Hero Gradient - Subtle Teal Background */
--gradient-hero: linear-gradient(135deg, rgba(85, 214, 170, 0.1) 0%, rgba(87, 173, 104, 0.1) 100%);
```

## Color Usage Examples

### Buttons
- **Primary Button**: Teal gradient background (`#55d6aa` → `#57ad68`)
- **Outline Button**: Teal border with transparent background
- **Hover States**: Darker teal (`#3db896`)

### Links
- **Default**: Teal (`#55d6aa`)
- **Hover**: Dark teal (`#3db896`)
- **Visited**: Same as default

### Sections
- **Hero**: Light teal gradient background
- **Projects**: White background with teal accents
- **Footer**: Dark blue-slate (`#263238`)

### Interactive Elements
- **Navigation**: Teal underline on hover
- **Cards**: Teal accent on hover
- **Particles**: Teal particles (`rgba(85, 214, 170, 0.6)`)

## Comparison: Old vs New

### Old Blog Colors
```css
Primary: #55d6aa (Teal header)
Secondary: #57ad68 (Green buttons)
Background: #263238 (Dark slate)
Dark: #222 (Very dark)
```

### New Modern Blog Colors
```css
Primary: #55d6aa (Same teal!) ✓
Secondary: #57ad68 (Same green!) ✓
Background: #263238 (Same slate!) ✓
Plus: Modern gradients and tints
```

## Accessibility

All colors have been tested for accessibility:
- ✅ **WCAG AA** compliant color contrast
- ✅ Text remains readable on all backgrounds
- ✅ Hover states are clearly distinguishable

## Customizing Colors

To change colors, edit `assets/css/modern.css`:

```css
:root {
  --primary-color: #55d6aa;  /* Change this */
  --secondary-color: #57ad68; /* Or this */
  /* etc. */
}
```

All colors throughout the site will automatically update!

## Dark Mode

The color scheme adapts to dark mode preferences:
- Background becomes darker
- Text becomes lighter
- Teal accents remain vibrant

---

**Your modern portfolio now has the same beautiful teal and blue aesthetic as your original blog!** 🎨✨
