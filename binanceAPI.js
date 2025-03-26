/**
 * Módulo para interactuar con la API de Binance Futures
 */
const BinanceAPI = (() => {
    // URL base para la API de Binance
    const BASE_URL = 'https://fapi.binance.com';
    
    /**
     * Obtiene datos históricos de velas (klines) de Binance Futures
     * 
     * @param {string} symbol - Par de trading (ej. 'XRPUSDT')
     * @param {string} interval - Intervalo de tiempo (ej. '1m', '1h', '1d')
     * @param {string} lookback - Período a consultar (ej. '1d', '7d')
     * @returns {Promise<Array>} - Promesa que resuelve a un array de datos OHLCV
     */
    async function getKlines(symbol, interval, lookback) {
        try {
            // Convertir lookback a milisegundos
            const now = new Date();
            let delta;
            if (lookback.endsWith('m')) {
                delta = parseInt(lookback) * 60 * 1000;
            } else if (lookback.endsWith('h')) {
                delta = parseInt(lookback) * 60 * 60 * 1000;
            } else if (lookback.endsWith('d')) {
                delta = parseInt(lookback) * 24 * 60 * 60 * 1000;
            } else {
                // Valor predeterminado: 1 día
                delta = 24 * 60 * 60 * 1000;
            }
            
            const startTime = now.getTime() - delta;
            
            // Construir URL para la solicitud
            const url = `${BASE_URL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&limit=1000`;
            
            // Realizar la solicitud
            const response = await fetch(url);
            
            // Verificar si la respuesta es exitosa
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error de API: ${errorData.msg || 'Desconocido'}`);
            }
            
            // Procesar los datos
            const data = await response.json();
            
            // Transformar los datos al formato deseado
            return data.map(kline => ({
                timestamp: new Date(kline[0]),
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5])
            }));
            
        } catch (error) {
            console.error('Error al obtener datos de Binance:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene el precio actual de un símbolo
     * 
     * @param {string} symbol - Par de trading (ej. 'XRPUSDT')
     * @returns {Promise<number>} - Promesa que resuelve al precio actual
     */
    async function getCurrentPrice(symbol) {
        try {
            const url = `${BASE_URL}/fapi/v1/ticker/price?symbol=${symbol}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error de API: ${errorData.msg || 'Desconocido'}`);
            }
            
            const data = await response.json();
            return parseFloat(data.price);
            
        } catch (error) {
            console.error('Error al obtener el precio actual:', error);
            throw error;
        }
    }
    
    /**
     * Obtiene información del símbolo (precio máximo, mínimo, etc.)
     * 
     * @param {string} symbol - Par de trading (ej. 'XRPUSDT')
     * @returns {Promise<Object>} - Promesa que resuelve a la información del símbolo
     */
    async function getSymbolInfo(symbol) {
        try {
            const url = `${BASE_URL}/fapi/v1/ticker/24hr?symbol=${symbol}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error de API: ${errorData.msg || 'Desconocido'}`);
            }
            
            const data = await response.json();
            
            return {
                highPrice: parseFloat(data.highPrice),
                lowPrice: parseFloat(data.lowPrice),
                lastPrice: parseFloat(data.lastPrice),
                volume: parseFloat(data.volume),
                priceChange: parseFloat(data.priceChange),
                priceChangePercent: parseFloat(data.priceChangePercent)
            };
            
        } catch (error) {
            console.error('Error al obtener información del símbolo:', error);
            throw error;
        }
    }
    
    // Exponer funciones públicas
    return {
        getKlines,
        getCurrentPrice,
        getSymbolInfo
    };
})();