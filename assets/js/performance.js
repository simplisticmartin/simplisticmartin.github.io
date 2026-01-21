/**
 * PERFORMANCE OPTIMIZATIONS
 * Scripts for improving site performance
 */

// ==================== LAZY LOADING IMAGES ====================
document.addEventListener('DOMContentLoaded', () => {
  // Check if browser supports Intersection Observer
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        }
      });
    });

    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
});

// ==================== PREFETCH LINKS ====================
// Prefetch links on hover for faster navigation
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a[href^="/"]');
  
  links.forEach(link => {
    link.addEventListener('mouseenter', function() {
      const href = this.getAttribute('href');
      if (href && !href.startsWith('#')) {
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = href;
        document.head.appendChild(prefetchLink);
      }
    }, { once: true });
  });
});

// ==================== CRITICAL CSS ====================
// Load non-critical CSS asynchronously
function loadCSS(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = function() {
    this.media = 'all';
  };
  document.head.appendChild(link);
}

// ==================== WEB VITALS TRACKING ====================
// Track Core Web Vitals for performance monitoring
function sendToAnalytics(metric) {
  if (typeof gtag !== 'undefined') {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true
    });
  }
}

// ==================== RESOURCE HINTS ====================
// Add resource hints for better performance
function addResourceHints() {
  const hints = [
    { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
    { rel: 'dns-prefetch', href: 'https://cdnjs.cloudflare.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true }
  ];

  hints.forEach(hint => {
    const link = document.createElement('link');
    link.rel = hint.rel;
    link.href = hint.href;
    if (hint.crossorigin) link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addResourceHints);
} else {
  addResourceHints();
}

// ==================== OFFLINE DETECTION ====================
// Detect when user goes offline
window.addEventListener('offline', () => {
  console.log('You are offline. Some features may not be available.');
  // Show offline notification if desired
});

window.addEventListener('online', () => {
  console.log('You are back online!');
  // Hide offline notification if shown
});

// ==================== SCROLL PERFORMANCE ====================
// Optimize scroll event listeners
let ticking = false;

function onScroll() {
  // Scroll-related updates here
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(onScroll);
    ticking = true;
  }
}, { passive: true });

// ==================== REDUCE MOTION ====================
// Respect user's motion preferences
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (prefersReducedMotion.matches) {
  // Disable animations for users who prefer reduced motion
  document.documentElement.style.setProperty('--transition-fast', '0ms');
  document.documentElement.style.setProperty('--transition-base', '0ms');
  document.documentElement.style.setProperty('--transition-slow', '0ms');
}

// ==================== CONSOLE PERFORMANCE TIP ====================
console.log('%c⚡ Performance Tips', 'color: #6366f1; font-size: 16px; font-weight: bold;');
console.log('Site optimized with:');
console.log('✓ Lazy loading images');
console.log('✓ Link prefetching');
console.log('✓ Optimized scroll handling');
console.log('✓ Reduced motion support');
