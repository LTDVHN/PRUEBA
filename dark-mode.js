/**
 * Dark Mode Module
 * Permite alternar entre modo claro y oscuro en el Dashboard de Criptomonedas
 */

const DarkModeManager = {
    // Clave para almacenamiento en localStorage
    STORAGE_KEY: 'crypto_dashboard_dark_mode',
    
    // Estado actual
    isDarkMode: true,
    
    // Método de inicialización
    init: function() {
        // Crear y añadir el botón de modo oscuro en la parte superior izquierda
        this.addDarkModeButton();
        
        // Cargar la preferencia guardada (si existe)
        this.loadSavedPreference();
        
        // Aplicar el modo correcto al cargar
        this.applyTheme();
    },
    
    // Añadir botón de modo oscuro a la interfaz
    addDarkModeButton: function() {
        const pageHeader = document.querySelector('h1');
        
        const darkModeButton = document.createElement('button');
        darkModeButton.id = 'dark-mode-button';
        darkModeButton.innerHTML = '<span class="mode-icon">☀️</span>';
        darkModeButton.title = 'Cambiar a modo claro';
        darkModeButton.addEventListener('click', () => this.toggleDarkMode());
        
        darkModeButton.style.position = 'absolute';
        darkModeButton.style.left = '20px';
        darkModeButton.style.top = '50%';
        darkModeButton.style.transform = 'translateY(-50%)';
        darkModeButton.style.backgroundColor = '#4a90e2';
        darkModeButton.style.width = '40px';
        darkModeButton.style.height = '40px';
        darkModeButton.style.borderRadius = '50%';
        darkModeButton.style.display = 'flex';
        darkModeButton.style.justifyContent = 'center';
        darkModeButton.style.alignItems = 'center';
        darkModeButton.style.fontSize = '20px';
        darkModeButton.style.zIndex = '10';
        
        pageHeader.appendChild(darkModeButton);
    },
    
    // Cargar preferencia guardada desde localStorage
    loadSavedPreference: function() {
        try {
            const savedPreference = localStorage.getItem(this.STORAGE_KEY);
            if (savedPreference !== null) {
                this.isDarkMode = savedPreference === 'true';
                console.log('Preferencia de modo cargada:', this.isDarkMode ? 'Oscuro' : 'Claro');
            }
        } catch (error) {
            console.error('Error al cargar la preferencia de modo:', error);
        }
    },
    
    // Guardar preferencia en localStorage
    savePreference: function() {
        try {
            localStorage.setItem(this.STORAGE_KEY, this.isDarkMode);
            console.log('Preferencia de modo guardada:', this.isDarkMode ? 'Oscuro' : 'Claro');
        } catch (error) {
            console.error('Error al guardar la preferencia de modo:', error);
        }
    },
    
    // Alternar entre modos
    toggleDarkMode: function() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        this.savePreference();
        this.updateButtonAppearance();
    },
    
    // Actualizar apariencia del botón según el modo actual
    updateButtonAppearance: function() {
        const button = document.getElementById('dark-mode-button');
        const icon = button.querySelector('.mode-icon');
        
        if (this.isDarkMode) {
            icon.textContent = '☀️';
            button.style.color = '#4a90e2';
        } else {
            icon.textContent = '🌙';
            button.style.color = '#4a90e2';
        }
    },
    
    // Aplicar el tema según el modo seleccionado
    applyTheme: function() {
        // Aplicar la clase al elemento body
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        
        // Actualizar el botón
        this.updateButtonAppearance();
        
        // Actualizar colores de gráficos (Plotly)
        this.updateChartColors();
    },
    
    // Actualizar colores de los gráficos de Plotly cuando se cambia el modo
    updateChartColors: function() {
        // Solo actualizar si Plotly está disponible
        if (typeof Plotly === 'undefined') return;
        
        // Obtener todos los contenedores de gráficos
        const chartDivs = document.querySelectorAll('[id^="chart-"]');
        
        // No hacer nada si no hay gráficos
        if (chartDivs.length === 0) return;
        
        // Definir el template de color según el modo
        const colorTemplate = this.isDarkMode ? 
            {
                // Tema oscuro para Plotly
                layout: {
                    paper_bgcolor: '#1e1e1e',
                    plot_bgcolor: '#1e1e1e',
                    font: { color: '#e0e0e0' },
                    title: { font: { color: '#e0e0e0' } },
                    xaxis: { 
                        gridcolor: '#444',
                        zerolinecolor: '#444',
                        linecolor: '#444',
                        title: { font: { color: '#e0e0e0' } }
                    },
                    yaxis: { 
                        gridcolor: '#444',
                        zerolinecolor: '#444',
                        linecolor: '#444',
                        title: { font: { color: '#e0e0e0' } }
                    },
                    legend: { font: { color: '#e0e0e0' } }
                }
            } : 
            {
                // Tema claro (por defecto)
                layout: {
                    paper_bgcolor: '#ffffff',
                    plot_bgcolor: '#ffffff',
                    font: { color: '#333' },
                    title: { font: { color: '#333' } },
                    xaxis: { 
                        gridcolor: '#eeeeee',
                        zerolinecolor: '#cccccc',
                        linecolor: '#cccccc',
                        title: { font: { color: '#333' } }
                    },
                    yaxis: { 
                        gridcolor: '#eeeeee',
                        zerolinecolor: '#cccccc',
                        linecolor: '#cccccc',
                        title: { font: { color: '#333' } }
                    },
                    legend: { font: { color: '#333' } }
                }
            };
        
        // Aplicar el template a todos los gráficos
        chartDivs.forEach(div => {
            if (div._fullData) { // Comprobar si tiene gráfico Plotly
                Plotly.relayout(div, colorTemplate.layout);
            }
        });
    }
};

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // Asegurarse de que esta inicialización ocurra después de cargar otros scripts
    setTimeout(() => {
        DarkModeManager.init();
    }, 800); // Esperar 800ms para asegurar que otros scripts ya se han cargado
});