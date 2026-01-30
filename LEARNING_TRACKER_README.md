# 📚 Learning & Development Tracker

A professional learning progress tracker with CBT (Cognitive Behavioral Therapy) integration for tracking Coursera specializations and structured skill development.

## Features

### 🎓 Four Active Specializations
1. **Financial Engineering & Risk Management** (Columbia)
2. **Startup Entrepreneurship** (Technion)
3. **Investment & Portfolio Management** (University of Michigan)
4. **Dynamic Public Speaking** (University of Washington)

### 🧠 CBT Integration
- **Thought Tracking**: Breaking down courses into actionable steps
- **Behavior Activation**: Regular progress updates to maintain motivation
- **Cognitive Reframing**: Viewing challenges as learning opportunities
- **Progress Visualization**: Real-time metrics to reinforce positive habits

### 📊 Progress Tracking
- Real-time progress bars for each specialization
- Module-level course tracking
- Git-based progress history
- Automated commit & push workflow

## Quick Start

### View Progress Online
Visit [https://simplisticmartin.github.io/learning.html](https://simplisticmartin.github.io/learning.html)

### Update Progress

#### Method 1: Python CLI (Recommended)
```bash
# Update overall progress
python update_progress.py --spec speaking --progress 0.75

# Mark a course as completed
python update_progress.py --spec fe-risk --complete-course "Risk Management"
```

#### Method 2: Manual Edit
1. Edit `data/learning-progress.json`
2. Update progress values (0.0 to 1.0)
3. Mark courses as "completed" or "in-progress"
4. Commit and push:
```bash
git add data/learning-progress.json
git commit -m "Update: Learning progress - speaking 75%"
git push
```

#### Method 3: Web UI
Click the "Update" button on [learning.html](learning.html) and follow instructions

## Data Structure

```json
{
  "meta": {
    "last_updated": "2026-01-30",
    "updated_by": "martin"
  },
  "specializations": {
    "speaking": {
      "progress": 0.75,
      "completed_courses": 3,
      "total_courses": 4,
      "courses": {
        "1": {"name": "...", "status": "completed"}
      }
    }
  }
}
```

## Why Git-Based Tracking?

- **Audit Trail**: Every update is a commit with timestamp
- **Accountability**: Can see exactly when progress was made
- **Backup**: History protected in GitHub
- **Portable**: Works offline, syncs when connected
- **Gamification**: Pull requests can trigger achievements

## CBT Philosophy

This tracker uses evidence-based CBT principles:

1. **Measurable Goals** - Progress percentages create concrete targets
2. **Behavioral Activation** - Regular updates maintain momentum
3. **Thought Records** - Course modules break down cognitive overwhelm
4. **Progress Reinforcement** - Visual metrics boost self-efficacy
5. **Habit Formation** - Weekly updates create positive learning patterns

## File Structure

```
├── learning.html                 # Main learning tracker page
├── data/
│   └── learning-progress.json    # Progress data (git-tracked)
└── update_progress.py            # CLI tool for updates
```

## Statistics

- **4** Active Specializations
- **17** Total Courses
- **10** Courses Completed (58.8%)
- **Target**: 2026

## Next Steps

1. Complete Public Speaking Capstone (75% → 100%)
2. Finish Financial Engineering Risk Management course
3. Start Investment Portfolio Capstone
4. Complete Startup Entrepreneurship Fundraising module

---

**Philosophy**: Learning is not about credentials—it's about transformation. Every progress update is a commitment to becoming the person you're building toward.
