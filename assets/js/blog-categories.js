/**
 * BLOG CATEGORIES & FILTERING
 * Handles category filtering and post display
 */

// ==================== CATEGORY FILTERING ====================
document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const blogCards = document.querySelectorAll('.blog-card:not(.blog-card-placeholder)');
  const categoryCards = document.querySelectorAll('.category-card');
  
  // Count posts per category
  const categoryCounts = {};
  blogCards.forEach(card => {
    const categories = card.dataset.categories?.split(' ') || [];
    categories.forEach(cat => {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
  });
  
  // Update category counts
  Object.keys(categoryCounts).forEach(category => {
    const countEl = document.getElementById(`count-${category}`);
    if (countEl) {
      const count = categoryCounts[category];
      countEl.textContent = `${count} post${count !== 1 ? 's' : ''}`;
    }
  });
  
  // Filter button click handler
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      
      // Update active button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Filter blog cards
      blogCards.forEach(card => {
        const categories = card.dataset.categories?.split(' ') || [];
        
        if (filter === 'all' || categories.includes(filter)) {
          card.style.display = '';
          card.style.animation = 'fadeInUp 0.5s ease';
        } else {
          card.style.display = 'none';
        }
      });
      
      // Scroll to posts section
      document.getElementById('blogGrid').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    });
  });
  
  // Category card click handler
  categoryCards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const category = card.dataset.category;
      
      // Find and click corresponding filter button
      const filterBtn = document.querySelector(`.filter-btn[data-filter="${category}"]`);
      if (filterBtn) {
        filterBtn.click();
      }
    });
  });
  
  // Handle direct category links (from URL hash)
  if (window.location.hash) {
    const category = window.location.hash.substring(1);
    const filterBtn = document.querySelector(`.filter-btn[data-filter="${category}"]`);
    if (filterBtn) {
      setTimeout(() => filterBtn.click(), 500);
    }
  }
});

// ==================== CATEGORY METADATA ====================
const CATEGORY_INFO = {
  'career': {
    name: 'Career',
    icon: '💼',
    color: '#55d6aa',
    description: 'Software engineering career insights from JPMorgan Chase'
  },
  'ai': {
    name: 'AI & Machine Learning',
    icon: '🤖',
    color: '#57ad68',
    description: 'AI research and lessons from Georgia Tech'
  },
  'quant-finance': {
    name: 'Quant Finance',
    icon: '📈',
    color: '#14b8a6',
    description: 'Quantitative finance and algorithmic trading'
  },
  'learning': {
    name: 'Learning',
    icon: '📚',
    color: '#55d6aa',
    description: 'Study tips, course reviews, and learning journey'
  },
  'public-speaking': {
    name: 'Public Speaking',
    icon: '🎤',
    color: '#57ad68',
    description: 'Presentations and professional communication'
  },
  'youtube': {
    name: 'YouTube',
    icon: '🎥',
    color: '#14b8a6',
    description: 'Video content and tech tutorials'
  },
  'nonsense': {
    name: 'Nonsense',
    icon: '🎲',
    color: '#55d6aa',
    description: 'Random thoughts and fun stuff'
  }
};

console.log('📝 Blog categories loaded successfully!');
