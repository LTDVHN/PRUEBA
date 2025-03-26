function resetAndUpdate() {
    // Limpiar datos y reiniciar actualización
    allData = {};
    if (isUpdating) {
        if (updateTimer) {
            clearInterval(updateTimer);
        }
        updateData();
        const updateInterval = parseInt(updateIntervalDropdown.value);
        updateTimer = setInterval(updateData, updateInterval);
    } else {
        // Actualizar una vez incluso si está detenido
        updateData();
    }
}

// Exponer la función al ámbito global
window.resetAndUpdate = resetAndUpdate;


// Variables globales
window.crypto_pairs = [
    'ADAUSDT', 'XRPUSDT', 'WLDUSDT', 'FILUSDT', 'XLMUSDT',
    'SXPUSDT', 'DOGEUSDT', 'TRUMPUSDT', 'VETUSDT', 'ALGOUSDT',
    'SANDUSDT', 'MANAUSDT', 'TRXUSDT', '1000LUNCUSDT','LUNCUSDT', '1000PEPEUSDT','PEPEUSDT',
    'BTCUSDT'  // Asegurar que BTC está incluido para análisis de referencia
];

let updateTimer = null;
let isUpdating = true;
let allData = {};

// Elementos del DOM
const intervalDropdown = document.getElementById('interval-dropdown');
const updateIntervalDropdown = document.getElementById('update-interval');
const marketTypeRadios = document.getElementsByName('market-type');
const stopButton = document.getElementById('stop-button');
const resumeButton = document.getElementById('resume-button');
const metricsTable = document.getElementById('crypto-metrics-table');
const chartsContainer = document.getElementById('crypto-charts');
const lastUpdateElement = document.getElementById('last-update');

// Sistema de caché para datos
const CACHE_KEY = 'crypto_dashboard_data';
const CACHE_TIMESTAMP_KEY = 'crypto_dashboard_timestamp';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hora en milisegundos

// Función para guardar datos en caché
function saveDataToCache(data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
}

// Función para cargar datos de caché
function loadDataFromCache() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cachedData || !timestamp) return null;
    
    // Verificar si la caché ha expirado
    const now = Date.now();
    if (now - parseInt(timestamp) > CACHE_EXPIRY) return null;
    
    try {
        return JSON.parse(cachedData);
    } catch (e) {
        console.error('Error al cargar datos de caché:', e);
        return null;
    }
}

// Función para hacer solicitudes con timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error(`La solicitud a ${url} superó el tiempo límite de ${timeout}ms`);
        }
        throw error;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Configurar event listeners
    intervalDropdown.addEventListener('change', resetAndUpdate);
    updateIntervalDropdown.addEventListener('change', updateTimerInterval);
    
    // Nuevo manejador para los radio buttons de tipo de mercado
    marketTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            // Detener la actualización automática temporalmente
            if (updateTimer) {
                clearInterval(updateTimer);
                updateTimer = null;
            }
            
            // Actualizar el estado de los botones
            stopButton.disabled = true;
            resumeButton.disabled = false;
            
            // Realizar una actualización inmediata
            updateData();
            
            // Reanudar la actualización automática después de 2 segundos
            setTimeout(() => {
                if (!updateTimer) {
                    const updateInterval = parseInt(updateIntervalDropdown.value);
                    updateTimer = setInterval(updateData, updateInterval);
                    
                    // Actualizar el estado de los botones
                    stopButton.disabled = false;
                    resumeButton.disabled = true;
                }
            }, 1000); // Esperar 1 segundos antes de reanudar
        });
    });
    
    stopButton.addEventListener('click', stopUpdates);
    resumeButton.addEventListener('click', resumeUpdates);
    
    // Intentar cargar datos de caché
    const cachedData = loadDataFromCache();
    if (cachedData) {
        // Mostrar datos de caché inmediatamente
        allData = cachedData;
        displayCachedData();
        
        // Ya no es primera carga para las actualizaciones posteriores
        isFirstLoad = false;
        
        // Actualizar datos en segundo plano
        setTimeout(() => {
            updateData(true); // true = actualización en segundo plano
        }, 1000);
    } else {
        // No hay caché, mantener isFirstLoad = true para mostrar el indicador completo
        // al iniciar la primera actualización
        startUpdates();
    }
});

// Modificar estas funciones también
function resetAndUpdate() {
    // Si se solicita explícitamente una actualización, mostrar el indicador completo
    isFirstLoad = true;
    
    // Resto del código igual
    allData = {};
    if (isUpdating) {
        if (updateTimer) {
            clearInterval(updateTimer);
        }
        updateData();
        const updateInterval = parseInt(updateIntervalDropdown.value);
        updateTimer = setInterval(updateData, updateInterval);
    } else {
        // Actualizar una vez incluso si está detenido
        updateData();
    }
}

// Función para mostrar datos de caché
function displayCachedData() {
    try {
        const marketType = getSelectedMarketType();
        let metrics;
        
        if (marketType === 'combined') {
            metrics = combineSportFuturesData(allData);
            metrics = getCombinedTradingSignals(metrics, allData);
        } else {
            metrics = getCurrentMetrics(allData, marketType);
        }
        
        // Mostrar datos en la interfaz
        const tableHTML = window.ChartUtils.generateMetricsTableHTML(metrics, marketType);
        const chartsHTML = window.ChartUtils.generateChartsHTML(metrics, marketType);
        
        metricsTable.innerHTML = tableHTML;
        chartsContainer.innerHTML = chartsHTML;
        
        // O mejor aún, usar la función displayCharts:
        window.ChartUtils.displayCharts(metrics.slice(0, 6), marketType, tempData, chartsContainer);

        // Mostrar timestamp de última actualización
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        if (cachedTimestamp) {
            const date = new Date(parseInt(cachedTimestamp));
            lastUpdateElement.textContent = `Última actualización: ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')} (desde caché)`;
        }
        
        // Mostrar notificación sutil de que se están cargando datos nuevos
        const updateNotice = document.createElement('div');
        updateNotice.className = 'update-notice';
        updateNotice.textContent = 'Actualizando datos en segundo plano...';
        document.body.appendChild(updateNotice);
        setTimeout(() => {
            if (updateNotice.parentNode) {
                updateNotice.parentNode.removeChild(updateNotice);
            }
        }, 5000);
        
    } catch (error) {
        console.error('Error al mostrar datos de caché:', error);
        // Si hay error al mostrar datos de caché, iniciar actualización normal
        startUpdates();
    }
}

// Funciones de control
function startUpdates() {
    isUpdating = true;
    stopButton.disabled = false;
    resumeButton.disabled = true;
    
    updateData();
    
    // Configurar intervalo de actualización
    const updateInterval = parseInt(updateIntervalDropdown.value);
    updateTimer = setInterval(updateData, updateInterval);
}

function stopUpdates() {
    isUpdating = false;
    stopButton.disabled = true;
    resumeButton.disabled = false;
    
    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
    }
}

function resumeUpdates() {
    startUpdates();
}

function updateTimerInterval() {
    // Reiniciar el timer con el nuevo intervalo
    if (isUpdating) {
        if (updateTimer) {
            clearInterval(updateTimer);
        }
        const updateInterval = parseInt(updateIntervalDropdown.value);
        updateTimer = setInterval(updateData, updateInterval);
    }
}

function resetAndUpdate() {
    // Limpiar datos y reiniciar actualización
    allData = {};
    if (isUpdating) {
        if (updateTimer) {
            clearInterval(updateTimer);
        }
        updateData();
        const updateInterval = parseInt(updateIntervalDropdown.value);
        updateTimer = setInterval(updateData, updateInterval);
    } else {
        // Actualizar una vez incluso si está detenido
        updateData();
    }
}

function showLoading() {
    metricsTable.innerHTML = '<div class="loader"></div>';
    chartsContainer.innerHTML = '<div class="loader"></div>';
}

function getSelectedMarketType() {
    for (const radio of marketTypeRadios) {
        if (radio.checked) {
            return radio.value;
        }
    }
    return 'combined'; // Valor por defecto
}

// Variable para saber si es la primera carga
let isFirstLoad = true;

// Modificar la función updateData
async function updateData(backgroundUpdate = false) {
    // Siempre usar actualización en segundo plano después de la primera carga
    if (!isFirstLoad) {
        backgroundUpdate = true;
    }
    
    // Si es una actualización en segundo plano, mostrar un indicador más sutil o ninguno
    if (backgroundUpdate) {
        // Usar un indicador muy sutil o ninguno
        const bgIndicator = document.createElement('div');
        bgIndicator.className = 'mini-update-indicator';
        bgIndicator.innerHTML = '<div class="mini-loader"></div>';
        document.body.appendChild(bgIndicator);
        
        try {
            await updateDataInternal(backgroundUpdate);
        } finally {
            // Remover indicador
            if (bgIndicator.parentNode) {
                bgIndicator.parentNode.removeChild(bgIndicator);
            }
            
            // Ya no es la primera carga
            isFirstLoad = false;
        }
    } else {
        // Primera carga con indicador completo
        updateProgressIndicator(0, 1, "Iniciando actualización");
        await updateDataInternal(backgroundUpdate);
        
        // Ya no es la primera carga
        isFirstLoad = false;
    }
}

async function updateDataInternal(backgroundUpdate = false) {
    const interval = intervalDropdown.value;
    const marketType = getSelectedMarketType();
    
    // Crear una copia temporal para los nuevos datos
    const tempData = {};
    
    try {
        // Calcular el número total de pares a procesar
        const marketsToProcess = (marketType === "spot" ? ["spot"] : 
                                 marketType === "futures" ? ["futures"] : ["spot", "futures"]);
        const totalOperations = marketsToProcess.length * crypto_pairs.length;
        let completedOperations = 0;
        
        // 1. Obtener todos los datos primero
        for (const market of marketsToProcess) {
            for (const symbol of crypto_pairs) {
                try {
                    if (!backgroundUpdate) {
                        updateProgressIndicator(
                            completedOperations, 
                            totalOperations, 
                            `Obteniendo datos de ${symbol} (${market})`
                        );
                    }
                    
                    const df = await getBinanceData(symbol, interval, 100, market);
                    if (df && df.length > 0) {
                        const marketSymbol = `${symbol}_${market}`;
                        tempData[marketSymbol] = df;
                    }
                    
                    // Pausa más larga para evitar límites de tasa
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error(`Error obteniendo datos para ${symbol} en ${market}:`, error);
                } finally {
                    completedOperations++;
                    if (!backgroundUpdate) {
                        updateProgressIndicator(completedOperations, totalOperations, "Obteniendo datos");
                    }
                }
            }
        }
        
        // Si no hay datos, mostrar error y salir
        if (Object.keys(tempData).length === 0) {
            throw new Error("No se pudo obtener ningún dato de la API de Binance. Verifica tu conexión o si la API está bloqueando las solicitudes.");
        }
        
        // Guardar datos en caché
        saveDataToCache(tempData);
        
        // 2. Procesar métricas
        if (!backgroundUpdate) {
            updateProgressIndicator(totalOperations, totalOperations, "Procesando métricas");
        }
        
        let metrics;
        if (marketType === 'combined') {
            metrics = combineSportFuturesData(tempData);
            metrics = getCombinedTradingSignals(metrics, tempData);
        } else {
            metrics = getCurrentMetrics(tempData, marketType);
        }
        
        // 3. Preparar HTML
        if (!backgroundUpdate) {
            updateProgressIndicator(totalOperations, totalOperations, "Generando visualizaciones");
        }
        
        const tableHTML = window.ChartUtils.generateMetricsTableHTML(metrics, marketType, tempData);
        const chartsHTML = window.ChartUtils.generateChartsHTML(metrics, marketType);
        
        // 4. Actualizar DOM
        metricsTable.innerHTML = tableHTML;
        chartsContainer.innerHTML = chartsHTML;

        // O mejor aún, usar la función displayCharts:
        window.ChartUtils.displayCharts(metrics.slice(0, 6), marketType, allData, chartsContainer);
        
        // 6. Actualizar datos globales
        allData = tempData;

        // Asegúrate de que el elemento existe o créalo
        if (!document.getElementById('last-update')) {
            const lastUpdateEl = document.createElement('div');
            lastUpdateEl.id = 'last-update';
            document.body.appendChild(lastUpdateEl);
        }
        
        // 7. Actualizar timestamp
        const now = new Date();
        lastUpdateElement.textContent = `Última actualización: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        // Finalizar progreso
        if (!backgroundUpdate) {
            updateProgressIndicator(totalOperations + 1, totalOperations, "Actualización completada");
        }
        
    } catch (error) {
        console.error("Error actualizando datos:", error);
        
        // Mostrar error solo si no es una actualización en segundo plano
        if (!backgroundUpdate) {
            // Mostrar error más visible
            metricsTable.innerHTML = `<div class="error-message" style="padding: 20px; text-align: center;">
                <h3>Error al obtener datos</h3>
                <p>${error.message}</p>
                <p>Posibles soluciones:</p>
                <ol style="text-align: left; max-width: 600px; margin: 0 auto;">
                    <li>Verifica tu conexión a internet</li>
                    <li>La API de Binance puede estar bloqueando las solicitudes (límite de tasa)</li>
                    <li>Comprueba si puedes acceder directamente a la página de Binance</li>
                    <li>Intenta usar una VPN si estás en una región donde Binance tiene restricciones</li>
                    <li>Reduce la cantidad de pares de criptomonedas en la configuración</li>
                    <li>Intenta actualizar después de unos minutos</li>
                </ol>
            </div>`;
        }
    }
}

async function fetchAllCryptoData(interval = "15m", marketType = "combined") {
    const marketsToCheck = [];
    
    if (marketType === "spot") {
        marketsToCheck.push("spot");
    } else if (marketType === "futures") {
        marketsToCheck.push("futures");
    } else {
        marketsToCheck.push("spot", "futures");
    }

    // Crear array de promesas para todas las peticiones
    const fetchPromises = [];
    
    for (const market of marketsToCheck) {
        // Hacer las peticiones en paralelo para cada mercado
        const marketPromises = crypto_pairs.map(async (symbol) => {
            try {
                const df = await getBinanceData(symbol, interval, 100, market);
                if (df && df.length > 0) {
                    const marketSymbol = `${symbol}_${market}`;
                    return { marketSymbol, df };
                }
                return null;
            } catch (error) {
                console.error(`Error para ${symbol} en ${market}:`, error);
                return null;
            }
        });
        
        fetchPromises.push(...marketPromises);
    }

    // Esperar a que todas las peticiones terminen
    const results = await Promise.allSettled(fetchPromises);
    
    // Procesar resultados
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            const { marketSymbol, df } = result.value;
            allData[marketSymbol] = df;
        }
    });

    return allData;
}

async function getBinanceData(symbol, interval, limit, market) {
    try {
        let url, params;
        
        if (!market) {
            throw new Error('El tipo de mercado (spot/futures) es requerido');
        }
        
        if (market === "spot") {
            url = "https://api.binance.com/api/v3/klines";
            params = new URLSearchParams({
                symbol: symbol,
                interval: interval || "5m",
                limit: limit || 100
            });
        } else if (market === "futures") {
            url = "https://fapi.binance.com/fapi/v1/klines";
            params = new URLSearchParams({
                symbol: symbol,
                interval: interval || "5m",
                limit: limit || 100
            });
        } else {
            throw new Error('Tipo de mercado inválido. Use "spot" o "futures"');
        }
        
        // Ajustar el timeout según la cantidad de pares
        const dynamicTimeout = Math.min(15000, Math.max(5000, crypto_pairs.length * 300));
        
        const response = await fetchWithTimeout(`${url}?${params}`, {}, dynamicTimeout);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        // Convertir a formato procesable
        const df = data.map(row => {
            const timestamp = new Date(row[0]);
            const open = parseFloat(row[1]);
            const high = parseFloat(row[2]);
            const low = parseFloat(row[3]);
            const close = parseFloat(row[4]);
            const volume = parseFloat(row[5]);
            const close_time = new Date(row[6]);
            const quote_volume = parseFloat(row[7]);
            const trades = parseFloat(row[8]);
            const taker_buy_base = parseFloat(row[9]);
            const taker_buy_quote = parseFloat(row[10]);
            
            // Calcular métricas
            const price_change = close - open;
            const directional_force = (taker_buy_quote / quote_volume) * 2 - 1; // De -1 a 1
            const capital_flow = quote_volume * directional_force;
            
            // Crear objeto de datos
            return {
                timestamp,
                open,
                high,
                low,
                close,
                volume,
                close_time,
                quote_volume,
                trades,
                taker_buy_base,
                taker_buy_quote,
                price_change,
                directional_force,
                capital_flow,
                market_type: market
            };
        });
        
        // Calcular campos adicionales que requieren ventanas de datos
        calculateRollingMetrics(df);
        
        return df;
    } catch (error) {
        console.error(`Error obteniendo datos para ${symbol} en ${market}:`, error);
        return [];
    }
}

function calculateRollingMetrics(df) {
    if (!df || df.length < 2) return;
    
    // Calcular medias móviles
    for (let i = 0; i < df.length; i++) {
        // Capital flow MA (10 períodos)
        const capitalFlowMA = rollingMean(df, i, 10, 'capital_flow');
        df[i].capital_flow_ma = capitalFlowMA;
        
        // Volume MA (10 y 20 períodos)
        const volumeMA10 = rollingMean(df, i, 10, 'volume');
        const volumeMA20 = rollingMean(df, i, 20, 'volume');
        
        // Price MA (10 períodos)
        const priceMA = rollingMean(df, i, 10, 'close');
        df[i].price_ma = priceMA;
        
        // Impulso
        if (volumeMA10 > 0) {
            df[i].impulse = df[i].price_change * (df[i].volume / volumeMA10);
        } else {
            df[i].impulse = 0;
        }
        
        // Concentración de trades
        if (df[i].trades > 0) {
            const avgTradeSize = df[i].volume / df[i].trades;
            const avgTradeSizeMA = rollingMean(df, i, 20, 'avg_trade_size');
            
            df[i].avg_trade_size = avgTradeSize;
            
            if (avgTradeSizeMA > 0) {
                df[i].trade_concentration = avgTradeSize / avgTradeSizeMA;
            } else {
                df[i].trade_concentration = 1;
            }
        } else {
            df[i].avg_trade_size = 0;
            df[i].trade_concentration = 1;
        }
        
        // Calcular divergencia
        if (i >= 5 && capitalFlowMA !== null && priceMA !== null) {
            const priceMAPctChange = pctChange(df, i, 5, 'price_ma');
            const flowMAPctChange = pctChange(df, i, 5, 'capital_flow_ma');
            
            if (priceMAPctChange !== null && flowMAPctChange !== null) {
                df[i].invisible_divergence = priceMAPctChange - flowMAPctChange;
            }
        }
        
        // Volumen ratio
        if (volumeMA20 > 0) {
            df[i].volume_ratio = df[i].volume / volumeMA20;
        } else {
            df[i].volume_ratio = 1;
        }
        
        // Tendencia
        if (df.length >= 20) {
            const ma20 = rollingMean(df, i, 20, 'close');
            const ma50 = rollingMean(df, i, 50, 'close');
            
            if (ma20 !== null && ma50 !== null) {
                df[i].trend_direction = ma20 > ma50 ? 'UP' : 'DOWN';
            } else {
                df[i].trend_direction = 'NEUTRAL';
            }
        } else {
            df[i].trend_direction = 'NEUTRAL';
        }
        // Añadir cálculo de MFI
    if (window.MFIIndicator) {
        df = window.MFIIndicator.calculate(df);
    }

    }
}

// Funciones de ayuda para cálculos
function rollingMean(df, currentIndex, window, field) {
    if (currentIndex < window - 1) return null;
    
    let sum = 0;
    let count = 0;
    
    for (let i = currentIndex - window + 1; i <= currentIndex; i++) {
        if (i >= 0 && i < df.length && df[i][field] !== undefined) {
            sum += df[i][field];
            count++;
        }
    }
    
    return count > 0 ? sum / count : null;
}

function pctChange(df, currentIndex, periods, field) {
    if (currentIndex < periods) return null;
    
    const current = df[currentIndex][field];
    const previous = df[currentIndex - periods][field];
    
    if (current === null || previous === null || previous === 0) return null;
    
    return (current / previous) - 1;
}

// Funciones para procesar datos y calcular señales
function getCurrentMetrics(allData, marketType) {
    if (marketType === 'combined') {
        return combineSportFuturesData(allData);
    }
    
    const metrics = [];
    
    for (const [marketSymbol, df] of Object.entries(allData)) {
        if (!df || df.length < 2) continue;
        
        // Obtener el último precio y cambio
        const lastIndex = df.length - 1;
        const prevIndex = lastIndex - 1;
        
        const currentPrice = df[lastIndex].close;
        const prevPrice = df[prevIndex].close;
        const priceChange = currentPrice - prevPrice;
        const priceChangePct = (prevPrice > 0) ? (priceChange / prevPrice) * 100 : 0;
        
        // Extraer tipo de mercado
        const marketType = df[0].market_type;
        
        try {
            // Métricas de flujo
            const capitalFlow = df[lastIndex].capital_flow;
            const force = df[lastIndex].directional_force;
            const concentration = df[lastIndex].trade_concentration || 1;
            const impulse = df[lastIndex].impulse || 0;
            const divergence = (df[lastIndex].invisible_divergence || 0) * 100; // Convertir a porcentaje
            
            // Métricas avanzadas
            const trend = df.length >= 20 ? df[lastIndex].trend_direction : "NEUTRAL";
            const volumeRatio = df.length >= 20 ? df[lastIndex].volume_ratio : 1.0;
            
            metrics.push({
                symbol: marketSymbol,
                market_type: marketType,
                price: currentPrice,
                change_pct: priceChangePct,
                capital_flow: capitalFlow,
                directional_force: force,
                concentration: concentration,
                impulse: impulse,
                divergence: divergence,
                trend: trend,
                volume_ratio: volumeRatio,
                mfi: df[lastIndex].mfi // Añadir MFI si está disponible
            });
        } catch (error) {
            console.error(`Error procesando métricas para ${marketSymbol}:`, error);
            continue;
        }
    }
    
    // Añadir señales de trading
    return getTradingSignals(metrics, allData);
}

function combineSportFuturesData(allData) {
    const combinedData = [];
    
    // Agrupar por símbolo base (sin el sufijo _spot o _futures y sin el '1000')
    const baseSymbols = new Set();
    Object.keys(allData).forEach(key => {
        const parts = key.split('_');
        const baseSymbol = parts[0].replace('1000', ''); // Quitar el '1000' si existe
        baseSymbols.add(baseSymbol);
    });
    
    for (const baseSymbol of baseSymbols) {
        // Buscar los pares correspondientes en spot y futuros
        const spotKey = Object.keys(allData).find(k => 
            k.endsWith('_spot') && k.replace('_spot', '').replace('1000', '') === baseSymbol
        );
        const futuresKey = Object.keys(allData).find(k => 
            k.endsWith('_futures') && k.replace('_futures', '').replace('1000', '') === baseSymbol
        );

        // Verificar si existe versión con 1000
        const has1000Version = Object.keys(allData).some(key => 
            key.includes('1000') && key.replace('1000', '').replace('_spot', '').replace('_futures', '') === baseSymbol
        );
        
        // Verificar si tenemos datos tanto de spot como de futuros
        if (allData[spotKey] && allData[futuresKey]) {
            const spotDf = allData[spotKey];
            const futuresDf = allData[futuresKey];
            
            if (!spotDf.length || !futuresDf.length) continue;
            
            // Obtener los últimos datos para comparación
            const spotLast = spotDf[spotDf.length - 1];
            const futuresLast = futuresDf[futuresDf.length - 1];
            
            // Obtener los datos del período anterior para calcular cambio porcentual
            const spotPrev = spotDf.length > 1 ? spotDf[spotDf.length - 2] : spotLast;
            
            // Ajustar el precio de spot si es necesario
            const spotPrice = has1000Version ? spotLast.close * 1000 : spotLast.close;
            const spotPrevPrice = has1000Version ? spotPrev.close * 1000 : spotPrev.close;
            
            // Calcular las métricas combinadas
            const combinedMetric = {
                symbol: `${baseSymbol}_combined`,
                market_type: 'combined',
                base_symbol: baseSymbol,
                price_spot: spotPrice,
                price_futures: futuresLast.close,
                price: (spotPrice + futuresLast.close) / 2,  // Promedio
                basis: (futuresLast.close / spotPrice - 1) * 100,  // Diferencial en %
                change_pct: (spotPrice / spotPrevPrice - 1) * 100,
                
                // Métricas de flujo combinadas
                capital_flow: spotLast.capital_flow + futuresLast.capital_flow,
                capital_flow_spot: spotLast.capital_flow,
                capital_flow_futures: futuresLast.capital_flow,
                
                directional_force: (spotLast.directional_force + futuresLast.directional_force) / 2,
                directional_force_spot: spotLast.directional_force,
                directional_force_futures: futuresLast.directional_force,
                
                impulse: spotLast.impulse + futuresLast.impulse,
                impulse_spot: spotLast.impulse,
                impulse_futures: futuresLast.impulse,
                
                concentration: Math.max(
                    spotLast.trade_concentration || 1, 
                    futuresLast.trade_concentration || 1
                ),
                concentration_spot: spotLast.trade_concentration || 1,
                concentration_futures: futuresLast.trade_concentration || 1,
                
                divergence: (spotLast.invisible_divergence || 0) * 100,
                divergence_spot: (spotLast.invisible_divergence || 0) * 100,
                divergence_futures: (futuresLast.invisible_divergence || 0) * 100,
                
                // Volumen combinado
                volume_ratio: Math.max(
                    spotLast.volume_ratio || 1,
                    futuresLast.volume_ratio || 1
                ),
                
                // Tendencia (usamos la más fuerte)
                trend: (spotLast.trend_direction === 'UP' && futuresLast.trend_direction === 'UP') ? 'UP' :
                       (spotLast.trend_direction === 'DOWN' && futuresLast.trend_direction === 'DOWN') ? 'DOWN' : 'NEUTRAL'
            };
            
            // Analizar la congruencia entre spot y futuros
            if ((spotLast.directional_force > 0 && futuresLast.directional_force > 0) ||
               (spotLast.directional_force < 0 && futuresLast.directional_force < 0)) {
                combinedMetric.markets_agreement = true;
            } else {
                combinedMetric.markets_agreement = false;
            }
            
            // Guardar datos completos de cada mercado para referencia
            combinedMetric.spot_data = spotDf;
            combinedMetric.futures_data = futuresDf;

            // MFI COMBINADO CON NUEVA IMPLEMENTACIÓN
            let mfiData = null;
            let mfiSignals = null;

            // Usar el nuevo MFIIndicator para calcular MFI combinado
            if (window.MFIIndicator && spotDf.length > 14 && futuresDf.length > 14) {
                try {
                    // Calcular MFI combinado usando el nuevo método
                    mfiData = window.MFIIndicator.calculate(
                        spotDf, 
                        futuresDf, 
                        {
                            combinationMethod: 'weighted', // Método configurable
                            period: 14
                        }
                    );

                    // Obtener el último punto de MFI
                    if (mfiData && mfiData.length > 0) {
                        const lastMFIPoint = mfiData[mfiData.length - 1];
                        
                        // Añadir métricas de MFI a las métricas combinadas
                        combinedMetric.mfi = lastMFIPoint.mfi;
                        combinedMetric.mfi_spot = spotLast.mfi;
                        combinedMetric.mfi_futures = futuresLast.mfi;
                        
                        // Detectar señales
                        mfiSignals = window.MFIIndicator.detectSignals(mfiData);
                        
                        // Añadir señales e información de MFI
                        combinedMetric.mfi_signal = mfiSignals.signal;
                        combinedMetric.mfi_confidence = mfiSignals.confidence;
                        combinedMetric.mfi_reasoning = mfiSignals.reasoning;
                        combinedMetric.mfi_is_overbought = mfiSignals.isOverbought;
                        combinedMetric.mfi_is_oversold = mfiSignals.isOversold;
                    }
                } catch (error) {
                    console.error('Error calculando MFI combinado:', error);
                    // Método de respaldo
                    let spotMFI = spotLast.mfi || null;
                    let futuresMFI = futuresLast.mfi || null;
                    
                    let combinedMFI = null;
                    if (spotMFI !== null && futuresMFI !== null) {
                        combinedMFI = (spotMFI + futuresMFI) / 2;
                    }
                    
                    combinedMetric.mfi = combinedMFI;
                    combinedMetric.mfi_spot = spotMFI;
                    combinedMetric.mfi_futures = futuresMFI;
                }
            } else {
                // Respaldo al método original si no hay suficientes datos
                let spotMFI = spotLast.mfi || null;
                let futuresMFI = futuresLast.mfi || null;
                
                let combinedMFI = null;
                if (spotMFI !== null && futuresMFI !== null) {
                    combinedMFI = (spotMFI + futuresMFI) / 2;
                }
                
                combinedMetric.mfi = combinedMFI;
                combinedMetric.mfi_spot = spotMFI;
                combinedMetric.mfi_futures = futuresMFI;
            }
            
            combinedData.push(combinedMetric);
        }
    }
    
    return combinedData;
}

function getCombinedTradingSignals(combinedMetrics, allData) {
    // Obtener datos de Bitcoin para referencia
    const btcSpotKey = Object.keys(allData).find(k => k.startsWith('BTCUSDT_spot'));
    const btcFuturesKey = Object.keys(allData).find(k => k.startsWith('BTCUSDT_futures'));
    
    let btcTrend = "NEUTRAL";
    
    // Determinar tendencia de Bitcoin usando ambos mercados si disponibles
    if (btcSpotKey && btcFuturesKey) {
        const btcSpotDf = allData[btcSpotKey];
        const btcFuturesDf = allData[btcFuturesKey];
        
        if (btcSpotDf.length >= 24 && btcFuturesDf.length >= 24) {
            const spotChange = (btcSpotDf[btcSpotDf.length - 1].close / btcSpotDf[btcSpotDf.length - 24].close - 1) * 100;
            const futuresChange = (btcFuturesDf[btcFuturesDf.length - 1].close / btcFuturesDf[btcFuturesDf.length - 24].close - 1) * 100;
            
            // Promedio de ambos mercados
            const avgChange = (spotChange + futuresChange) / 2;
            
            if (avgChange > 2) {
                btcTrend = "BULLISH";
            } else if (avgChange < -2) {
                btcTrend = "BEARISH";
            }
        }
    }
    
    for (let i = 0; i < combinedMetrics.length; i++) {
        const metric = combinedMetrics[i];
        
        // Inicializar variables
        let signal = "NEUTRAL";
        let strength = 0;
        const reasoning = [];
        const advReasoning = [];
        
        // 1. ANÁLISIS BÁSICO COMBINADO
       // ------------------------------------------------------
       // Lógica para señales LONG
       let longPoints = 0;
       
       // Flujo de capital combinado
       if (metric.capital_flow > 0) {
           const strengthFactor = Math.min(5, Math.abs(metric.capital_flow) / 10000);
           const points = 1.5 + strengthFactor * 0.5;  // Valor base mayor
           longPoints += points;
           reasoning.push(`Flujo de capital combinado positivo (${points.toFixed(1)})`);
       }
       
       // Flujos individuales - spot
       if (metric.capital_flow_spot > 0) {
           const strengthFactor = Math.min(3, Math.abs(metric.capital_flow_spot) / 5000);
           const points = 0.5 + strengthFactor * 0.3;
           longPoints += points;
           reasoning.push(`Flujo positivo en SPOT (${points.toFixed(1)})`);
       }
       
       // Flujos individuales - futuros
       if (metric.capital_flow_futures > 0) {
           const strengthFactor = Math.min(3, Math.abs(metric.capital_flow_futures) / 5000);
           const points = 0.5 + strengthFactor * 0.3;
           longPoints += points;
           reasoning.push(`Flujo positivo en FUTUROS (${points.toFixed(1)})`);
       }
       
       // Fuerza direccional combinada
       if (metric.directional_force > 0.5) {
           longPoints += 2.5;
           reasoning.push("Fuerte presión de compra combinada (2.5)");
       } else if (metric.directional_force > 0.2) {
           longPoints += 1.5;
           reasoning.push("Presión de compra moderada combinada (1.5)");
       } else if (metric.directional_force > 0) {
           longPoints += 0.5;
           reasoning.push("Ligera presión de compra combinada (0.5)");
       }
       
       // Congruencia entre mercados (bonificación importante)
       if (metric.markets_agreement && metric.directional_force_spot > 0) {
           const agreementBonus = 2.0;
           longPoints += agreementBonus;
           reasoning.push(`SPOT y FUTUROS en concordancia alcista (+${agreementBonus})`);
       }
       
       // Impulso combinado
       if (metric.impulse > 2) {
           longPoints += 2;
           reasoning.push("Impulso fuertemente positivo (2)");
       } else if (metric.impulse > 0) {
           longPoints += 1;
           reasoning.push("Impulso positivo (1)");
       }
       
       // Base/Diferencial (precio futuros vs spot)
       if (metric.basis > 0.5) {  // Futuros en premium (bullish)
           const basisPoints = Math.min(2, metric.basis / 0.5);
           longPoints += basisPoints;
           reasoning.push(`Premium en futuros: ${metric.basis.toFixed(2)}% (+${basisPoints.toFixed(1)})`);
       }
       
       // LÓGICA SHORT
       let shortPoints = 0;
       
       // Flujo de capital combinado
       if (metric.capital_flow < 0) {
           const strengthFactor = Math.min(5, Math.abs(metric.capital_flow) / 10000);
           const points = 1.5 + strengthFactor * 0.5;
           shortPoints += points;
           reasoning.push(`Flujo de capital combinado negativo (${points.toFixed(1)})`);
       }
       
       // Flujos individuales - spot
       if (metric.capital_flow_spot < 0) {
           const strengthFactor = Math.min(3, Math.abs(metric.capital_flow_spot) / 5000);
           const points = 0.5 + strengthFactor * 0.3;
           shortPoints += points;
           reasoning.push(`Flujo negativo en SPOT (${points.toFixed(1)})`);
       }
       
       // Flujos individuales - futuros
       if (metric.capital_flow_futures < 0) {
           const strengthFactor = Math.min(3, Math.abs(metric.capital_flow_futures) / 5000);
           const points = 0.5 + strengthFactor * 0.3;
           shortPoints += points;
           reasoning.push(`Flujo negativo en FUTUROS (${points.toFixed(1)})`);
       }
       
       // Fuerza direccional combinada
       if (metric.directional_force < -0.5) {
           shortPoints += 2.5;
           reasoning.push("Fuerte presión de venta combinada (2.5)");
       } else if (metric.directional_force < -0.2) {
           shortPoints += 1.5;
           reasoning.push("Presión de venta moderada combinada (1.5)");
       } else if (metric.directional_force < 0) {
           shortPoints += 0.5;
           reasoning.push("Ligera presión de venta combinada (0.5)");
       }
       
       // Congruencia entre mercados (bonificación importante)
       if (metric.markets_agreement && metric.directional_force_spot < 0) {
           const agreementBonus = 2.0;
           shortPoints += agreementBonus;
           reasoning.push(`SPOT y FUTUROS en concordancia bajista (+${agreementBonus})`);
       }
       
       // Impulso combinado
       if (metric.impulse < -2) {
           shortPoints += 2;
           reasoning.push("Impulso fuertemente negativo (2)");
       } else if (metric.impulse < 0) {
           shortPoints += 1;
           reasoning.push("Impulso negativo (1)");
       }
       
       // Base/Diferencial (precio futuros vs spot)
       if (metric.basis < -0.2) {  // Futuros en descuento (bearish)
           const basisPoints = Math.min(2, Math.abs(metric.basis) / 0.2);
           shortPoints += basisPoints;
           reasoning.push(`Descuento en futuros: ${metric.basis.toFixed(2)}% (+${basisPoints.toFixed(1)})`);
       }
       
       // 2. ANÁLISIS AVANZADO
       // ------------------------------------------------------
       
       // Volumen anormal (máximo de ambos mercados)
       if (metric.volume_ratio > 3) {
           if (metric.directional_force > 0) {
               longPoints += 2;
               advReasoning.push("Volumen anormalmente alto con presión de compra (2)");
           } else if (metric.directional_force < 0) {
               shortPoints += 2;
               advReasoning.push("Volumen anormalmente alto con presión de venta (2)");
           }
       }
       
       // Tendencia de Bitcoin como referencia
       if (btcTrend === "BULLISH") {
           longPoints += 1.5;
           advReasoning.push("Alineado con tendencia alcista de Bitcoin (1.5)");
           if (shortPoints > longPoints) {
               advReasoning.push("PRECAUCIÓN: Señal contraria a la tendencia de Bitcoin (-2)");
               shortPoints -= 2;
           }
       } else if (btcTrend === "BEARISH") {
           shortPoints += 1.5;
           advReasoning.push("Alineado con tendencia bajista de Bitcoin (1.5)");
           if (longPoints > shortPoints) {
               advReasoning.push("PRECAUCIÓN: Señal contraria a la tendencia de Bitcoin (-2)");
               longPoints -= 2;
           }
       }
       
       // Tendencia del activo
       if (metric.trend === 'UP' && longPoints > shortPoints) {
           longPoints += 1.5;
           advReasoning.push("Señal alineada con tendencia alcista del activo (1.5)");
       } else if (metric.trend === 'DOWN' && shortPoints > longPoints) {
           shortPoints += 1.5;
           advReasoning.push("Señal alineada con tendencia bajista del activo (1.5)");
       } else if (metric.trend === 'UP' && shortPoints > longPoints) {
           advReasoning.push("PRECAUCIÓN: Señal contraria a la tendencia del activo (-1.5)");
           shortPoints -= 1.5;
       } else if (metric.trend === 'DOWN' && longPoints > shortPoints) {
           advReasoning.push("PRECAUCIÓN: Señal contraria a la tendencia del activo (-1.5)");
           longPoints -= 1.5;
       }
       
       // 3. CALCULAR PUNTUACIÓN FINAL
       // ------------------------------------------------------
       // En el modo combinado, usar un umbral alto para mayor precisión
       if (longPoints > shortPoints && longPoints >= 8) {  // Umbral más alto: 8
           signal = "LONG";
           strength = longPoints;
       } else if (shortPoints > longPoints && shortPoints >= 8) {  // Umbral más alto: 8
           signal = "SHORT";
           strength = shortPoints;
       }
       
       // 4. CATEGORÍAS DE CONFIANZA
       let confidence = "BAJA";
       if (strength >= 12) {  // Umbrales ajustados para modo combinado
           confidence = "ALTA";
       } else if (strength >= 10) {
           confidence = "MEDIA";
       }
       
       // Combinar todos los razonamientos
       const allReasons = [...reasoning, ...advReasoning];
       
       // Añadir la señal y su fuerza a las métricas
       combinedMetrics[i].signal = signal;
       combinedMetrics[i].signal_strength = strength;
       combinedMetrics[i].confidence = confidence;
       combinedMetrics[i].reasoning = allReasons;
   }
   
   return combinedMetrics;
}

function getCombinedTradingSignals(combinedMetrics, allData) {
    // Obtener datos de Bitcoin para referencia
    const btcSpotKey = Object.keys(allData).find(k => k.startsWith('BTCUSDT_spot'));
    const btcFuturesKey = Object.keys(allData).find(k => k.startsWith('BTCUSDT_futures'));
    
    let btcTrend = "NEUTRAL";
    
    // Determinar tendencia de Bitcoin usando ambos mercados si disponibles
    if (btcSpotKey && btcFuturesKey) {
        const btcSpotDf = allData[btcSpotKey];
        const btcFuturesDf = allData[btcFuturesKey];
        
        if (btcSpotDf.length >= 24 && btcFuturesDf.length >= 24) {
            const spotChange = (btcSpotDf[btcSpotDf.length - 1].close / btcSpotDf[btcSpotDf.length - 24].close - 1) * 100;
            const futuresChange = (btcFuturesDf[btcFuturesDf.length - 1].close / btcFuturesDf[btcFuturesDf.length - 24].close - 1) * 100;
            
            // Promedio de ambos mercados
            const avgChange = (spotChange + futuresChange) / 2;
            
            if (avgChange > 2) {
                btcTrend = "BULLISH";
            } else if (avgChange < -2) {
                btcTrend = "BEARISH";
            }
        }
    }
    
    for (let i = 0; i < combinedMetrics.length; i++) {
        const metric = combinedMetrics[i];
        
        // Inicializar variables
        let signal = "NEUTRAL";
        let strength = 0;
        const reasoning = [];
        const advReasoning = [];
        
        // 1. ANÁLISIS BÁSICO COMBINADO
       // ------------------------------------------------------
       // Lógica para señales LONG
       let longPoints = 0;
       
       // Flujo de capital combinado
       if (metric.capital_flow > 0) {
           const strengthFactor = Math.min(5, Math.abs(metric.capital_flow) / 10000);
           const points = 1.5 + strengthFactor * 0.5;  // Valor base mayor
           longPoints += points;
           reasoning.push(`Flujo de capital combinado positivo (${points.toFixed(1)})`);
       }
       
       // Flujos individuales - spot
       if (metric.capital_flow_spot > 0) {
           const strengthFactor = Math.min(3, Math.abs(metric.capital_flow_spot) / 5000);
           const points = 0.5 + strengthFactor * 0.3;
           longPoints += points;
           reasoning.push(`Flujo positivo en SPOT (${points.toFixed(1)})`);
       }
       
       // Flujos individuales - futuros
       if (metric.capital_flow_futures > 0) {
           const strengthFactor = Math.min(3, Math.abs(metric.capital_flow_futures) / 5000);
           const points = 0.5 + strengthFactor * 0.3;
           longPoints += points;
           reasoning.push(`Flujo positivo en FUTUROS (${points.toFixed(1)})`);
       }
       
       // Fuerza direccional combinada
       if (metric.directional_force > 0.5) {
           longPoints += 2.5;
           reasoning.push("Fuerte presión de compra combinada (2.5)");
       } else if (metric.directional_force > 0.2) {
           longPoints += 1.5;
           reasoning.push("Presión de compra moderada combinada (1.5)");
       } else if (metric.directional_force > 0) {
           longPoints += 0.5;
           reasoning.push("Ligera presión de compra combinada (0.5)");
       }
       
       // Congruencia entre mercados (bonificación importante)
       if (metric.markets_agreement && metric.directional_force_spot > 0) {
           const agreementBonus = 2.0;
           longPoints += agreementBonus;
           reasoning.push(`SPOT y FUTUROS en concordancia alcista (+${agreementBonus})`);
       }
       
       // Impulso combinado
       if (metric.impulse > 2) {
           longPoints += 2;
           reasoning.push("Impulso fuertemente positivo (2)");
       } else if (metric.impulse > 0) {
           longPoints += 1;
           reasoning.push("Impulso positivo (1)");
       }
       
       // Base/Diferencial (precio futuros vs spot)
       if (metric.basis > 0.5) {  // Futuros en premium (bullish)
           const basisPoints = Math.min(2, metric.basis / 0.5);
           longPoints += basisPoints;
           reasoning.push(`Premium en futuros: ${metric.basis.toFixed(2)}% (+${basisPoints.toFixed(1)})`);
       }
       
       // LÓGICA SHORT
       let shortPoints = 0;
       
       // Flujo de capital combinado
       if (metric.capital_flow < 0) {
           const strengthFactor = Math.min(5, Math.abs(metric.capital_flow) / 10000);
           const points = 1.5 + strengthFactor * 0.5;
           shortPoints += points;
           reasoning.push(`Flujo de capital combinado negativo (${points.toFixed(1)})`);
       }
       
       // Flujos individuales - spot
       if (metric.capital_flow_spot < 0) {
           const strengthFactor = Math.min(3, Math.abs(metric.capital_flow_spot) / 5000);
           const points = 0.5 + strengthFactor * 0.3;
           shortPoints += points;
           reasoning.push(`Flujo negativo en SPOT (${points.toFixed(1)})`);
       }
       
       // Flujos individuales - futuros
       if (metric.capital_flow_futures < 0) {
           const strengthFactor = Math.min(3, Math.abs(metric.capital_flow_futures) / 5000);
           const points = 0.5 + strengthFactor * 0.3;
           shortPoints += points;
           reasoning.push(`Flujo negativo en FUTUROS (${points.toFixed(1)})`);
       }
       
       // Fuerza direccional combinada
       if (metric.directional_force < -0.5) {
           shortPoints += 2.5;
           reasoning.push("Fuerte presión de venta combinada (2.5)");
       } else if (metric.directional_force < -0.2) {
           shortPoints += 1.5;
           reasoning.push("Presión de venta moderada combinada (1.5)");
       } else if (metric.directional_force < 0) {
           shortPoints += 0.5;
           reasoning.push("Ligera presión de venta combinada (0.5)");
       }
       
       // Congruencia entre mercados (bonificación importante)
       if (metric.markets_agreement && metric.directional_force_spot < 0) {
           const agreementBonus = 2.0;
           shortPoints += agreementBonus;
           reasoning.push(`SPOT y FUTUROS en concordancia bajista (+${agreementBonus})`);
       }
       
       // Impulso combinado
       if (metric.impulse < -2) {
           shortPoints += 2;
           reasoning.push("Impulso fuertemente negativo (2)");
       } else if (metric.impulse < 0) {
           shortPoints += 1;
           reasoning.push("Impulso negativo (1)");
       }
       
       // Base/Diferencial (precio futuros vs spot)
       if (metric.basis < -0.2) {  // Futuros en descuento (bearish)
           const basisPoints = Math.min(2, Math.abs(metric.basis) / 0.2);
           shortPoints += basisPoints;
           reasoning.push(`Descuento en futuros: ${metric.basis.toFixed(2)}% (+${basisPoints.toFixed(1)})`);
       }
       
       // 2. ANÁLISIS AVANZADO
       // ------------------------------------------------------
       
       // Volumen anormal (máximo de ambos mercados)
       if (metric.volume_ratio > 3) {
           if (metric.directional_force > 0) {
               longPoints += 2;
               advReasoning.push("Volumen anormalmente alto con presión de compra (2)");
           } else if (metric.directional_force < 0) {
               shortPoints += 2;
               advReasoning.push("Volumen anormalmente alto con presión de venta (2)");
           }
       }
       
       // Tendencia de Bitcoin como referencia
       if (btcTrend === "BULLISH") {
           longPoints += 1.5;
           advReasoning.push("Alineado con tendencia alcista de Bitcoin (1.5)");
           if (shortPoints > longPoints) {
               advReasoning.push("PRECAUCIÓN: Señal contraria a la tendencia de Bitcoin (-2)");
               shortPoints -= 2;
           }
       } else if (btcTrend === "BEARISH") {
           shortPoints += 1.5;
           advReasoning.push("Alineado con tendencia bajista de Bitcoin (1.5)");
           if (longPoints > shortPoints) {
               advReasoning.push("PRECAUCIÓN: Señal contraria a la tendencia de Bitcoin (-2)");
               longPoints -= 2;
           }
       }
       
       // Tendencia del activo
       if (metric.trend === 'UP' && longPoints > shortPoints) {
           longPoints += 1.5;
           advReasoning.push("Señal alineada con tendencia alcista del activo (1.5)");
       } else if (metric.trend === 'DOWN' && shortPoints > longPoints) {
           shortPoints += 1.5;
           advReasoning.push("Señal alineada con tendencia bajista del activo (1.5)");
       } else if (metric.trend === 'UP' && shortPoints > longPoints) {
           advReasoning.push("PRECAUCIÓN: Señal contraria a la tendencia del activo (-1.5)");
           shortPoints -= 1.5;
       } else if (metric.trend === 'DOWN' && longPoints > shortPoints) {
           advReasoning.push("PRECAUCIÓN: Señal contraria a la tendencia del activo (-1.5)");
           longPoints -= 1.5;
       }
       
       // Análisis MFI avanzado para señales combinadas
       if (window.MFIIndicator && metric.spot_data && metric.spot_data.length > 15 && 
           metric.futures_data && metric.futures_data.length > 15) {
           
           // Calcular MFI combinado
           const mfiData = window.MFIIndicator.calculate(
               metric.spot_data, 
               metric.futures_data, 
               {
                   combinationMethod: 'weighted',
                   period: 14
               }
           );
           
           // Obtener señales
           const mfiSignals = window.MFIIndicator.detectSignals(mfiData);
           
           // Añadir el razonamiento del MFI a la lista de fundamentos principales
           if (mfiSignals.reasoning && mfiSignals.reasoning !== 'Análisis MFI sin señales claras') {
               // Añadir a reasoning principal para que aparezca con prioridad alta
               reasoning.push(mfiSignals.reasoning);
           }
           
           // Añadir puntos según la señal MFI
           if (mfiSignals.signal === 'LONG') {
               longPoints += mfiSignals.longStrength || 0;
               console.log(`MFI combinado añadiendo ${mfiSignals.longStrength} puntos a LONG para ${metric.base_symbol}: ${mfiSignals.reasoning}`);
           } else if (mfiSignals.signal === 'SHORT') {
               shortPoints += mfiSignals.shortStrength || 0;
               console.log(`MFI combinado añadiendo ${mfiSignals.shortStrength} puntos a SHORT para ${metric.base_symbol}: ${mfiSignals.reasoning}`);
           }
       }
       
       // 3. CALCULAR PUNTUACIÓN FINAL
       // ------------------------------------------------------
       // En el modo combinado, usar un umbral alto para mayor precisión
       if (longPoints > shortPoints && longPoints >= 8) {  // Umbral más alto: 8
           signal = "LONG";
           strength = longPoints;
       } else if (shortPoints > longPoints && shortPoints >= 8) {  // Umbral más alto: 8
           signal = "SHORT";
           strength = shortPoints;
       }
       
       // 4. CATEGORÍAS DE CONFIANZA
       let confidence = "BAJA";
       if (strength >= 12) {  // Umbrales ajustados para modo combinado
           confidence = "ALTA";
       } else if (strength >= 10) {
           confidence = "MEDIA";
       }
       
       // Combinar todos los razonamientos
       const allReasons = [...reasoning, ...advReasoning];
       
       // Añadir la señal y su fuerza a las métricas
       combinedMetrics[i].signal = signal;
       combinedMetrics[i].signal_strength = strength;
       combinedMetrics[i].confidence = confidence;
       combinedMetrics[i].reasoning = allReasons;
   }
   
   return combinedMetrics;
}

// Versión simplificada del original para fallback
function getBasicTradingSignals(metrics) {
    for (let i = 0; i < metrics.length; i++) {
        // Inicializar la señal como neutral
        let signal = "NEUTRAL";
        let strength = 0;
        const reasoning = [];
        
        // Lógica para señales LONG
        let longPoints = 0;
        if (metrics[i].capital_flow > 0) {
            longPoints += 1;
            reasoning.push("Flujo de capital positivo");
        }
        
        if (metrics[i].directional_force > 0.3) {
            longPoints += 2;
            reasoning.push("Fuerte presión de compra");
        } else if (metrics[i].directional_force > 0) {
            longPoints += 1;
            reasoning.push("Ligera presión de compra");
        }
        
        if (metrics[i].impulse > 0) {
            longPoints += 1;
            reasoning.push("Impulso positivo");
        }
        
        if (metrics[i].divergence < -100 && metrics[i].change_pct > 0) {
            longPoints += 2;
            reasoning.push("Gran divergencia negativa con precio subiendo (posible continuación)");
        }
        
        // Lógica para señales SHORT
        let shortPoints = 0;
        if (metrics[i].capital_flow < 0) {
            shortPoints += 1;
            reasoning.push("Flujo de capital negativo");
        }
        
        if (metrics[i].directional_force < -0.3) {
            shortPoints += 2;
            reasoning.push("Fuerte presión de venta");
        } else if (metrics[i].directional_force < 0) {
            shortPoints += 1;
            reasoning.push("Ligera presión de venta");
        }
        
        if (metrics[i].impulse < 0) {
            shortPoints += 1;
            reasoning.push("Impulso negativo");
        }
        
        if (metrics[i].divergence > 100 && metrics[i].change_pct > 0) {
            shortPoints += 2;
            reasoning.push("Gran divergencia positiva con precio subiendo (posible reversión)");
        }
        
        // Determinar la señal final basada en los puntos
        if (longPoints > shortPoints && longPoints >= 3) {
            signal = "LONG";
            strength = longPoints;
        } else if (shortPoints > longPoints && shortPoints >= 3) {
            signal = "SHORT";
            strength = shortPoints;
        }
        
        // Añadir la señal y su fuerza a las métricas
        metrics[i].signal = signal;
        metrics[i].signal_strength = strength;
        metrics[i].confidence = "BÁSICA";
        metrics[i].reasoning = reasoning;
    }
    
    return metrics;
 }
 
 // Función para actualizar el indicador de progreso
 function updateProgressIndicator(current, total, message = "Actualizando datos") {
    const percent = Math.floor((current / total) * 100);
    let loadingIndicator = document.querySelector('.loading-overlay');
    
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-overlay';
        loadingIndicator.innerHTML = `
            <div class="loader"></div>
            <p>${message}: ${percent}% completado</p>
            <p>${current} de ${total} pares procesados</p>
        `;
        document.body.appendChild(loadingIndicator);
    } else {
        const pElements = loadingIndicator.querySelectorAll('p');
        if (pElements.length >= 1) {
            pElements[0].textContent = `${message}: ${percent}% completado`;
        }
        if (pElements.length >= 2) {
            pElements[1].textContent = `${current} de ${total} pares procesados`;
        }
    }
    
    // Si alcanzamos el 100%, eliminamos el indicador después de un breve retraso
    if (percent >= 100) {
        setTimeout(() => {
            if (loadingIndicator && loadingIndicator.parentNode) {
                loadingIndicator.parentNode.removeChild(loadingIndicator);
            }
        }, 500);
    }
 }
 
 // Manejadores de eventos para clicks de la tabla
 document.addEventListener('click', function(event) {
    // Implementar si quieres acciones al hacer clic en la tabla
 });
 
 // Función para agregar formateo de números
 function formatNumber(number, decimals = 2) {
    return number.toLocaleString('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
 }
 
 // Función para exportar datos
 function exportTableToCSV() {
    if (!metricsTable.querySelector('table')) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Código para exportar la tabla a CSV
    const rows = [];
    const table = metricsTable.querySelector('table');
    
    // Obtener encabezados
    const headers = [];
    const headerCells = table.querySelectorAll('thead th');
    headerCells.forEach(cell => {
        headers.push(cell.textContent.trim());
    });
    rows.push(headers.join(','));
    
    // Obtener filas de datos
    const dataCells = table.querySelectorAll('tbody tr');
    dataCells.forEach(row => {
        const rowData = [];
        row.querySelectorAll('td').forEach(cell => {
            // Limpiar texto de HTML
            let text = cell.textContent.trim().replace(/,/g, ';');
            rowData.push(text);
        });
        rows.push(rowData.join(','));
    });
    
    // Crear archivo CSV
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Descargar archivo
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `crypto_metrics_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
 }
 
 // Añadir botón de exportación si se desea
 function addExportButton() {
    const button = document.createElement('button');
    button.textContent = 'Exportar a CSV';
    button.className = 'export-button';
    button.addEventListener('click', exportTableToCSV);
    document.querySelector('.control-panel').appendChild(button);
 }
 
 // Función para detectar errores de conexión y mostrar mensaje
 window.addEventListener('error', function(e) {
    if (e.message.includes('NetworkError') || e.message.includes('Failed to fetch')) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.textContent = 'Error de conexión: Por favor verifica tu conexión a internet y que puedas acceder a la API de Binance.';
        document.body.appendChild(errorMsg);
        setTimeout(() => errorMsg.remove(), 8000);
    }
 });
 
 // Agregar información de ayuda y explicaciones
 function showHelp() {
    const helpContent = `
        <div class="help-modal">
            <div class="help-content">
                <h2>Ayuda - Dashboard de Flujo de Capital</h2>
                <p>Este dashboard muestra el flujo de capital en diferentes criptomonedas, tanto en mercados spot como de futuros.</p>
                
                <h3>Principales métricas:</h3>
                <ul>
                    <li><strong>Flujo de Capital:</strong> Medida de la dirección y fuerza del capital entrando o saliendo.</li>
                    <li><strong>Fuerza Direccional:</strong> Indica la presión compradora vs vendedora.</li>
                    <li><strong>Basis:</strong> Diferencial entre precio de futuros y spot.</li>
                    <li><strong>Congruencia:</strong> Si los mercados spot y futuros están moviéndose en la misma dirección.</li>
                </ul>
                
                <h3>Señales de trading:</h3>
               <p>Las señales (LONG/SHORT/NEUTRAL) se calculan mediante un algoritmo multiparamétrico que considera varios factores.</p>
               <p>La confianza (ALTA/MEDIA/BAJA) indica la fuerza de la señal.</p>
               
               <button class="close-help">Cerrar</button>
           </div>
       </div>
   `;
   
   const helpDiv = document.createElement('div');
   helpDiv.innerHTML = helpContent;
   document.body.appendChild(helpDiv);
   
   // Manejar cierre
   document.querySelector('.close-help').addEventListener('click', function() {
       helpDiv.remove();
   });
}

// Habilitar botón de ayuda si se desea
function addHelpButton() {
   const button = document.createElement('button');
   button.textContent = '?';
   button.className = 'help-button';
   button.title = 'Ayuda';
   button.addEventListener('click', showHelp);
   document.querySelector('h1').appendChild(button);
}
