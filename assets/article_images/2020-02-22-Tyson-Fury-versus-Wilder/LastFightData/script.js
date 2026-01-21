/**
 * FURY VS WILDER - STATISTICAL ANALYSIS
 * Interactive data visualization with Chart.js
 */

// Fight Data
const fightData = {
  rounds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  
  punchesLanded: {
    wilder: [4, 3, 4, 5, 6, 7, 7, 7, 13, 1, 3, 11],
    fury: [6, 5, 11, 7, 7, 9, 5, 8, 7, 10, 4, 5]
  },
  
  jabsLanded: {
    wilder: [1, 1, 2, 4, 5, 7, 5, 5, 4, 1, 1, 4],
    fury: [3, 3, 7, 4, 6, 8, 2, 5, 2, 2, 2, 2]
  },
  
  powerPunches: {
    wilder: [3, 2, 2, 1, 1, 0, 2, 2, 9, 0, 2, 7],
    fury: [3, 2, 4, 3, 1, 1, 3, 3, 5, 8, 2, 10]
  },
  
  totals: {
    wilder: {
      jabs: 40,
      power: 31,
      total: 71
    },
    fury: {
      jabs: 46,
      power: 38,
      total: 84
    }
  }
};

// Color scheme
const colors = {
  wilder: {
    primary: '#e74c3c',
    light: '#ff6b6b',
    gradient: 'rgba(231, 76, 60, 0.2)'
  },
  fury: {
    primary: '#3498db',
    light: '#5dade2',
    gradient: 'rgba(52, 152, 219, 0.2)'
  },
  teal: '#55d6aa',
  green: '#57ad68'
};

// Chart.js default configuration
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 13;
Chart.defaults.color = '#475569';

// Animate numbers on scroll
function animateValue(element, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const value = Math.floor(progress * (end - start) + start);
    element.textContent = value;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  createPunchesChart();
  createJabsChart();
  createPowerPunchesChart();
  createWilderDonut();
  createFuryDonut();
  animateStatCards();
  addScrollAnimations();
});

// Total Punches Landed Chart
function createPunchesChart() {
  const ctx = document.getElementById('punchesChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: fightData.rounds,
      datasets: [
        {
          label: 'Deontay Wilder',
          data: fightData.punchesLanded.wilder,
          backgroundColor: colors.wilder.gradient,
          borderColor: colors.wilder.primary,
          borderWidth: 2,
          borderRadius: 6,
          hoverBackgroundColor: colors.wilder.light
        },
        {
          label: 'Tyson Fury',
          data: fightData.punchesLanded.fury,
          backgroundColor: colors.fury.gradient,
          borderColor: colors.fury.primary,
          borderWidth: 2,
          borderRadius: 6,
          hoverBackgroundColor: colors.fury.light
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 14,
              weight: '600'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleFont: {
            size: 14,
            weight: '700'
          },
          bodyFont: {
            size: 13
          },
          padding: 12,
          borderColor: colors.teal,
          borderWidth: 1,
          callbacks: {
            title: (context) => `Round ${context[0].label}`,
            label: (context) => `${context.dataset.label}: ${context.parsed.y} punches`
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          title: {
            display: true,
            text: 'Round Number',
            font: {
              size: 14,
              weight: '600'
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          title: {
            display: true,
            text: 'Punches Landed',
            font: {
              size: 14,
              weight: '600'
            }
          },
          ticks: {
            stepSize: 2
          }
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeInOutQuart'
      }
    }
  });
}

// Jabs Landed Chart
function createJabsChart() {
  const ctx = document.getElementById('jabsChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: fightData.rounds,
      datasets: [
        {
          label: 'Deontay Wilder',
          data: fightData.jabsLanded.wilder,
          borderColor: colors.wilder.primary,
          backgroundColor: colors.wilder.gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: colors.wilder.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Tyson Fury',
          data: fightData.jabsLanded.fury,
          borderColor: colors.fury.primary,
          backgroundColor: colors.fury.gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: colors.fury.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 14,
              weight: '600'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleFont: {
            size: 14,
            weight: '700'
          },
          bodyFont: {
            size: 13
          },
          padding: 12,
          borderColor: colors.teal,
          borderWidth: 1,
          callbacks: {
            title: (context) => `Round ${context[0].label}`,
            label: (context) => `${context.dataset.label}: ${context.parsed.y} jabs`
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          title: {
            display: true,
            text: 'Round Number',
            font: {
              size: 14,
              weight: '600'
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          title: {
            display: true,
            text: 'Jabs Landed',
            font: {
              size: 14,
              weight: '600'
            }
          },
          ticks: {
            stepSize: 2
          }
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeInOutQuart',
        delay: 300
      }
    }
  });
}

// Power Punches Chart
function createPowerPunchesChart() {
  const ctx = document.getElementById('powerPunchesChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: fightData.rounds,
      datasets: [
        {
          label: 'Deontay Wilder',
          data: fightData.powerPunches.wilder,
          borderColor: colors.wilder.primary,
          backgroundColor: colors.wilder.gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: colors.wilder.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Tyson Fury',
          data: fightData.powerPunches.fury,
          borderColor: colors.fury.primary,
          backgroundColor: colors.fury.gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: colors.fury.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 14,
              weight: '600'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleFont: {
            size: 14,
            weight: '700'
          },
          bodyFont: {
            size: 13
          },
          padding: 12,
          borderColor: colors.teal,
          borderWidth: 1,
          callbacks: {
            title: (context) => `Round ${context[0].label}`,
            label: (context) => `${context.dataset.label}: ${context.parsed.y} power punches`
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          title: {
            display: true,
            text: 'Round Number',
            font: {
              size: 14,
              weight: '600'
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          title: {
            display: true,
            text: 'Power Punches Landed',
            font: {
              size: 14,
              weight: '600'
            }
          },
          ticks: {
            stepSize: 2
          }
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeInOutQuart',
        delay: 600
      }
    }
  });
}

// Wilder Donut Chart
function createWilderDonut() {
  const ctx = document.getElementById('wilderDonut').getContext('2d');
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Jabs', 'Power Punches'],
      datasets: [{
        data: [fightData.totals.wilder.jabs, fightData.totals.wilder.power],
        backgroundColor: [colors.wilder.primary, colors.wilder.light],
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            padding: 15,
            font: {
              size: 13,
              weight: '600'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          padding: 12,
          borderColor: colors.wilder.primary,
          borderWidth: 2,
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed;
              const total = fightData.totals.wilder.total;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 2000,
        delay: 900
      }
    }
  });
}

// Fury Donut Chart
function createFuryDonut() {
  const ctx = document.getElementById('furyDonut').getContext('2d');
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Jabs', 'Power Punches'],
      datasets: [{
        data: [fightData.totals.fury.jabs, fightData.totals.fury.power],
        backgroundColor: [colors.fury.primary, colors.fury.light],
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            padding: 15,
            font: {
              size: 13,
              weight: '600'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          padding: 12,
          borderColor: colors.fury.primary,
          borderWidth: 2,
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed;
              const total = fightData.totals.fury.total;
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 2000,
        delay: 1200
      }
    }
  });
}

// Animate stat cards
function animateStatCards() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const numberElement = entry.target.querySelector('.stat-number');
        if (numberElement && !numberElement.classList.contains('animated')) {
          const targetValue = parseInt(numberElement.textContent);
          numberElement.textContent = '0';
          animateValue(numberElement, 0, targetValue, 1500);
          numberElement.classList.add('animated');
        }
      }
    });
  }, { threshold: 0.5 });
  
  document.querySelectorAll('.stat-card').forEach(card => {
    observer.observe(card);
  });
}

// Scroll animations
function addScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  // Observe all chart containers
  document.querySelectorAll('.chart-container, .distribution-card, .analysis-card').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });
}

// Calculate and display insights
function displayInsights() {
  const furyTotal = fightData.totals.fury.total;
  const wilderTotal = fightData.totals.wilder.total;
  const difference = furyTotal - wilderTotal;
  
  console.log(`
    📊 Fight Statistics Summary:
    
    Tyson Fury: ${furyTotal} total punches (${fightData.totals.fury.jabs} jabs, ${fightData.totals.fury.power} power)
    Deontay Wilder: ${wilderTotal} total punches (${fightData.totals.wilder.jabs} jabs, ${fightData.totals.wilder.power} power)
    
    Fury's Advantage: +${difference} punches
    
    Analysis:
    - Fury landed more jabs: ${fightData.totals.fury.jabs - fightData.totals.wilder.jabs} more
    - Fury landed more power punches: ${fightData.totals.fury.power - fightData.totals.wilder.power} more
    - Wilder's best round: Round 9 (${Math.max(...fightData.punchesLanded.wilder)} punches)
    - Fury's best round: Round 3 (${Math.max(...fightData.punchesLanded.fury)} punches)
  `);
}

// Call insights function
displayInsights();

console.log('🥊 Fury vs Wilder Statistics Loaded!');
