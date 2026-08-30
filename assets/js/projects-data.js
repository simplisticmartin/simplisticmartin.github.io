/**
 * PROJECTS DATA
 * Portfolio projects with metadata
 */

const projects = [
  {
    title: "Gauntlet: an interview engine that grades its own grader",
    description: "A FastAPI and LangGraph platform that runs adaptive technical interviews. The hard part was never the LLM call, it was deciding what the model is allowed to judge: deterministic code computes the facts and enforces the constraints, and the model only handles genuine judgment. 21 REST endpoints, 194 automated tests, and a CI-gated benchmark that measures the grader's own accuracy.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%23279d7f' width='400' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold'%3E⚔️%3C/text%3E%3C/svg%3E",
    tags: ["Python", "FastAPI", "LangGraph", "PostgreSQL", "Redis", "React"],
    github: null,
    demo: null,
    featured: true
  },
  {
    title: "ClearSpeak: an AI speech coach that never phones home",
    description: "A mobile coach that listens while you practice and gives feedback in real time: filler words, pacing, progress over sessions. The LLM (llama.rn) and speech-to-text (whisper.rn) both run on the device, so the recording of you stumbling through a rehearsal never leaves your phone. Built and shipped solo.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%2355d6aa' width='400' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold'%3E🎤%3C/text%3E%3C/svg%3E",
    tags: ["React Native", "TypeScript", "Expo", "On-device LLM", "Zustand"],
    github: null,
    demo: null,
    featured: true
  },
  {
    title: "PressurePoint: accountability without the shame",
    description: "A local-first app for executive dysfunction, built on one idea: the hard part is starting, not finishing, so nothing in the app punishes a miss. The behavioral UX is grounded in the research, the accessibility targets WCAG AAA, and 155 assertions test the design rules themselves so a future refactor cannot quietly undo them.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%233db896' width='400' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold'%3E🎯%3C/text%3E%3C/svg%3E",
    tags: ["React Native", "Expo", "TypeScript", "Accessibility (AAA)", "Behavioral UX"],
    github: null,
    demo: null,
    featured: true
  },
  {
    title: "Randomized Optimization vs. Backpropagation",
    description: "A graduate study putting backpropagation head to head with genetic algorithms and MIMIC on heart-disease classification, reaching about 0.945 accuracy. The interesting result was not the winner but where each method stopped improving, and why.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%2314b8a6' width='400' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold'%3E🧠%3C/text%3E%3C/svg%3E",
    tags: ["Python", "scikit-learn", "Neural Networks", "Randomized Optimization"],
    github: null,
    demo: null,
    featured: true
  },
  {
    title: "Massive Multiplayer Game",
    description: "A real-time multiplayer game built with modern web technologies. Features include real-time synchronization, player interactions, and dynamic game mechanics.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%2355d6aa' width='400' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold'%3E🎮%3C/text%3E%3C/svg%3E",
    tags: ["JavaScript", "WebSocket", "Node.js", "Real-time"],
    github: null,
    demo: null,
    featured: false
  },
  {
    title: "Clearsyn",
    description: "A platform where users request custom web designs. Responsive front end in HTML5, CSS, JavaScript, and jQuery, with node.js-backed contact forms, deployed on Google Cloud Compute.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%2357ad68' width='400' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold'%3E💬%3C/text%3E%3C/svg%3E",
    tags: ["JavaScript", "jQuery", "Node.js", "Google Cloud"],
    github: null,
    demo: null,
    featured: false
  },
  {
    title: "This Site",
    description: "A Jekyll portfolio and blog on GitHub Pages, hand-built rather than themed. Dark mode, an interactive resume you scroll through like a side-scroller, and a deliberate effort to keep it fast on a phone. The source is public if you want to see how it is put together.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2355d6aa;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2357ad68;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23grad)' width='400' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold'%3E🌐%3C/text%3E%3C/svg%3E",
    tags: ["Jekyll", "HTML", "CSS", "JavaScript"],
    github: "https://github.com/simplisticmartin/simplisticmartin.github.io",
    demo: "https://simplisticmartin.github.io",
    featured: true
  },
  {
    title: "Data Science Projects",
    description: "Collection of data analysis and machine learning projects. Includes data visualization, predictive modeling, and statistical analysis.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%2314b8a6' width='400' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold'%3E📊%3C/text%3E%3C/svg%3E",
    tags: ["Python", "Data Science", "Machine Learning", "Analytics"],
    github: "https://github.com/simplisticmartin",
    demo: null,
    featured: false
  },
  {
    title: "Sandwich Game",
    description: "An interactive web game with engaging gameplay and smooth animations. Built as a fun project to explore game development on the web.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%2355d6aa' width='400' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold'%3E🥪%3C/text%3E%3C/svg%3E",
    tags: ["JavaScript", "HTML5", "Game Development"],
    github: null,
    demo: "/Projects/Sandwich-Game/",
    featured: false
  },
  {
    title: "Quote Generator",
    description: "A beautiful quote generator with daily inspirational quotes. Features smooth transitions and social sharing capabilities.",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%2357ad68' width='400' height='200'/%3E%3Ctext fill='white' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' font-weight='bold'%3E💭%3C/text%3E%3C/svg%3E",
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
