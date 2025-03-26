/**
 * Módulo de Gestión de Criptomonedas
 * Permite al usuario gestionar las criptomonedas mostradas en el dashboard
 * y mantiene la configuración guardada incluso al cerrar el navegador.
 */

const CryptoManager = {
    // Clave para almacenamiento en localStorage
    STORAGE_KEY: 'crypto_dashboard_coins',
    
    // Lista de criptomonedas obligatorias que no se pueden eliminar
    REQUIRED_COINS: ['BTCUSDT'],
    
    // Método de inicialización
    init: function() {
        // Crear y añadir el botón de gestión de criptomonedas
        this.addCryptoButton();
        
        // Cargar las monedas guardadas (si existen)
        this.loadSavedCoins();
        
        // Escuchar eventos de cierre del modal
        document.addEventListener('click', function(event) {
            if (event.target.classList.contains('crypto-modal-overlay')) {
                CryptoManager.closeModal();
            }
        });
    },
    
    // Añadir botón de gestión de criptomonedas a la interfaz
    addCryptoButton: function() {
        const controlPanel = document.querySelector('.control-panel');
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        
        const cryptoButton = document.createElement('button');
        cryptoButton.id = 'crypto-button';
        cryptoButton.textContent = 'CRYPTO';
        cryptoButton.addEventListener('click', () => this.openCryptoModal());
        
        controlGroup.appendChild(cryptoButton);
        controlPanel.appendChild(controlGroup);
        
        // Añadir estilos para el botón si es necesario
        cryptoButton.style.backgroundColor = '#ff9800';
        cryptoButton.style.marginLeft = '10px';
    },
    
    // Cargar lista de monedas guardadas desde localStorage
    loadSavedCoins: function() {
        try {
            const savedCoins = localStorage.getItem(this.STORAGE_KEY);
            if (savedCoins) {
                // Actualizar la variable global crypto_pairs
                window.crypto_pairs = JSON.parse(savedCoins);
                
                // Asegurar que las monedas requeridas estén siempre incluidas
                this.ensureRequiredCoins();
                
                console.log('Criptomonedas cargadas de localStorage:', window.crypto_pairs);
            }
        } catch (error) {
            console.error('Error al cargar las criptomonedas guardadas:', error);
        }
    },
    
    // Guardar lista actual de monedas en localStorage
    saveCoins: function(coins) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(coins));
            console.log('Criptomonedas guardadas en localStorage');
            
            // Actualizar la variable global
            window.crypto_pairs = coins;
            
            // Asegurar que las monedas requeridas estén siempre incluidas
            this.ensureRequiredCoins();
            
            // Forzar actualización de datos
            if (window.resetAndUpdate) {
                window.resetAndUpdate();
            }
        } catch (error) {
            console.error('Error al guardar las criptomonedas:', error);
        }
    },
    
    // Asegurar que las monedas requeridas estén incluidas
    ensureRequiredCoins: function() {
        // Para cada moneda requerida
        this.REQUIRED_COINS.forEach(requiredCoin => {
            // Si no está en la lista, añadirla
            if (!window.crypto_pairs.includes(requiredCoin)) {
                window.crypto_pairs.push(requiredCoin);
            }
        });
    },
    
    // Abrir modal para gestionar criptomonedas
    openCryptoModal: function() {
        // Crear el overlay del modal
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'crypto-modal-overlay';
        
        // Crear el contenido del modal
        const modalContent = document.createElement('div');
        modalContent.className = 'crypto-modal-content';
        
        // Título del modal
        const modalTitle = document.createElement('h3');
        modalTitle.textContent = 'Gestionar Criptomonedas';
        modalContent.appendChild(modalTitle);
        
        // Descripción
        const description = document.createElement('p');
        description.textContent = 'Agregue o elimine criptomonedas. BTCUSDT es obligatorio y no se puede eliminar.';
        modalContent.appendChild(description);
        
        // Lista actual de criptomonedas
        const coinsList = document.createElement('div');
        coinsList.className = 'coins-list';
        
        // Crear la lista de monedas con checkboxes
        window.crypto_pairs.forEach(coin => {
            const coinItem = document.createElement('div');
            coinItem.className = 'coin-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `coin-${coin}`;
            checkbox.value = coin;
            checkbox.checked = true;
            
            // Deshabilitar checkbox para monedas requeridas
            if (this.REQUIRED_COINS.includes(coin)) {
                checkbox.disabled = true;
                coinItem.className += ' required-coin';
            }
            
            const label = document.createElement('label');
            label.htmlFor = `coin-${coin}`;
            label.textContent = coin;
            
            coinItem.appendChild(checkbox);
            coinItem.appendChild(label);
            coinsList.appendChild(coinItem);
        });
        
        modalContent.appendChild(coinsList);
        
        // Contenedor de búsqueda
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-coin-container';

        const searchLabel = document.createElement('label');
        searchLabel.textContent = 'Buscar moneda';
        searchLabel.style.display = 'block';
        searchLabel.style.marginBottom = '5px';
        searchLabel.style.fontWeight = 'bold';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'search-coin-input';
        searchInput.placeholder = 'Ejemplo: BTCUSDT';
        searchInput.style.width = '100%';
        searchInput.style.padding = '8px';
        searchInput.style.border = '1px solid #ddd';
        searchInput.style.borderRadius = '4px';
        searchInput.style.marginBottom = '10px';

        // Convertir automáticamente a mayúsculas
        searchInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
            const searchTerm = this.value;
            const coinItems = document.querySelectorAll('.coin-item');
            
            coinItems.forEach(item => {
                const coinSymbol = item.querySelector('label').textContent.toUpperCase();
                if (coinSymbol.includes(searchTerm)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });

        searchContainer.appendChild(searchLabel);
        searchContainer.appendChild(searchInput);
        modalContent.insertBefore(searchContainer, coinsList);

        // Campo para añadir nueva criptomoneda
        const newCoinContainer = document.createElement('div');
        newCoinContainer.className = 'new-coin-container';
        
        const newCoinInput = document.createElement('input');
        newCoinInput.type = 'text';
        newCoinInput.id = 'new-coin-input';
        newCoinInput.placeholder = 'Ejemplo: BTCUSDT';
        
        // Convertir automáticamente a mayúsculas
        newCoinInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
        
        const addButton = document.createElement('button');
        addButton.textContent = 'Añadir';
        addButton.className = 'add-coin-button';
        addButton.addEventListener('click', () => this.addNewCoin(newCoinInput.value));
        
        newCoinContainer.appendChild(newCoinInput);
        newCoinContainer.appendChild(addButton);
        modalContent.appendChild(newCoinContainer);
        
        // Botones de acción
        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Guardar Cambios';
        saveButton.className = 'save-changes-button';
        saveButton.addEventListener('click', () => this.saveChanges());
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancelar';
        cancelButton.className = 'cancel-button';
        cancelButton.addEventListener('click', () => this.closeModal());
        
        actionButtons.appendChild(saveButton);
        actionButtons.appendChild(cancelButton);
        modalContent.appendChild(actionButtons);
        
        // Añadir el modal al DOM
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
        
        // Añadir estilos específicos para el modal
        this.addModalStyles();
    },
    
    // Añadir una nueva criptomoneda a la lista
    addNewCoin: function(coin) {
        coin = coin.trim().toUpperCase();
        
        // Validar el formato del símbolo (debe terminar en USDT)
        if (!coin || !coin.endsWith('USDT')) {
            alert('Por favor ingrese un símbolo válido que termine en USDT (Ejemplo: ETHUSDT)');
            return;
        }
        
        // Verificar si ya existe en la lista
        const coinsList = document.querySelector('.coins-list');
        const existingCoin = Array.from(coinsList.querySelectorAll('input[type="checkbox"]'))
            .find(checkbox => checkbox.value === coin);
        
        if (existingCoin) {
            alert(`La criptomoneda ${coin} ya está en la lista`);
            return;
        }
        
        // Crear nuevo elemento para la moneda
        const coinItem = document.createElement('div');
        coinItem.className = 'coin-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `coin-${coin}`;
        checkbox.value = coin;
        checkbox.checked = true;
        
        const label = document.createElement('label');
        label.htmlFor = `coin-${coin}`;
        label.textContent = coin;
        
        coinItem.appendChild(checkbox);
        coinItem.appendChild(label);
        coinsList.appendChild(coinItem);
        
        // Limpiar el campo de entrada
        document.getElementById('new-coin-input').value = '';
    },
    
    // Guardar los cambios realizados
    saveChanges: function() {
        // Obtener todas las monedas seleccionadas
        const selectedCoins = Array.from(
            document.querySelectorAll('.coin-item input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value);
        
        // Asegurar que las monedas obligatorias estén incluidas
        this.REQUIRED_COINS.forEach(requiredCoin => {
            if (!selectedCoins.includes(requiredCoin)) {
                selectedCoins.push(requiredCoin);
            }
        });
        
        // Guardar la nueva lista
        this.saveCoins(selectedCoins);
        
        // Cerrar el modal
        this.closeModal();
        
        // Mostrar mensaje de confirmación
        this.showNotification('Cambios guardados correctamente');
    },
    
    // Cerrar el modal
    closeModal: function() {
        const modal = document.querySelector('.crypto-modal-overlay');
        if (modal) {
            modal.remove();
        }
    },
    
    // Mostrar notificación temporal
    showNotification: function(message) {
        const notification = document.createElement('div');
        notification.className = 'crypto-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Estilo para la notificación
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        
        // Eliminar después de 3 segundos
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },
    
    // Añadir estilos CSS para el modal
    addModalStyles: function() {
        // Comprobar si ya existe el estilo
        if (document.getElementById('crypto-modal-styles')) {
            return;
        }
        
        const styleElement = document.createElement('style');
        styleElement.id = 'crypto-modal-styles';
        
        styleElement.textContent = `
            .crypto-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .crypto-modal-content {
                background-color: white;
                border-radius: 8px;
                padding: 20px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            }
            
            .crypto-modal-content h3 {
                margin-top: 0;
                color: #333;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }
            
            .coins-list {
                margin-bottom: 20px;
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #eee;
                padding: 10px;
                border-radius: 4px;
            }
            
            .coin-item {
                margin-bottom: 8px;
                padding: 5px;
                border-radius: 4px;
                display: flex;
                align-items: center;
            }
            
            .coin-item:hover {
                background-color: #f5f5f5;
            }
            
            .coin-item.required-coin {
                background-color: #fff8e1;
            }
            
            .coin-item label {
                margin-left: 8px;
                cursor: pointer;
            }
            
            .new-coin-container {
                display: flex;
                margin-bottom: 20px;
                gap: 10px;
            }
            
            #new-coin-input {
                flex-grow: 1;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            
            .add-coin-button {
                background-color: #4CAF50;
                color: white;
            }
            
            .action-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            .save-changes-button {
                background-color: #2196F3;
                color: white;
            }
            
            .cancel-button {
                background-color: #f44336;
                color: white;
            }
        `;
        
        document.head.appendChild(styleElement);
    }
};

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // Asegurarse de que esta inicialización ocurra después de cargar script.js
    setTimeout(() => {
        CryptoManager.init();
    }, 500); // Esperar 500ms para asegurar que script.js ya se ha cargado
});