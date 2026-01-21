/**
 * MODERN PARTICLE ANIMATION
 * Lightweight particle system for hero background
 */

class ParticleSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 50;
    this.connectionDistance = 150;
    this.mouse = { x: null, y: null, radius: 150 };
    
    this.init();
    this.animate();
    this.setupEventListeners();
  }
  
  init() {
    this.resize();
    this.createParticles();
  }
  
  resize() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }
  
  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1
      });
    }
  }
  
  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.resize();
      this.createParticles();
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }
  
  drawParticle(particle) {
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(85, 214, 170, 0.6)';
    this.ctx.fill();
  }
  
  drawConnection(p1, p2, distance) {
    const opacity = 1 - (distance / this.connectionDistance);
    this.ctx.beginPath();
    this.ctx.strokeStyle = `rgba(85, 214, 170, ${opacity * 0.2})`;
    this.ctx.lineWidth = 1;
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p2.x, p2.y);
    this.ctx.stroke();
  }
  
  updateParticle(particle) {
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;
    
    // Bounce off walls
    if (particle.x < 0 || particle.x > this.canvas.width) {
      particle.vx *= -1;
      particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
    }
    if (particle.y < 0 || particle.y > this.canvas.height) {
      particle.vy *= -1;
      particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
    }
    
    // Mouse interaction
    if (this.mouse.x !== null && this.mouse.y !== null) {
      const dx = this.mouse.x - particle.x;
      const dy = this.mouse.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.mouse.radius) {
        const force = (this.mouse.radius - distance) / this.mouse.radius;
        const angle = Math.atan2(dy, dx);
        particle.vx -= Math.cos(angle) * force * 0.1;
        particle.vy -= Math.sin(angle) * force * 0.1;
      }
    }
    
    // Damping
    particle.vx *= 0.99;
    particle.vy *= 0.99;
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Update and draw particles
    this.particles.forEach(particle => {
      this.updateParticle(particle);
      this.drawParticle(particle);
    });
    
    // Draw connections
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.connectionDistance) {
          this.drawConnection(this.particles[i], this.particles[j], distance);
        }
      }
    }
    
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize particle system
document.addEventListener('DOMContentLoaded', () => {
  const background = document.getElementById('particlesBackground');
  if (background) {
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'particlesCanvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    background.appendChild(canvas);
    
    // Initialize particle system
    new ParticleSystem('particlesCanvas');
  }
});
