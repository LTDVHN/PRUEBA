/**
 * MFI Indicator Module - VERSIÓN MEJORADA CON DETECCIÓN AVANZADA
 * Implementación avanzada del Money Flow Index (MFI) 
 * para análisis de mercados spot, futuros y combinados
 */
const MFIIndicator = {
    /**
     * Calcula el Money Flow Index (MFI)
     * @param {Array} data - Datos de entrada (spot, futuros o combinados)
     * @param {Object} options - Opciones de configuración
     * @returns {Array} - Datos con MFI calculado
     */
    calculate: function(data, secondaryData = null, options = {}) {
        // Configuraciones por defecto
        const defaultOptions = {
            period: 14,
            combinationMethod: 'weighted', // Métodos: 'average', 'weighted', 'spot-priority'
            timestampTolerance: 60000 // 1 minuto de tolerancia
        };
        
        const config = { ...defaultOptions, ...options };
        
        // Si se proporcionan dos conjuntos de datos, combinarlos
        if (secondaryData && secondaryData.length > 0) {
            data = this._combineDataSets(data, secondaryData, config);
        }
        
        // Validaciones iniciales
        if (!data || data.length <= config.period) {
            console.warn('Datos insuficientes para calcular MFI');
            return data;
        }
        
        // Crear copia de datos para no modificar el original
        const df = [...data];
        
        // Paso 1: Calcular Typical Price
        this._calculateTypicalPrice(df);
        
        // Paso 2: Calcular Money Flow
        this._calculateMoneyFlow(df);
        
        // Paso 3: Calcular Money Flow Ratio y MFI
        this._calculateMFI(df, config.period);
        
        // Paso 4: Análisis de señales
        this._calculateMFISignals(df);
        
        return df;
    },
    
    /**
     * Combina dos conjuntos de datos
     * @private
     */
    _combineDataSets: function(primaryData, secondaryData, config) {
        const combinedData = [];
        
        // Función para encontrar punto correspondiente
        const findMatchingPoint = (point, dataSet, tolerance) => {
            return dataSet.find(secPoint => 
                Math.abs(point.timestamp.getTime() - secPoint.timestamp.getTime()) <= tolerance
            );
        };
        
        // Métodos de combinación
        const combinationMethods = {
            'average': (primary, secondary) => ({
                timestamp: primary.timestamp,
                high: (primary.high + secondary.high) / 2,
                low: (primary.low + secondary.low) / 2,
                close: (primary.close + secondary.close) / 2,
                volume: primary.volume + secondary.volume,
                typicalPrice: (primary.high + primary.low + primary.close) / 3
            }),
            
            'weighted': (primary, secondary) => {
                const primaryWeight = 0.6;
                const secondaryWeight = 0.4;
                return {
                    timestamp: primary.timestamp,
                    high: (primary.high * primaryWeight + secondary.high * secondaryWeight),
                    low: (primary.low * primaryWeight + secondary.low * secondaryWeight),
                    close: (primary.close * primaryWeight + secondary.close * secondaryWeight),
                    volume: primary.volume + secondary.volume,
                    typicalPrice: (primary.high + primary.low + primary.close) / 3
                };
            },
            
            'spot-priority': (primary, secondary) => primary
        };
        
        // Combinar datos
        for (const primaryPoint of primaryData) {
            const secondaryPoint = findMatchingPoint(primaryPoint, secondaryData, config.timestampTolerance);
            
            if (secondaryPoint) {
                const combinedPoint = combinationMethods[config.combinationMethod](
                    primaryPoint, 
                    secondaryPoint
                );
                combinedData.push(combinedPoint);
            } else {
                // Si no hay punto correspondiente, usar solo el punto primario
                combinedData.push(primaryPoint);
            }
        }
        
        return combinedData;
    },
    
    /**
     * Calcula el Typical Price para cada punto de datos
     * @private
     */
    _calculateTypicalPrice: function(df) {
        for (let i = 0; i < df.length; i++) {
            // Asegurar que existen las propiedades necesarias
            df[i].typicalPrice = (
                (df[i].high || 0) + 
                (df[i].low || 0) + 
                (df[i].close || 0)
            ) / 3;
        }
    },
    
    /**
     * Calcula el Money Flow para cada punto
     * @private
     */
    _calculateMoneyFlow: function(df) {
        // Inicializar campos
        for (let i = 0; i < df.length; i++) {
            df[i].rawMoneyFlow = (df[i].typicalPrice || 0) * (df[i].volume || 0);
            
            // Inicializar campos para Money Flow
            df[i].positiveMoneyFlow = 0;
            df[i].negativeMoneyFlow = 0;
        }
        
        // Determinar flujo positivo y negativo
        for (let i = 1; i < df.length; i++) {
            const currentTypical = df[i].typicalPrice || 0;
            const prevTypical = df[i-1].typicalPrice || 0;
            
            if (currentTypical > prevTypical) {
                df[i].positiveMoneyFlow = df[i].rawMoneyFlow;
            } else if (currentTypical < prevTypical) {
                df[i].negativeMoneyFlow = df[i].rawMoneyFlow;
            }
        }
    },
    
    /**
     * Calcula el Money Flow Index
     * @private
     */
    _calculateMFI: function(df, period = 14) {
        for (let i = period; i < df.length; i++) {
            // Sumar Money Flow en la ventana
            let positiveFlow = 0;
            let negativeFlow = 0;
            
            for (let j = i - period + 1; j <= i; j++) {
                positiveFlow += df[j].positiveMoneyFlow || 0;
                negativeFlow += df[j].negativeMoneyFlow || 0;
            }
            
            // Calcular MFI
            if (negativeFlow === 0) {
                df[i].mfi = 100;
            } else {
                const moneyFlowRatio = positiveFlow / negativeFlow;
                df[i].mfi = 100 - (100 / (1 + moneyFlowRatio));
            }
        }
    },
    
    /**
     * Detecta señales de trading basadas en MFI
     * @private
     */
    _calculateMFISignals: function(df) {
        const overboughtLevel = 80;
        const oversoldLevel = 20;
        
        for (let i = 1; i < df.length; i++) {
            const currentMFI = df[i].mfi;
            const prevMFI = df[i-1].mfi;
            
            // Valores inválidos
            if (isNaN(currentMFI) || isNaN(prevMFI)) {
                continue;
            }
            
            // Señales de sobrecompra/sobreventa
            df[i].isOverbought = currentMFI >= overboughtLevel;
            df[i].isOversold = currentMFI <= oversoldLevel;
            
            // Señales de cruce tradicionales
            df[i].longSignal = prevMFI <= oversoldLevel && currentMFI > oversoldLevel;
            df[i].shortSignal = prevMFI >= overboughtLevel && currentMFI < overboughtLevel;
            
            // NUEVAS SEÑALES: Detectar tendencias y cambios significativos
            // MFI bajando desde zona de sobrecompra (no necesariamente cruzando)
            df[i].mfiDroppingInOverbought = (currentMFI >= overboughtLevel && prevMFI > currentMFI && 
                                           (prevMFI - currentMFI > 3));
            
            // MFI subiendo desde zona de sobreventa (no necesariamente cruzando)
            df[i].mfiRisingInOversold = (currentMFI <= oversoldLevel && prevMFI < currentMFI && 
                                       (currentMFI - prevMFI > 3));
            
            // Tendencia bajista en MFI (5 periodos consecutivos bajando)
            if (i >= 5) {
                let consistentDrops = true;
                for (let j = i - 4; j <= i; j++) {
                    if (df[j].mfi >= df[j-1].mfi) {
                        consistentDrops = false;
                        break;
                    }
                }
                df[i].consistentMFIDowntrend = consistentDrops;
                
                // Tendencia alcista en MFI (5 periodos consecutivos subiendo)
                let consistentRises = true;
                for (let j = i - 4; j <= i; j++) {
                    if (df[j].mfi <= df[j-1].mfi) {
                        consistentRises = false;
                        break;
                    }
                }
                df[i].consistentMFIUptrend = consistentRises;
                
                // Caída significativa desde un máximo reciente
                let mfiMax = -1;
                for (let j = i - 5; j < i; j++) {
                    if (df[j].mfi > mfiMax) {
                        mfiMax = df[j].mfi;
                    }
                }
                // Si hubo un MFI alto recientemente y ahora está bajando significativamente
                df[i].droppingFromHighMFI = (mfiMax >= overboughtLevel && 
                                          currentMFI < prevMFI && 
                                          mfiMax - currentMFI > 8);
                
                // Subida significativa desde un mínimo reciente
                let mfiMin = 101;
                for (let j = i - 5; j < i; j++) {
                    if (df[j].mfi < mfiMin) {
                        mfiMin = df[j].mfi;
                    }
                }
                // Si hubo un MFI bajo recientemente y ahora está subiendo significativamente
                df[i].risingFromLowMFI = (mfiMin <= oversoldLevel && 
                                       currentMFI > prevMFI && 
                                       currentMFI - mfiMin > 8);
                
                // Extremos de MFI (usados para señales fuertes)
                df[i].extremelyOverbought = currentMFI >= 90;
                df[i].extremelyOversold = currentMFI <= 10;
            }
            
            // Detección de divergencias (código original mejorado)
            if (i >= 5) {
                const priceChange = (df[i].close - df[i-5].close) / df[i-5].close * 100;
                const mfiChange = (currentMFI - df[i-5].mfi);
                
                // Divergencia alcista: precio baja pero MFI sube (señal de compra)
                if (priceChange < -1 && mfiChange > 5) {
                    df[i].bullishDivergence = true;
                    df[i].divergenceStrength = Math.min(5, Math.abs(priceChange / 2));
                }
                
                // Divergencia bajista: precio sube pero MFI baja (señal de venta)
                if (priceChange > 1 && mfiChange < -5) {
                    df[i].bearishDivergence = true;
                    df[i].divergenceStrength = Math.min(5, Math.abs(priceChange / 2));
                }
            }
        }
    },
    
    /**
     * Detecta señales de trading basadas en MFI
     * @param {Array} data - Datos procesados
     * @param {Object} options - Opciones de configuración
     * @returns {Object} - Señales de trading
     */
    detectSignals: function(data, options = {}) {
        const defaultOptions = {
            overboughtLevel: 80,
            oversoldLevel: 20,
            period: 14
        };
        
        const config = { ...defaultOptions, ...options };
        
        // Última entrada con MFI calculado
        const lastIndex = data.length - 1;
        
        // Verificar si hay suficientes datos
        if (lastIndex < config.period) {
            return { 
                longSignal: false, 
                shortSignal: false,
                signal: 'NEUTRAL',
                confidence: 'BAJA',
                currentMFI: 50,  // Valor neutro por defecto
                longStrength: 0,
                shortStrength: 0,
                reasoning: 'Datos insuficientes para MFI'
            };
        }
        
        const lastData = data[lastIndex];
        const prevData = data[lastIndex - 1];
        
        // Comprobar valores válidos
        if (isNaN(lastData.mfi)) {
            return {
                longSignal: false,
                shortSignal: false,
                signal: 'NEUTRAL',
                confidence: 'BAJA',
                currentMFI: 50,
                longStrength: 0,
                shortStrength: 0,
                reasoning: 'MFI no calculable'
            };
        }
        
        // Preparar objeto de señales con datos actuales de MFI
        const signals = {
            currentMFI: lastData.mfi,
            isOverbought: lastData.mfi >= config.overboughtLevel,
            isOversold: lastData.mfi <= config.oversoldLevel,
            
            // Señales tradicionales
            longSignal: lastData.longSignal,
            shortSignal: lastData.shortSignal,
            bullishDivergence: lastData.bullishDivergence,
            bearishDivergence: lastData.bearishDivergence,
            
            // Nuevas señales avanzadas
            mfiDroppingInOverbought: lastData.mfiDroppingInOverbought,
            mfiRisingInOversold: lastData.mfiRisingInOversold,
            consistentMFIDowntrend: lastData.consistentMFIDowntrend,
            consistentMFIUptrend: lastData.consistentMFIUptrend,
            droppingFromHighMFI: lastData.droppingFromHighMFI,
            risingFromLowMFI: lastData.risingFromLowMFI,
            extremelyOverbought: lastData.extremelyOverbought,
            extremelyOversold: lastData.extremelyOversold,
            divergenceStrength: lastData.divergenceStrength
        };
        
        // Inicializar puntos (fortaleza) de señal
        signals.longStrength = 0;
        signals.shortStrength = 0;
        signals.signal = 'NEUTRAL';
        signals.confidence = 'BAJA';
        signals.reasoning = 'Análisis MFI sin señales claras';
        
        // Prioridades de señal (en orden de importancia)
        
        // 1. SEÑALES FUERTES - Prioridad más alta
        
        // Divergencias (señales muy fuertes)
        if (signals.bullishDivergence) {
            const strength = 4 + (signals.divergenceStrength || 1);
            signals.signal = 'LONG';
            signals.confidence = 'ALTA';
            signals.reasoning = `Divergencia alcista en MFI (${signals.currentMFI.toFixed(1)}) (+${strength})`;
            signals.longStrength = strength;
            return signals;
        }
        
        if (signals.bearishDivergence) {
            const strength = 4 + (signals.divergenceStrength || 1);
            signals.signal = 'SHORT';
            signals.confidence = 'ALTA';
            signals.reasoning = `Divergencia bajista en MFI (${signals.currentMFI.toFixed(1)}) (+${strength})`;
            signals.shortStrength = strength;
            return signals;
        }
        
        // MFI extremo
        if (signals.extremelyOverbought) {
            signals.signal = 'SHORT';
            signals.confidence = 'ALTA';
            signals.reasoning = `MFI extremadamente sobrecomprado (${signals.currentMFI.toFixed(1)}) (+4)`;
            signals.shortStrength = 4;
            return signals;
        }
        
        if (signals.extremelyOversold) {
            signals.signal = 'LONG';
            signals.confidence = 'ALTA';
            signals.reasoning = `MFI extremadamente sobrevendido (${signals.currentMFI.toFixed(1)}) (+4)`;
            signals.longStrength = 4;
            return signals;
        }
        
        // 2. SEÑALES DE CRUCE - Prioridad media-alta
        
        // Cruces de zonas (señales tradicionales)
        if (signals.longSignal) {
            signals.signal = 'LONG';
            signals.confidence = 'MEDIA';
            signals.reasoning = `MFI salió de zona de sobreventa (${signals.currentMFI.toFixed(1)}) (+3)`;
            signals.longStrength = 3;
            return signals;
        }
        
        if (signals.shortSignal) {
            signals.signal = 'SHORT';
            signals.confidence = 'MEDIA';
            signals.reasoning = `MFI salió de zona de sobrecompra (${signals.currentMFI.toFixed(1)}) (+3)`;
            signals.shortStrength = 3;
            return signals;
        }
        
        // 3. SEÑALES DE MOVIMIENTO DENTRO DE ZONAS - Prioridad media
        
        // Movimientos significativos dentro de zonas extremas
        if (signals.mfiDroppingInOverbought) {
            signals.signal = 'SHORT';
            signals.confidence = 'MEDIA';
            signals.reasoning = `MFI bajando en zona de sobrecompra (${signals.currentMFI.toFixed(1)}) (+2.5)`;
            signals.shortStrength = 2.5;
            return signals;
        }
        
        if (signals.mfiRisingInOversold) {
            signals.signal = 'LONG';
            signals.confidence = 'MEDIA';
            signals.reasoning = `MFI subiendo en zona de sobreventa (${signals.currentMFI.toFixed(1)}) (+2.5)`;
            signals.longStrength = 2.5;
            return signals;
        }
        
        // 4. SEÑALES DE TENDENCIA - Prioridad media-baja
        
        if (signals.droppingFromHighMFI) {
            signals.signal = 'SHORT';
            signals.confidence = 'MEDIA';
            signals.reasoning = `MFI cayendo desde nivel alto reciente (${signals.currentMFI.toFixed(1)}) (+2)`;
            signals.shortStrength = 2;
            return signals;
        }
        
        if (signals.risingFromLowMFI) {
            signals.signal = 'LONG';
            signals.confidence = 'MEDIA';
            signals.reasoning = `MFI subiendo desde nivel bajo reciente (${signals.currentMFI.toFixed(1)}) (+2)`;
            signals.longStrength = 2;
            return signals;
        }
        
        // Tendencias consistentes
        if (signals.consistentMFIDowntrend && signals.currentMFI > 50) {
            signals.signal = 'SHORT';
            signals.confidence = 'BAJA';
            signals.reasoning = `Tendencia bajista consistente en MFI (${signals.currentMFI.toFixed(1)}) (+1.5)`;
            signals.shortStrength = 1.5;
            return signals;
        }
        
        if (signals.consistentMFIUptrend && signals.currentMFI < 50) {
            signals.signal = 'LONG';
            signals.confidence = 'BAJA';
            signals.reasoning = `Tendencia alcista consistente en MFI (${signals.currentMFI.toFixed(1)}) (+1.5)`;
            signals.longStrength = 1.5;
            return signals;
        }
        
        // 5. SEÑALES DE ZONA (más débiles) - Prioridad baja
        
        // Solo estar en zonas extremas (señales más débiles)
        if (signals.isOverbought) {
            signals.signal = 'SHORT';
            signals.confidence = 'BAJA';
            signals.reasoning = `MFI en zona de sobrecompra (${signals.currentMFI.toFixed(1)}) (+1)`;
            signals.shortStrength = 1;
            return signals;
        }
        
        if (signals.isOversold) {
            signals.signal = 'LONG';
            signals.confidence = 'BAJA';
            signals.reasoning = `MFI en zona de sobreventa (${signals.currentMFI.toFixed(1)}) (+1)`;
            signals.longStrength = 1;
            return signals;
        }
        
        // Si no hay señales claras, devolver NEUTRAL
        return signals;
    },
    
    /**
     * Genera configuración de gráfico para Plotly
     * @param {Array} data - Datos procesados
     * @param {Boolean} isSeparateChart - Si es un gráfico separado
     * @returns {Object} - Configuración de trazas y layout
     */
    getChartConfig: function(data, isSeparateChart = false) {
        if (!data || data.length < 14 || !data[data.length-1].mfi) {
            return { traces: [], layoutUpdates: {} };
        }
        
        // Crear trazas para MFI
        const mfiTrace = {
            x: data.map(d => d.timestamp),
            y: data.map(d => d.mfi || null),
            type: 'scatter',
            mode: 'lines',
            name: 'MFI Combinado',
            line: {color: 'purple', width: 1.5}
        };
        
        // Líneas de sobrecompra/sobreventa
        const overboughtLine = {
            x: data.map(d => d.timestamp),
            y: Array(data.length).fill(80),
            type: 'scatter',
            mode: 'lines',
            name: 'Sobrecompra',
            line: {color: 'red', width: 1, dash: 'dash'},
            showlegend: false
        };
        
        const oversoldLine = {
            x: data.map(d => d.timestamp),
            y: Array(data.length).fill(20),
            type: 'scatter',
            mode: 'lines',
            name: 'Sobreventa',
            line: {color: 'green', width: 1, dash: 'dash'},
            showlegend: false
        };
        
        // Configuración de layout
        const layoutConfig = isSeparateChart ? 
            {
                yaxis: {
                    title: 'MFI Combinado',
                    range: [0, 100]
                }
            } : 
            {
                yaxis2: {
                    title: 'MFI Combinado',
                    overlaying: 'y',
                    side: 'right',
                    range: [0, 100],
                    showgrid: false
                }
            };
        
        return {
            traces: [mfiTrace, overboughtLine, oversoldLine],
            layoutUpdates: layoutConfig
        };
    }
};

// Exportar el módulo para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MFIIndicator;
} else {
    // Si no estamos en un entorno Node.js, exponer al objeto global (window)
    window.MFIIndicator = MFIIndicator;
}