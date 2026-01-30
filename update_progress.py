#!/usr/bin/env python3
"""
Learning Progress Updater
A simple CLI tool to update your Coursera specialization progress via Git

Usage:
  python update_progress.py --spec speaking --progress 0.75
  python update_progress.py --spec fe-risk --complete-course "Risk Management"
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

PROGRESS_FILE = Path(__file__).parent / 'data' / 'learning-progress.json'

def load_progress():
    """Load the learning progress JSON file"""
    with open(PROGRESS_FILE, 'r') as f:
        return json.load(f)

def save_progress(data):
    """Save the learning progress JSON file"""
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def update_specialization_progress(spec_id, progress):
    """Update overall progress for a specialization"""
    data = load_progress()
    
    if spec_id not in data['specializations']:
        print(f"❌ Specialization '{spec_id}' not found")
        return False
    
    spec = data['specializations'][spec_id]
    spec['progress'] = progress
    
    # Auto-calculate completed courses
    completed = int(progress * spec['total_courses'])
    spec['completed_courses'] = completed
    
    data['meta']['last_updated'] = datetime.now().isoformat()
    save_progress(data)
    
    progress_percent = int(progress * 100)
    print(f"✅ Updated {spec['name']}: {progress_percent}%")
    
    return True

def complete_course(spec_id, course_name):
    """Mark a specific course as completed"""
    data = load_progress()
    
    if spec_id not in data['specializations']:
        print(f"❌ Specialization '{spec_id}' not found")
        return False
    
    spec = data['specializations'][spec_id]
    courses = spec['courses']
    
    # Find and mark course as completed
    found = False
    for course_id, course_info in courses.items():
        if course_name.lower() in course_info['name'].lower():
            if course_info['status'] != 'completed':
                course_info['status'] = 'completed'
                course_info['completed_date'] = datetime.now().strftime('%Y-%m-%d')
                found = True
                break
    
    if not found:
        print(f"❌ Course '{course_name}' not found in {spec['name']}")
        return False
    
    # Recalculate overall progress
    completed_count = sum(1 for c in courses.values() if c['status'] == 'completed')
    spec['completed_courses'] = completed_count
    spec['progress'] = completed_count / spec['total_courses']
    
    data['meta']['last_updated'] = datetime.now().isoformat()
    save_progress(data)
    
    print(f"✅ Completed: {course_name}")
    print(f"   {spec['name']}: {int(spec['progress'] * 100)}% complete")
    
    return True

def git_commit_and_push(message):
    """Commit and push the progress update"""
    try:
        subprocess.run(['git', 'add', 'data/learning-progress.json'], check=True)
        subprocess.run(['git', 'commit', '-m', f"Update: {message}"], check=True)
        subprocess.run(['git', 'push'], check=True)
        print("🚀 Pushed to GitHub!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Git error: {e}")
        return False

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    
    spec_id = None
    progress = None
    course_name = None
    
    # Parse arguments
    for i, arg in enumerate(sys.argv[1:]):
        if arg == '--spec' and i + 1 < len(sys.argv) - 1:
            spec_id = sys.argv[i + 2]
        elif arg == '--progress' and i + 1 < len(sys.argv) - 1:
            progress = float(sys.argv[i + 2])
        elif arg == '--complete-course' and i + 1 < len(sys.argv) - 1:
            course_name = sys.argv[i + 2]
    
    if not spec_id:
        print("❌ Missing --spec argument")
        sys.exit(1)
    
    # Execute update
    if progress is not None:
        success = update_specialization_progress(spec_id, progress)
        if success:
            message = f"Learning progress - {spec_id}: {int(progress * 100)}%"
            git_commit_and_push(message)
    
    elif course_name:
        success = complete_course(spec_id, course_name)
        if success:
            message = f"Completed course - {spec_id}: {course_name}"
            git_commit_and_push(message)
    
    else:
        print("❌ Provide either --progress or --complete-course")
        sys.exit(1)

if __name__ == '__main__':
    main()
