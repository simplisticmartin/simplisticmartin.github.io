/**
 * MODERN PARTICLE ANIMATION v2.0
 * Enhanced particle system with multiple effects
 */

class ParticleSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 80; // More particles
    this.connectionDistance = 120;
    this.mouse = { x: null, y: null, radius: 200 };
    this.hue = 160; // Teal color base
    this.isMouseDown = false;
    this.clickParticles = [];
    this.time = 0;
    
    // Color palette (teal theme)
    this.colors = [
      { r: 85, g: 214, b: 170 },   // Primary teal
      { r: 87, g: 173, b: 104 },   // Green
      { r: 20, g: 184, b: 166 },   // Accent teal
      { r: 110, g: 224, b: 184 },  // Light teal
      { r: 59, g: 130, b: 246 },   // Blue accent
    ];
    
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
  
  getRandomColor() {
    return this.colors[Math.floor(Math.random() * this.colors.length)];
  }
  
  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      const color = this.getRandomColor();
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 3 + 1,
        baseRadius: Math.random() * 3 + 1,
        color: color,
        alpha: Math.random() * 0.5 + 0.3,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseOffset: Math.random() * Math.PI * 2,
        glowing: Math.random() > 0.8 // 20% of particles glow
      });
    }
  }
  
  createClickBurst(x, y) {
    const burstCount = 15;
    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 / burstCount) * i;
      const speed = Math.random() * 4 + 2;
      const color = this.getRandomColor();
      this.clickParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 2,
        color: color,
        alpha: 1,
        life: 1,
        decay: Math.random() * 0.02 + 0.02
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
    
    this.canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      const rect = this.canvas.getBoundingClientRect();
      this.createClickBurst(e.clientX - rect.left, e.clientY - rect.top);
    });
    
    this.canvas.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });
    
    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.mouse.x = touch.clientX - rect.left;
      this.mouse.y = touch.clientY - rect.top;
      this.createClickBurst(this.mouse.x, this.mouse.y);
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.mouse.x = touch.clientX - rect.left;
      this.mouse.y = touch.clientY - rect.top;
    });
    
    this.canvas.addEventListener('touchend', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }
  
  drawParticle(particle) {
    const { x, y, radius, color, alpha, glowing } = particle;
    
    // Glow effect for special particles
    if (glowing) {
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius * 4, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }
    
    // Main particle
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    this.ctx.fill();
  }
  
  drawConnection(p1, p2, distance) {
    const opacity = (1 - (distance / this.connectionDistance)) * 0.4;
    
    // Gradient connection line
    const gradient = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
    gradient.addColorStop(0, `rgba(${p1.color.r}, ${p1.color.g}, ${p1.color.b}, ${opacity})`);
    gradient.addColorStop(1, `rgba(${p2.color.r}, ${p2.color.g}, ${p2.color.b}, ${opacity})`);
    
    this.ctx.beginPath();
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = Math.max(0.5, 2 * (1 - distance / this.connectionDistance));
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p2.x, p2.y);
    this.ctx.stroke();
  }
  
  drawMouseConnection(particle, distance) {
    const opacity = (1 - (distance / this.mouse.radius)) * 0.6;
    const { color } = particle;
    
    this.ctx.beginPath();
    this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
    this.ctx.lineWidth = 1.5;
    this.ctx.moveTo(particle.x, particle.y);
    this.ctx.lineTo(this.mouse.x, this.mouse.y);
    this.ctx.stroke();
  }
  
  updateParticle(particle) {
    // Pulsing radius effect
    particle.radius = particle.baseRadius + Math.sin(this.time * particle.pulseSpeed + particle.pulseOffset) * 0.5;
    
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;
    
    // Wrap around edges (smoother than bouncing)
    if (particle.x < -10) particle.x = this.canvas.width + 10;
    if (particle.x > this.canvas.width + 10) particle.x = -10;
    if (particle.y < -10) particle.y = this.canvas.height + 10;
    if (particle.y > this.canvas.height + 10) particle.y = -10;
    
    // Mouse interaction - attraction when holding, repulsion otherwise
    if (this.mouse.x !== null && this.mouse.y !== null) {
      const dx = this.mouse.x - particle.x;
      const dy = this.mouse.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.mouse.radius) {
        const force = (this.mouse.radius - distance) / this.mouse.radius;
        const angle = Math.atan2(dy, dx);
        
        if (this.isMouseDown) {
          // Attract when mouse is down
          particle.vx += Math.cos(angle) * force * 0.15;
          particle.vy += Math.sin(angle) * force * 0.15;
        } else {
          // Gentle repulsion when hovering
          particle.vx -= Math.cos(angle) * force * 0.08;
          particle.vy -= Math.sin(angle) * force * 0.08;
        }
        
        // Increase alpha near mouse
        particle.alpha = Math.min(1, particle.alpha + 0.02);
      } else {
        particle.alpha = Math.max(0.3, particle.alpha - 0.01);
      }
    }
    
    // Speed limit
    const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
    if (speed > 2) {
      particle.vx = (particle.vx / speed) * 2;
      particle.vy = (particle.vy / speed) * 2;
    }
    
    // Damping
    particle.vx *= 0.99;
    particle.vy *= 0.99;
    
    // Add slight random movement
    particle.vx += (Math.random() - 0.5) * 0.02;
    particle.vy += (Math.random() - 0.5) * 0.02;
  }
  
  updateClickParticles() {
    for (let i = this.clickParticles.length - 1; i >= 0; i--) {
      const p = this.clickParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.alpha = p.life;
      p.radius *= 0.98;
      p.vy += 0.05; // Gravity
      
      if (p.life <= 0) {
        this.clickParticles.splice(i, 1);
      }
    }
  }
  
  drawClickParticles() {
    this.clickParticles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
      this.ctx.fill();
    });
  }
  
  animate() {
    this.time++;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw connections first (behind particles)
    for (let i = 0; i < this.particles.length; i++) {
      // Connect to other particles
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.connectionDistance) {
          this.drawConnection(this.particles[i], this.particles[j], distance);
        }
      }
      
      // Connect to mouse
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = this.mouse.x - this.particles[i].x;
        const dy = this.mouse.y - this.particles[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.mouse.radius) {
          this.drawMouseConnection(this.particles[i], distance);
        }
      }
    }
    
    // Update and draw particles
    this.particles.forEach(particle => {
      this.updateParticle(particle);
      this.drawParticle(particle);
    });
    
    // Update and draw click particles
    this.updateClickParticles();
    this.drawClickParticles();
    
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
    canvas.style.cursor = 'crosshair';
    background.appendChild(canvas);
    
    // Initialize particle system
    new ParticleSystem('particlesCanvas');
  }
});
