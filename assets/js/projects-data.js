/**
 * PROJECTS DATA
 * Portfolio projects with metadata
 */

const projects = [
  {
    title: "Massive Multiplayer Game",
    description: "A real-time multiplayer game built with modern web technologies. Features include real-time synchronization, player interactions, and dynamic game mechanics.",
    image: "/img/project-icons/game-icon.png",
    tags: ["JavaScript", "WebSocket", "Node.js", "Real-time"],
    github: null,
    demo: null,
    featured: true
  },
  {
    title: "Clearsyn",
    description: "An innovative application designed to streamline communication and collaboration. Built with a focus on user experience and performance.",
    image: "/img/project-icons/clearsyn-icon.png",
    tags: ["Web Development", "UI/UX", "Full-Stack"],
    github: null,
    demo: null,
    featured: true
  },
  {
    title: "Portfolio Website",
    description: "A modern, responsive portfolio and blog built with Jekyll and GitHub Pages. Features include smooth animations, dark mode support, and optimized performance.",
    image: "/img/screenshots/portfolio-screenshot.png",
    tags: ["Jekyll", "HTML", "CSS", "JavaScript"],
    github: "https://github.com/simplisticmartin/simplisticmartin.github.io",
    demo: "https://simplisticmartin.github.io",
    featured: true
  },
  {
    title: "Data Science Projects",
    description: "Collection of data analysis and machine learning projects. Includes data visualization, predictive modeling, and statistical analysis.",
    image: "/img/project-icons/data-icon.png",
    tags: ["Python", "Data Science", "Machine Learning", "Analytics"],
    github: "https://github.com/simplisticmartin",
    demo: null,
    featured: false
  },
  {
    title: "Sandwich Game",
    description: "An interactive web game with engaging gameplay and smooth animations. Built as a fun project to explore game development on the web.",
    image: "/img/project-icons/game-icon.png",
    tags: ["JavaScript", "HTML5", "Game Development"],
    github: null,
    demo: "/Projects/Sandwich-Game/",
    featured: false
  },
  {
    title: "Quote Generator",
    description: "A beautiful quote generator with daily inspirational quotes. Features smooth transitions and social sharing capabilities.",
    image: "/img/project-icons/quote-icon.png",
    tags: ["JavaScript", "API", "Responsive Design"],
    github: null,
    demo: "/Projects/QuoteGenerator/",
    featured: false
  }
];

/**
 * Render projects to the DOM
 */
function renderProjects() {
  const projectsGrid = document.getElementById('projectsGrid');
  if (!projectsGrid) return;
  
  // Filter featured projects or show all
  const displayProjects = projects.filter(p => p.featured) || projects;
  
  projectsGrid.innerHTML = displayProjects.map(project => `
    <article class="project-card">
      <div class="project-image-container">
        <img src="${project.image}" 
             alt="${project.title}" 
             class="project-image"
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22%3E%3Crect fill=%22%236366f1%22 width=%22400%22 height=%22200%22/%3E%3Ctext fill=%22white%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2224%22%3E${project.title}%3C/text%3E%3C/svg%3E'">
      </div>
      <div class="project-content">
        <h3 class="project-title">${project.title}</h3>
        <p class="project-description">${project.description}</p>
        <div class="project-tags">
          ${project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
        </div>
        <div class="project-links">
          ${project.github ? `
            <a href="${project.github}" target="_blank" rel="noopener" class="project-link">
              <i class="fab fa-github"></i> GitHub
            </a>
          ` : ''}
          ${project.demo ? `
            <a href="${project.demo}" target="_blank" rel="noopener" class="project-link">
              <i class="fas fa-external-link-alt"></i> Demo
            </a>
          ` : ''}
          ${!project.github && !project.demo ? `
            <span class="project-link" style="opacity: 0.5; cursor: default;">
              <i class="fas fa-lock"></i> Private
            </span>
          ` : ''}
        </div>
      </div>
    </article>
  `).join('');
}

// Render projects when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderProjects);
} else {
  renderProjects();
}
