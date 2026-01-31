/**
 * MODERN PORTFOLIO & BLOG - JAVASCRIPT
 * Interactive features and animations
 */

// ==================== NAVIGATION ====================
const navbar = document.getElementById('navbar');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.getElementById('navLinks');

// Navbar scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;
  
  if (currentScroll > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  
  lastScroll = currentScroll;
});

// Mobile menu toggle
if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    const icon = mobileMenuToggle.querySelector('i');
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-times');
  });

  // Close menu when clicking on a link
  const navLinkItems = navLinks.querySelectorAll('a');
  navLinkItems.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      const icon = mobileMenuToggle.querySelector('i');
      icon.classList.add('fa-bars');
      icon.classList.remove('fa-times');
    });
  });
}

// ==================== SMOOTH SCROLLING ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    
    e.preventDefault();
    const target = document.querySelector(href);
    
    if (target) {
      const offsetTop = target.offsetTop - 80; // Account for fixed navbar
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  });
});

// ==================== SCROLL ANIMATIONS ====================
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe all cards and sections for animation
document.addEventListener('DOMContentLoaded', () => {
  const animateElements = document.querySelectorAll('.project-card, .blog-card, .section');
  
  animateElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
});

// ==================== COPY TO CLIPBOARD ====================
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Copied to clipboard!');
  });
}

// ==================== NOTIFICATION SYSTEM ====================
function showNotification(message, duration = 3000) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--primary-color);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: 9999;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ==================== PERFORMANCE OPTIMIZATIONS ====================
// Lazy load images
if ('loading' in HTMLImageElement.prototype) {
  const images = document.querySelectorAll('img[loading="lazy"]');
  images.forEach(img => {
    img.src = img.dataset.src;
  });
} else {
  // Fallback for browsers that don't support lazy loading
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
  document.body.appendChild(script);
}

// ==================== THEME TOGGLE ====================
function initThemeToggle() {
  // Check for saved theme preference or default to system preference
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // Add a subtle animation effect
  document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  
  // Track theme change
  trackEvent('Theme', 'Toggle', newTheme);
  
  // Show feedback
  showNotification(`${newTheme === 'dark' ? '🌙' : '☀️'} ${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`);
}

// Initialize theme on page load
initThemeToggle();

// Set up theme toggle button
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-switch if user hasn't manually set a preference
    if (!localStorage.getItem('theme')) {
      const theme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
    }
  });
});

// ==================== UTILITY FUNCTIONS ====================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ==================== ANALYTICS (Optional) ====================
function trackEvent(category, action, label) {
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      'event_category': category,
      'event_label': label
    });
  }
}

// Track external link clicks
document.querySelectorAll('a[target="_blank"]').forEach(link => {
  link.addEventListener('click', () => {
    trackEvent('External Link', 'Click', link.href);
  });
});

// ==================== PAGE LOADER ====================
function initPageLoader() {
  const loader = document.querySelector('.page-loader');
  if (loader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        loader.classList.add('hidden');
      }, 500);
    });
  }
}
initPageLoader();

// ==================== CURSOR TRAILER ====================
function initCursorTrailer() {
  // Only on desktop
  if (window.innerWidth < 768) return;
  
  const trailer = document.createElement('div');
  trailer.className = 'cursor-trailer';
  document.body.appendChild(trailer);
  
  let mouseX = 0, mouseY = 0;
  let trailerX = 0, trailerY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  
  // Interactive elements make cursor bigger
  document.querySelectorAll('a, button, .project-card, .skill-item, .blog-card').forEach(el => {
    el.addEventListener('mouseenter', () => trailer.classList.add('active'));
    el.addEventListener('mouseleave', () => trailer.classList.remove('active'));
  });
  
  function animateTrailer() {
    trailerX += (mouseX - trailerX) * 0.15;
    trailerY += (mouseY - trailerY) * 0.15;
    
    trailer.style.left = trailerX + 'px';
    trailer.style.top = trailerY + 'px';
    
    requestAnimationFrame(animateTrailer);
  }
  animateTrailer();
}
initCursorTrailer();

// ==================== REVEAL ON SCROLL ====================
function initRevealAnimations() {
  const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children');
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  reveals.forEach(el => revealObserver.observe(el));
}
initRevealAnimations();

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'success', duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Make showToast globally available
window.showToast = showToast;

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
  // Press 'T' to toggle theme
  if (e.key === 't' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    toggleTheme();
  }
  
  // Press 'H' to go home
  if (e.key === 'h' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    window.location.href = '/';
  }
  
  // Press '?' to show shortcuts
  if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
    showToast('⌨️ Shortcuts: T = Toggle theme, H = Home', 'success', 4000);
  }
});

// ==================== SMOOTH PAGE TRANSITIONS ====================
function initPageTransitions() {
  // Add fade-in class to body
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.3s ease';
  
  window.addEventListener('load', () => {
    document.body.style.opacity = '1';
  });
  
  // Handle internal link clicks
  document.querySelectorAll('a[href^="/"], a[href^="./"]').forEach(link => {
    // Skip external links and anchor links
    if (link.target === '_blank' || link.getAttribute('href').startsWith('#')) return;
    
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      e.preventDefault();
      
      document.body.style.opacity = '0';
      setTimeout(() => {
        window.location.href = href;
      }, 300);
    });
  });
}
initPageTransitions();

// ==================== KONAMI CODE EASTER EGG ====================
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
  if (e.key === konamiCode[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === konamiCode.length) {
      // Easter egg activated!
      showToast('🎉 Konami Code Activated! You found the secret!', 'success', 5000);
      document.body.style.animation = 'rainbow 2s linear';
      setTimeout(() => {
        document.body.style.animation = '';
      }, 2000);
      konamiIndex = 0;
    }
  } else {
    konamiIndex = 0;
  }
});

// Add rainbow animation
const rainbowStyle = document.createElement('style');
rainbowStyle.textContent = `
  @keyframes rainbow {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }
`;
document.head.appendChild(rainbowStyle);

// ==================== READING PROGRESS (for blog posts) ====================
function initReadingProgress() {
  const progressBar = document.querySelector('.reading-progress');
  if (!progressBar) return;
  
  window.addEventListener('scroll', () => {
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    progressBar.style.width = scrolled + '%';
  });
}
initReadingProgress();

console.log('🚀 Modern Portfolio Loaded Successfully!');
console.log('💡 Tip: Press ? for keyboard shortcuts');
