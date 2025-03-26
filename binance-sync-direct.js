/**
 * BinanceSync - Módulo para sincronizar actualizaciones con el cierre de velas de Binance
 * Esta versión reemplaza directamente las funciones de actualización existentes
 */

// Reemplazar las funciones originales de actualización
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que se cargue el script principal
    setTimeout(() => {
        if (typeof window.startUpdates === 'function') {
            // Guardar referencias a las funciones originales
            const originalStartUpdates = window.startUpdates;
            const originalStopUpdates = window.stopUpdates;
            const originalResumeUpdates = window.resumeUpdates;
            const originalUpdateTimerInterval = window.updateTimerInterval;
            const originalUpdateData = window.updateData;
            
            // Sobreescribir funciones para implementar sincronización
            window.startUpdates = function() {
                console.log('🔄 Iniciando actualizaciones con sincronización Binance');
                window.isUpdating = true;
                document.getElementById('stop-button').disabled = false;
                document.getElementById('resume-button').disabled = true;
                
                // Realizar una actualización inmediata
                window.updateData();
                
                // Programar la siguiente actualización sincronizada
                scheduleSyncedUpdate();
            };
            
            window.stopUpdates = function() {
                console.log('⏹️ Deteniendo actualizaciones sincronizadas');
                window.isUpdating = false;
                document.getElementById('stop-button').disabled = true;
                document.getElementById('resume-button').disabled = false;
                
                // Cancelar cualquier actualización pendiente
                if (window.updateTimer) {
                    clearTimeout(window.updateTimer);
                    window.updateTimer = null;
                }
                
                // Ocultar cuenta regresiva
                hideCountdown();
            };
            
            window.resumeUpdates = function() {
                console.log('▶️ Reanudando actualizaciones sincronizadas');
                window.startUpdates();
            };
            
            window.updateTimerInterval = function() {
                console.log('⚙️ Reconfigurando sincronización');
                // Al cambiar el intervalo, detenemos y reiniciamos
                if (window.updateTimer) {
                    clearTimeout(window.updateTimer);
                }
                
                if (window.isUpdating) {
                    // Programar la siguiente actualización sincronizada
                    scheduleSyncedUpdate();
                }
            };
            
            // Agregar función de programación sincronizada
            window.scheduleSyncedUpdate = function() {
                const intervalValue = document.getElementById('interval-dropdown').value;
                const msUntilNextUpdate = calculateTimeToNextCandle(intervalValue);
                
                console.log(`📊 Próxima actualización en ${Math.round(msUntilNextUpdate/1000)} segundos (sincronizada con vela ${intervalValue})`);
                
                // Mostrar cuenta regresiva
                showCountdown(msUntilNextUpdate);
                
                // Programar próxima actualización
                window.updateTimer = setTimeout(() => {
                    // Realizar la actualización
                    window.updateData();
                    
                    // Si seguimos en modo de actualización automática, programar la siguiente
                    if (window.isUpdating) {
                        window.scheduleSyncedUpdate();
                    }
                }, msUntilNextUpdate);
            };
            
            // Función para calcular tiempo hasta el cierre de la próxima vela
            function calculateTimeToNextCandle(interval) {
                const now = new Date();
                let targetTime = new Date(now);
                
                // Ajustar según el intervalo seleccionado
                switch(interval) {
                    case '1m':
                        // Próximo minuto
                        targetTime.setMinutes(targetTime.getMinutes() + 1);
                        targetTime.setSeconds(0);
                        targetTime.setMilliseconds(0);
                        break;
                        
                    case '5m':
                        // Próximo múltiplo de 5 minutos
                        const currentMinute5 = targetTime.getMinutes();
                        const minutesToAdd5 = 5 - (currentMinute5 % 5);
                        targetTime.setMinutes(targetTime.getMinutes() + minutesToAdd5);
                        targetTime.setSeconds(0);
                        targetTime.setMilliseconds(0);
                        break;
                        
                    case '15m':
                        // Próximo múltiplo de 15 minutos
                        const currentMinute15 = targetTime.getMinutes();
                        const minutesToAdd15 = 15 - (currentMinute15 % 15);
                        targetTime.setMinutes(targetTime.getMinutes() + minutesToAdd15);
                        targetTime.setSeconds(0);
                        targetTime.setMilliseconds(0);
                        break;
                        
                    case '1h':
                        // Próxima hora
                        targetTime.setHours(targetTime.getHours() + 1);
                        targetTime.setMinutes(0);
                        targetTime.setSeconds(0);
                        targetTime.setMilliseconds(0);
                        break;
                        
                    case '4h':
                        // Próximo múltiplo de 4 horas
                        const currentHour = targetTime.getHours();
                        const hoursToAdd = 4 - (currentHour % 4);
                        targetTime.setHours(targetTime.getHours() + hoursToAdd);
                        targetTime.setMinutes(0);
                        targetTime.setSeconds(0);
                        targetTime.setMilliseconds(0);
                        break;
                        
                    case '1d':
                        // Próximo día a las 00:00 UTC
                        targetTime.setDate(targetTime.getDate() + 1);
                        targetTime.setHours(0);
                        targetTime.setMinutes(0);
                        targetTime.setSeconds(0);
                        targetTime.setMilliseconds(0);
                        break;
                        
                    default:
                        // Por defecto, añadir 1 minuto
                        targetTime.setMinutes(targetTime.getMinutes() + 1);
                        targetTime.setSeconds(0);
                        targetTime.setMilliseconds(0);
                }
                
                // Añadir offset para asegurar que la vela ya se ha cerrado (500ms)
                targetTime = new Date(targetTime.getTime() + 500);
                
                // Devolver la diferencia en ms
                return Math.max(0, targetTime.getTime() - now.getTime());
            }
            
            // Función para mostrar cuenta regresiva
            function showCountdown(initialMs) {
                hideCountdown(); // Eliminar cualquier cuenta atrás anterior
                
                let countdownElement = document.createElement('div');
                countdownElement.id = 'update-countdown';
                countdownElement.style.position = 'fixed';
                countdownElement.style.top = '40px';
                countdownElement.style.right = '10px';
                countdownElement.style.background = 'rgba(0,0,0,0.7)';
                countdownElement.style.color = 'white';
                countdownElement.style.padding = '5px 10px';
                countdownElement.style.borderRadius = '4px';
                countdownElement.style.fontSize = '12px';
                countdownElement.style.zIndex = '1000';
                document.body.appendChild(countdownElement);
                
                // Iniciar contador regresivo
                let remainingMs = initialMs;
                const countdownInterval = setInterval(() => {
                    remainingMs -= 1000;
                    
                    if (remainingMs <= 0) {
                        clearInterval(countdownInterval);
                        countdownElement.textContent = "Actualizando...";
                        return;
                    }
                    
                    const seconds = Math.floor(remainingMs / 1000) % 60;
                    const minutes = Math.floor(remainingMs / (1000 * 60)) % 60;
                    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                    
                    // Formatear tiempo restante
                    const timeString = [
                        hours > 0 ? `${hours}h` : '',
                        minutes > 0 ? `${minutes}m` : '',
                        `${seconds}s`
                    ].filter(Boolean).join(' ');
                    
                    countdownElement.textContent = `Próxima actualización: ${timeString}`;
                }, 1000);
                
                // Guardar referencia al intervalo para limpieza
                countdownElement.dataset.intervalId = countdownInterval;
            }
            
            // Función para ocultar cuenta regresiva
            function hideCountdown() {
                const countdownElement = document.getElementById('update-countdown');
                if (countdownElement) {
                    // Limpiar el intervalo si existe
                    if (countdownElement.dataset.intervalId) {
                        clearInterval(parseInt(countdownElement.dataset.intervalId));
                    }
                    // Eliminar elemento
                    countdownElement.remove();
                }
            }
            
            // Modificar event listeners existentes
            const intervalDropdown = document.getElementById('interval-dropdown');
            if (intervalDropdown) {
                // Remover listener antiguo y agregar nuevo
                const newIntervalListener = function() {
                    // Si hay una actualización automática activa, reprogramar
                    if (window.isUpdating && window.updateTimer) {
                        clearTimeout(window.updateTimer);
                        window.scheduleSyncedUpdate();
                    }
                };
                
                // Intentar reemplazar listener
                intervalDropdown.addEventListener('change', newIntervalListener);
            }
            
            // Si las actualizaciones ya están en marcha, reiniciar con sincronización
            if (window.isUpdating) {
                // Detener actualizaciones actuales
                if (window.updateTimer) {
                    // Verificar si es un interval o timeout
                    clearInterval(window.updateTimer); 
                    clearTimeout(window.updateTimer);
                    window.updateTimer = null;
                }
                
                // Iniciar con sincronización
                window.scheduleSyncedUpdate();
            }
            
            console.log('✅ BinanceSync aplicado correctamente');
        } else {
            console.error('❌ No se pudo aplicar BinanceSync: funciones no encontradas');
        }
    }, 1000); // Esperar 1 segundo para asegurar que el script principal está cargado
});