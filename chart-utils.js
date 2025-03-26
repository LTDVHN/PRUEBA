/**
 * Chart Utils Module - IMPROVED VERSION
 * Funciones para crear y manipular gráficos en el Dashboard de Criptomonedas
 */
// Función de utilidad para obtener color dinámicamente
function getDynamicColor(colorType, isPositive = true, intensity = 1) {
    const rootStyles = getComputedStyle(document.documentElement);
    
    switch(colorType) {
        case 'line':
            return isPositive ? 
                rootStyles.getPropertyValue('--chart-spot-line') : 
                rootStyles.getPropertyValue('--chart-futures-line');
        
        case 'flow':
            if (isPositive === null) {
                return rootStyles.getPropertyValue('--chart-neutral-flow');
            }
            return isPositive ? 
                rootStyles.getPropertyValue('--chart-positive-flow') : 
                rootStyles.getPropertyValue('--chart-negative-flow');
        
        default:
            return isPositive ? 
                rootStyles.getPropertyValue('--chart-spot-line') : 
                rootStyles.getPropertyValue('--chart-futures-line');
    }
}
// Objeto principal que contendrá todas las funciones de visualización
const ChartUtils = {
    
    /**
     * Genera el HTML para los contenedores de gráficos
     * @param {Array} metrics - Métricas de criptomonedas
     * @param {String} marketType - Tipo de mercado (spot, futures, combined)
     * @returns {String} - HTML para los contenedores de gráficos
     */
    generateChartsHTML: function(metrics, marketType) {
        if (!metrics || metrics.length === 0) {
            return "<p>No hay datos disponibles para gráficos</p>";
        }
        
        // Limitar a los 6 primeros para no sobrecargar la página
        const topMetrics = metrics.slice(0, 6);
        let chartsHTML = '';
        
        for (let i = 0; i < topMetrics.length; i++) {
            const chartId = `chart-${i}`;
            // Aumentar la altura de los gráficos para evitar superposición
            const chartHeight = marketType === 'combined' ? '700px' : '400px';
            chartsHTML += `<div class="chart"><div id="${chartId}" style="height:${chartHeight}"></div></div>`;
        }
        
        return chartsHTML;
    },
    
    /**
     * Inicializa y muestra todos los gráficos en la pantalla
     * @param {Array} metrics - Métricas de criptomonedas
     * @param {String} marketType - Tipo de mercado
     * @param {Object} allData - Datos de todas las criptomonedas
     * @param {HTMLElement} container - Contenedor donde mostrar los gráficos
     */
    displayCharts: function(metrics, marketType, allData, container) {
        if (!metrics || metrics.length === 0) {
            container.innerHTML = "<p>No hay datos disponibles para gráficos</p>";
            return;
        }
        
        // Limitar a los 6 primeros para no sobrecargar la página
        const topMetrics = metrics.slice(0, 6);
        let chartsHTML = '';
        
        // Si es tipo combinado, usar la lógica original
        if (marketType === 'combined') {
            for (let i = 0; i < topMetrics.length; i++) {
                const chartId = `chart-${i}`;
                chartsHTML += `<div class="chart"><div id="${chartId}" style="height:700px"></div></div>`;
            }
            container.innerHTML = chartsHTML;
            
            setTimeout(() => {
                for (let i = 0; i < topMetrics.length; i++) {
                    const metric = topMetrics[i];
                    const chartId = `chart-${i}`;
                    this.createCombinedChart(metric, chartId, i, allData);
                }
            }, 100);
            return;
        }
        
        // Para spot, futures o both
        if (marketType === 'both') {
            for (let i = 0; i < topMetrics.length; i++) {
                const baseSymbol = topMetrics[i].symbol.split('_')[0];
                chartsHTML += `
                    <div class="chart">
                        <div id="chart-${i}" style="height:800px"></div>
                    </div>`;
            }
        } else {
            // Para spot o futures individual
            for (let i = 0; i < topMetrics.length; i++) {
                const chartId = `chart-${i}`;
                chartsHTML += `<div class="chart"><div id="${chartId}" style="height:800px"></div></div>`;
            }
        }
        
        container.innerHTML = chartsHTML;
        
        // Crear los gráficos después de un breve retraso
        setTimeout(() => {
            for (let i = 0; i < topMetrics.length; i++) {
                const metric = topMetrics[i];
                const chartId = `chart-${i}`;
                this.createSingleMarketChart(metric, chartId, i, allData);
            }
        }, 100);
    },
    
    /**
     * Crea un gráfico para un mercado único (spot o futuros)
     * @param {Object} metric - Métricas de la criptomoneda
     * @param {String} chartId - ID del elemento donde crear el gráfico
     * @param {Number} index - Índice del gráfico
     * @param {Object} allData - Datos de todas las criptomonedas
     */
    createSingleMarketChart: function(metric, chartId, index, allData) {
        // Extraer símbolo base y tipo de mercado
        const symbolParts = metric.symbol.split('_');
        const baseSymbol = symbolParts[0];
        const marketType = metric.market_type || (symbolParts.length > 1 ? symbolParts[1] : "spot");
        
        // Construir la clave correcta y obtener datos
        const cryptoKey = `${baseSymbol}_${marketType}`;
        const df = allData[cryptoKey];
        
        if (!df || !df.length) {
            return;
        }
    
        // Crear contenedor nuevo con altura forzada
        document.getElementById(chartId).style.height = '800px';
        
        // CREAR 4 GRÁFICOS SEPARADOS
        
        // 1. Gráfico de Precios (Superior)
        const priceDiv = document.createElement('div');
        priceDiv.id = `${chartId}-price`;
        priceDiv.style.height = '230px';
        priceDiv.style.marginBottom = '20px';
                
        // 2. Gráfico de Flujo (Medio)
        const flowDiv = document.createElement('div');
        flowDiv.id = `${chartId}-flow`;
        flowDiv.style.height = '180px';
        flowDiv.style.marginBottom = '20px';
                
        // 3. Gráfico de Base (Inferior)
        const baseDiv = document.createElement('div');
        baseDiv.id = `${chartId}-base`;
        baseDiv.style.height = '170px';
    
        // 4. Gráfico de MFI (Nuevo)
        const mfiDiv = document.createElement('div');
        mfiDiv.id = `${chartId}-mfi`;
        mfiDiv.style.height = '170px';
        mfiDiv.style.marginBottom = '20px';
                
        // Añadir todos los divs al contenedor principal
        const container = document.getElementById(chartId);
        container.innerHTML = '';
        container.appendChild(priceDiv);
        container.appendChild(flowDiv);
        container.appendChild(baseDiv);
        container.appendChild(mfiDiv);
    
        // Título principal
        const titleDiv = document.createElement('div');
        titleDiv.style.textAlign = 'center';
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.fontSize = '14px';
        titleDiv.style.marginBottom = '10px';
        const marketDisplay = marketType.charAt(0).toUpperCase() + marketType.slice(1);
        titleDiv.innerHTML = `#${index+1} - ${baseSymbol} ${marketDisplay} - ${metric.signal}${metric.confidence ? ' - Confianza: ' + metric.confidence : ''}`;
        container.insertBefore(titleDiv, priceDiv);
        
        // GRÁFICO 1: PRECIOS
        const priceLayout = {
            title: {
                text: 'Precios',
                font: {size: 13}
            },
            height: 230,
            margin: {l: 50, r: 40, t: 40, b: 20},
            showlegend: true,
            legend: {
                orientation: 'h', 
                y: 1.1
            },
            xaxis: {
                showticklabels: false
            },
            yaxis: {
                title: {
                    text: 'Precio',
                    font: {size: 11}
                }
            }
        };
        
        const priceTrace = {
            x: df.map(d => d.timestamp),
            y: df.map(d => d.close),
            type: 'scatter',
            mode: 'lines',
            name: 'Precio',
            line: {
                color: getDynamicColor('line', marketType === 'spot'), 
                width: 2
            }
        };
        
        // Añadir señal si existe
        if (metric.signal !== 'NEUTRAL') {
            const lastIdx = df.length - 1;
            const lastPrice = df[lastIdx].close;
            const lastTime = df[lastIdx].timestamp;
            
            const confidenceColor = {
                'ALTA': 1.0,
                'MEDIA': 0.7,
                'BAJA': 0.4,
                'BÁSICA': 0.3
            }[metric.confidence] || 0.3;
            
            priceLayout.annotations = [{
                x: lastTime,
                y: lastPrice * (metric.signal === 'LONG' ? 1.03 : 0.97),
                text: metric.signal === 'LONG' 
                    ? `↑ ENTRADA ${metric.signal} (${metric.confidence || 'BAJA'})` 
                    : `↓ ENTRADA ${metric.signal} (${metric.confidence || 'BAJA'})`,
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowwidth: 2,
                arrowcolor: metric.signal === 'LONG' ? 'green' : 'red',
                bgcolor: metric.signal === 'LONG'
                    ? `rgba(0,200,0,${confidenceColor})`
                    : `rgba(200,0,0,${confidenceColor})`,
                font: {color: 'white', size: 12, family: 'Arial'},
                bordercolor: 'white',
                borderwidth: 1,
                borderpad: 4,
                opacity: 0.9
            }];
        }
        
        // Burbujas de flujo de capital en el gráfico de precios
        const maxVolume = Math.max(...df.map(d => d.quote_volume || 0));
        const sizes = df.map(d => ((d.quote_volume / maxVolume) * 30) + 5);
        
        const colors = df.map(d => {
            if (isNaN(d.directional_force)) {
                return getDynamicColor('flow', null);
            } else {
                return getDynamicColor('flow', d.directional_force > 0);
            }
        });
        
        const bubblesTrace = {
            x: df.map(d => d.timestamp),
            y: df.map(d => d.close),
            type: 'scatter',
            mode: 'markers',
            name: 'Flujo de Capital',
            marker: {
                size: sizes,
                color: colors,
                line: {width: 1, color: 'rgba(255,255,255,0.5)'}
            }
        };
    
        Plotly.newPlot(`${chartId}-price`, [priceTrace, bubblesTrace], priceLayout);
        
        // GRÁFICO 2: FLUJO DE CAPITAL
        const flowLayout = {
            title: {
                text: 'Flujo de Capital',
                font: {size: 13}
            },
            height: 180,
            margin: {l: 50, r: 40, t: 40, b: 20},
            showlegend: true,
            legend: {
                orientation: 'h', 
                y: 1.1
            },
            xaxis: {
                showticklabels: false
            },
            yaxis: {
                title: {
                    text: 'Flujo',
                    font: {size: 11}
                }
            }
        };
        
        const flowTrace = {
            x: df.map(d => d.timestamp),
            y: df.map(d => d.capital_flow),
            type: 'bar',
            name: 'Flujo de Capital',
            marker: {
                color: df.map(d => getDynamicColor('flow', d.capital_flow >= 0))
            }
        };
        
        Plotly.newPlot(`${chartId}-flow`, [flowTrace], flowLayout);
        
        // GRÁFICO 3: BASE/DIFERENCIAL
        const avgPriceLayout = {
            title: {
                text: 'Precio Promedio',
                font: {size: 13}
            },
            height: 170,
            margin: {l: 50, r: 40, t: 40, b: 40},
            showlegend: false,
            xaxis: {
                title: {
                    text: 'Hora (UTC)',
                    font: {size: 11}
                }
            },
            yaxis: {
                title: {
                    text: 'Precio Promedio',
                    font: {size: 11}
                }
            }
        };
        
        // Calcular precio promedio móvil
        const period = 20;
        const avgPrices = [];
        for (let i = 0; i < df.length; i++) {
            if (i < period - 1) {
                avgPrices.push(null);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += df[i - j].close;
            }
            avgPrices.push(sum / period);
        }
        
        const avgPriceTrace = {
            x: df.map(d => d.timestamp),
            y: avgPrices,
            type: 'scatter',
            mode: 'lines',
            name: 'Precio Promedio',
            line: {color: 'rgba(255,165,0,0.8)', width: 2}
        };
        
        Plotly.newPlot(`${chartId}-base`, [avgPriceTrace], avgPriceLayout);
    
        // GRÁFICO 4: MFI
        const mfiLayout = {
            title: {
                text: 'Money Flow Index',
                font: {size: 13}
            },
            height: 170,
            margin: {l: 50, r: 40, t: 40, b: 20},
            showlegend: true,
            legend: {
                orientation: 'h', 
                y: 1.1
            },
            xaxis: {
                showticklabels: true
            },
            yaxis: {
                title: {
                    text: 'MFI',
                    font: {size: 11}
                },
                range: [0, 120],  // Forzar escala de 0 a 100
                dtick: 20,        // Mostrar marcas cada 20 unidades
                tickmode: 'linear'
            }
        };
    
        if (window.MFIIndicator && df.length > 15) {
            const mfiData = window.MFIIndicator.calculate(df);
    
            const mfiTrace = {
                x: mfiData.map(d => d.timestamp),
                y: mfiData.map(d => d.mfi),
                type: 'scatter',
                mode: 'lines',
                name: 'MFI',
                line: {color: 'rgba(0,100,255,0.8)', width: 2}
            };
    
            const overboughtLine = {
                x: mfiData.map(d => d.timestamp),
                y: Array(mfiData.length).fill(80),
                type: 'scatter',
                mode: 'lines',
                name: 'Sobrecompra',
                line: {color: 'rgba(255,100,0,0.8)', width: 2}
            };
    
            const oversoldLine = {
                x: mfiData.map(d => d.timestamp),
                y: Array(mfiData.length).fill(20),
                type: 'scatter',
                mode: 'lines',
                name: 'Sobreventa',
                line: {color: 'rgba(0,200,0,0.8)', width: 2}
            };
    
            Plotly.newPlot(`${chartId}-mfi`, [mfiTrace, overboughtLine, oversoldLine], mfiLayout);
        }
    },
    
    /**
     * Crea un gráfico combinado (spot + futuros) - SOLUCIÓN MEJORADA
     * @param {Object} metric - Métricas combinadas de la criptomoneda
     * @param {String} chartId - ID del elemento donde crear el gráfico
     * @param {Number} index - Índice del gráfico
     * @param {Object} allData - Datos de todas las criptomonedas
     */
    createCombinedChart: function(metric, chartId, index, allData) {
        if (!metric.spot_data || !metric.futures_data) {
            return;
        }
        
        const spotData = metric.spot_data;
        const futuresData = metric.futures_data;
        
        if (!spotData.length || !futuresData.length) {
            return;
        }
    
        // Crear contenedor nuevo con altura forzada
        document.getElementById(chartId).style.height = '1000px';
        
        // Calcular basis (diferencial)
        const timestamps = [];
        const basisValues = [];
        
        for (let i = 0; i < spotData.length; i++) {
            const spotTime = spotData[i].timestamp;
            const spotPrice = spotData[i].close;
            
            // Encontrar el precio de futuros más cercano en tiempo
            const matchingFutures = futuresData.find(f => 
                f.timestamp.getTime() === spotTime.getTime()
            );
            
            if (matchingFutures) {
                const futuresPrice = matchingFutures.close;
                const basis = (futuresPrice / spotPrice - 1) * 100;  // En porcentaje
                
                timestamps.push(spotTime);
                basisValues.push(basis);
            }
        }
    
        // CREAR 4 GRÁFICOS SEPARADOS
        
        // 1. Gráfico de Precios (Superior)
        const priceDiv = document.createElement('div');
        priceDiv.id = `${chartId}-price`;
        priceDiv.style.height = '230px';
        priceDiv.style.marginBottom = '20px';
                
        // 2. Gráfico de Flujo (Medio)
        const flowDiv = document.createElement('div');
        flowDiv.id = `${chartId}-flow`;
        flowDiv.style.height = '180px';
        flowDiv.style.marginBottom = '20px';
                
        // 3. Gráfico de Base (Inferior)
        const baseDiv = document.createElement('div');
        baseDiv.id = `${chartId}-base`;
        baseDiv.style.height = '170px';
    
        // 4. Gráfico de MFI (Nuevo)
        const mfiDiv = document.createElement('div');
        mfiDiv.id = `${chartId}-mfi`;
        mfiDiv.style.height = '170px';
        mfiDiv.style.marginBottom = '20px';
                
        // Añadir todos los divs al contenedor principal
        const container = document.getElementById(chartId);
        container.innerHTML = '';
        container.appendChild(priceDiv);
        container.appendChild(flowDiv);
        container.appendChild(baseDiv);
        container.appendChild(mfiDiv);
    
        // Título principal
        const titleDiv = document.createElement('div');
        titleDiv.style.textAlign = 'center';
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.fontSize = '14px';
        titleDiv.style.marginBottom = '10px';
        titleDiv.innerHTML = `#${index+1} - ${metric.base_symbol} COMBINADO - ${metric.signal}${metric.confidence ? ' - Confianza: ' + metric.confidence : ''}${metric.markets_agreement ? ' - Mercados en concordancia' : ' - Mercados en discordancia'}`;
        container.insertBefore(titleDiv, priceDiv);
        
        // GRÁFICO 1: PRECIOS
        const priceLayout = {
            title: {
                text: 'Precios: Spot vs Futuros',
                font: {size: 13}
            },
            height: 230,
            margin: {l: 50, r: 40, t: 40, b: 20},
            showlegend: true,
            legend: {
                orientation: 'h', 
                y: 1.1
            },
            xaxis: {
                showticklabels: false
            },
            yaxis: {
                title: {
                    text: 'Precio',
                    font: {size: 11}
                }
            }
        };
        
        const spotPrices = {
            x: spotData.map(d => d.timestamp),
            y: spotData.map(d => d.close),
            type: 'scatter',
            mode: 'lines',
            name: 'Precio Spot',
            line: {
                color: getDynamicColor('line', true), 
                width: 2
            }
        };
        
        const futuresPrices = {
            x: futuresData.map(d => d.timestamp),
            y: futuresData.map(d => d.close),
            type: 'scatter',
            mode: 'lines',
            name: 'Precio Futuros',
            line: {
                color: getDynamicColor('line', false), 
                width: 2
            }
        };
        
        // Añadir señal si existe
        if (metric.signal !== 'NEUTRAL') {
            // Obtener último punto para la anotación
            const lastSpot = spotData[spotData.length - 1];
            const lastTime = lastSpot.timestamp;
            const lastPrice = lastSpot.close;
            
            const confidenceColor = {
                'ALTA': 1.0,
                'MEDIA': 0.7,
                'BAJA': 0.4,
                'BÁSICA': 0.3
            }[metric.confidence] || 0.3;
            
            // Crear texto de la señal
            const signalText = metric.signal === 'LONG' 
                ? `↑ ENTRADA ${metric.signal} (${metric.confidence || 'BAJA'})` 
                : `↓ ENTRADA ${metric.signal} (${metric.confidence || 'BAJA'})`;
            
            // Añadir anotación en el subplot de precios
            priceLayout.annotations = [{
                x: lastTime,
                y: lastPrice * (metric.signal === 'LONG' ? 1.03 : 0.97), // Alejar más la etiqueta
                text: signalText,
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowwidth: 2,
                arrowcolor: metric.signal === 'LONG' ? 'green' : 'red',
                bgcolor: metric.signal === 'LONG'
                    ? `rgba(0,200,0,${confidenceColor})`
                    : `rgba(200,0,0,${confidenceColor})`,
                font: {color: 'white', size: 12, family: 'Arial'},
                bordercolor: 'white',
                borderwidth: 1,
                borderpad: 4,
                opacity: 0.9
            }];
        }
        
        Plotly.newPlot(`${chartId}-price`, [spotPrices, futuresPrices], priceLayout);
        
        // GRÁFICO 2: FLUJO DE CAPITAL
        const flowLayout = {
            title: {
                text: 'Flujo de Capital',
                font: {size: 13}
            },
            height: 180,
            margin: {l: 50, r: 40, t: 40, b: 20},
            showlegend: true,
            legend: {
                orientation: 'h', 
                y: 1.1
            },
            xaxis: {
                showticklabels: false
            },
            yaxis: {
                title: {
                    text: 'Flujo',
                    font: {size: 11}
                }
            }
        };
        
        const spotFlow = {
            x: spotData.map(d => d.timestamp),
            y: spotData.map(d => d.capital_flow),
            type: 'bar',
            name: 'Flujo Spot',
            marker: {
                color: spotData.map(d => getDynamicColor('flow', d.capital_flow >= 0))
            }
        };
        
        const futuresFlow = {
            x: futuresData.map(d => d.timestamp),
            y: futuresData.map(d => d.capital_flow),
            type: 'bar',
            name: 'Flujo Futuros',
            marker: {
                color: futuresData.map(d => getDynamicColor('flow', d.capital_flow >= 0))
            },
            opacity: 0.8
        };
        
        Plotly.newPlot(`${chartId}-flow`, [spotFlow, futuresFlow], flowLayout);
        
        // GRÁFICO 3: BASE/DIFERENCIAL
        const baseLayout = {
            title: {
                text: 'Base/Diferencial',
                font: {size: 13}
            },
            height: 170,
            margin: {l: 50, r: 40, t: 40, b: 40},
            showlegend: false,
            xaxis: {
                title: {
                    text: 'Hora (UTC)',
                    font: {size: 11}
                }
            },
            yaxis: {
                title: {
                    text: 'Base (%)',
                    font: {size: 11}
                },
                zeroline: true,
                zerolinecolor: 'rgba(128, 128, 128, 0.7)',
                zerolinewidth: 1
            }
        };
        
        const basisTrace = {
            x: timestamps,
            y: basisValues,
            type: 'scatter',
            mode: 'lines',
            name: 'Base (%)',
            line: {color: 'rgba(255,165,0,0.8)', width: 2},
            fill: 'tozeroy',
            fillcolor: 'rgba(255,165,0,0.1)'
        };
        
        Plotly.newPlot(`${chartId}-base`, [basisTrace], baseLayout);
    
        // 4. GRÁFICO DE MFI
        const mfiLayout = {
            title: {
                text: 'Money Flow Index (Combinado)',
                font: {size: 13}
            },
            height: 170,
            margin: {l: 50, r: 40, t: 40, b: 20},
            showlegend: true,
            legend: {
                orientation: 'h', 
                y: 1.1
            },
            xaxis: {
                showticklabels: false
            },
            yaxis: {
                title: {
                    text: 'MFI',
                    font: {size: 11}
                },
                range: [0, 120],     // Forzar escala de 0 a 100
                dtick: 20,           // Mostrar marcas cada 20 unidades
                tickmode: 'linear'   // Asegurar divisiones lineales
            }
        };
    
        // Verificar que MFI esté disponible
        if (window.MFIIndicator) {
            // Usar método de cálculo combinado
            const mfiSpotData = window.MFIIndicator.calculate(
                metric.spot_data, 
                metric.futures_data, 
                {
                    combinationMethod: 'weighted', 
                    period: 14
                }
            );
    
            const mfiTrace = {
                x: mfiSpotData.map(d => d.timestamp),
                y: mfiSpotData.map(d => d.mfi),
                type: 'scatter',
                mode: 'lines',
                name: 'MFI Combinado',
                line: {color: 'rgba(0,100,255,0.8)', width: 2}
            };
    
            const overboughtLine = {
                x: mfiSpotData.map(d => d.timestamp),
                y: Array(mfiSpotData.length).fill(80),
                type: 'scatter',
                mode: 'lines',
                name: 'Sobrecompra',
                line: {color: 'rgba(255,100,0,0.8)', width: 2}
            };
    
            const oversoldLine = {
                x: mfiSpotData.map(d => d.timestamp),
                y: Array(mfiSpotData.length).fill(20),
                type: 'scatter',
                mode: 'lines',
                name: 'Sobreventa',
                line: {color: 'rgba(0,200,0,0.8)', width: 2}
            };
    
            Plotly.newPlot(`${chartId}-mfi`, 
                [mfiTrace, overboughtLine, oversoldLine], 
                mfiLayout
            );
        }
    },
    
    /**
     * Genera HTML para la tabla de métricas - VERSIÓN CORREGIDA
     * @param {Array} metrics - Métricas de criptomonedas
     * @param {String} marketType - Tipo de mercado
     * @param {Object} allData - Datos completos para acceder a información adicional
     * @returns {String} - HTML para la tabla de métricas
     */
    generateMetricsTableHTML: function(metrics, marketType, allData) {
        if (!metrics || metrics.length === 0) {
            return "<p>No hay datos disponibles</p>";
        }
        
        // Ordenar por magnitud absoluta de flujo de capital
        metrics.sort((a, b) => Math.abs(b.capital_flow) - Math.abs(a.capital_flow));
        
        // Crear encabezado de tabla según el tipo de mercado
        let tableHeader;
        
        if (marketType === 'combined') {
            tableHeader = `
                <tr>
                    <th style="width:30px;text-align:center">#</th>
                    <th style="width:60px;text-align:left">Par</th>
                    <th style="width:80px;text-align:right">Spot</th>
                    <th style="width:80px;text-align:right">Futuros</th>
                    <th style="width:60px;text-align:right">Basis</th>
                    <th style="width:90px;text-align:right">Flujo Comb.</th>
                    <th style="width:90px;text-align:right">Flujo Spot</th>
                    <th style="width:90px;text-align:right">Flujo Fut.</th>
                    <th style="width:60px;text-align:right">Fuerza</th>
                    <th style="width:50px;text-align:center">MFI</th>
                    <th style="width:70px;text-align:center">Congr.</th>
                    <th style="width:120px;text-align:center">Señal</th>
                </tr>
            `;
        } else {
            tableHeader = `
                <tr>
                    <th style="width:30px;text-align:center">#</th>
                    <th style="width:60px;text-align:left">Par</th>
                    <th style="width:70px;text-align:center">Mercado</th>
                    <th style="width:80px;text-align:right">Precio</th>
                    <th style="width:60px;text-align:right">Cambio</th>
                    <th style="width:100px;text-align:right">Flujo Cap.</th>
                    <th style="width:70px;text-align:right">Fuerza</th>
                    <th style="width:70px;text-align:right">Conc.</th>
                    <th style="width:70px;text-align:right">Impulso</th>
                    <th style="width:50px;text-align:center">MFI</th>
                    <th style="width:70px;text-align:right">Diverg.</th>
                    <th style="width:120px;text-align:center">Señal</th>
                </tr>
            `;
        }
        
        // Construir filas
        let tableRows = '';
        
        for (let i = 0; i < metrics.length; i++) {
            const metric = metrics[i];
            
            if (marketType === 'combined') {
                tableRows += this._generateCombinedTableRow(metric, i, allData);
            } else {
                tableRows += this._generateSingleMarketTableRow(metric, i, allData);
            }
        }
        
        // Crear la tabla HTML completa con scroll horizontal
        return `
            <div style="overflow-x: auto;">
                <table style="min-width: 1000px;">
                    <thead>
                        ${tableHeader}
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Genera HTML para una fila de tabla de mercado combinado - VERSIÓN CORREGIDA
     * @private
     * @param {Object} metric - Métricas de la criptomoneda 
     * @param {Number} index - Índice de la fila
     * @param {Object} allData - Datos completos para acceder a MFI
     * @returns {String} - HTML para la fila de tabla
     */
    _generateCombinedTableRow: function(metric, index, allData) {
        // Determinar colores
        const flowSpotColor = metric.capital_flow_spot >= 0 ? 'positive' : 'negative';
        const flowFuturesColor = metric.capital_flow_futures >= 0 ? 'positive' : 'negative';
        const flowCombinedColor = metric.capital_flow >= 0 ? 'positive' : 'negative';
        const basisColor = metric.basis > 0 ? 'positive' : 'negative';
        const forceColor = metric.directional_force > 0 ? 'positive' : 'negative';
        
        // Obtener valores MFI para spot y futuros
        let spotMFI = metric.spot_data && metric.spot_data.length > 0 && metric.spot_data[metric.spot_data.length - 1].mfi ? 
            metric.spot_data[metric.spot_data.length - 1].mfi : null;
        let futuresMFI = metric.futures_data && metric.futures_data.length > 0 && metric.futures_data[metric.futures_data.length - 1].mfi ? 
            metric.futures_data[metric.futures_data.length - 1].mfi : null;

        // Calcular MFI combinado si ambos están disponibles
        let combinedMFI = null;
        let mfiColor = '';
        
        // Verificar si MFI está directamente disponible en las métricas
        if (metric.mfi !== undefined) {
            combinedMFI = metric.mfi;
        }
        // Si no, calcular del spot y futures
        else if (spotMFI !== null && futuresMFI !== null) {
            combinedMFI = (spotMFI + futuresMFI) / 2;
        }
        
        // Determinar color para MFI
        if (combinedMFI !== null) {
            if (combinedMFI > 80) {
                mfiColor = 'color: red';  // Sobrecompra
            } else if (combinedMFI < 20) {
                mfiColor = 'color: green';  // Sobreventa
            }
        }
        
        // Formato de números para evitar valores enormes
        const formatNumber = (num) => {
            if (Math.abs(num) >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            } else if (Math.abs(num) >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            } else {
                return num.toFixed(0);
            }
        };

        return `
            <tr style="background-color:${index % 2 === 0 ? '#f9f9f9' : 'white'}">
                <td style="text-align:center;font-weight:bold">${index+1}</td>
                <td style="font-weight:bold">${metric.base_symbol}</td>
                <td style="text-align:right">$${metric.price_spot.toFixed(4)}</td>
                <td style="text-align:right">$${metric.price_futures.toFixed(4)}</td>
                <td style="text-align:right" class="${basisColor}">${metric.basis.toFixed(2)}%</td>
                <td style="text-align:right" class="${flowCombinedColor}">${formatNumber(metric.capital_flow)}</td>
                <td style="text-align:right" class="${flowSpotColor}">${formatNumber(metric.capital_flow_spot)}</td>
                <td style="text-align:right" class="${flowFuturesColor}">${formatNumber(metric.capital_flow_futures)}</td>
                <td style="text-align:right" class="${forceColor}">${metric.directional_force.toFixed(2)}</td>
                <td style="text-align:center;font-weight:bold;${mfiColor}">${combinedMFI !== null ? combinedMFI.toFixed(1) : 'N/A'}</td>
                <td style="text-align:center;font-weight:bold;color:${metric.markets_agreement ? 'green' : 'red'}">
                    ${metric.markets_agreement ? '✓' : '✗'}
                </td>
                <td style="text-align:center">
                    <div class="signal-hover">
                        <span class="signal ${metric.signal === 'LONG' ? 'signal-long' : metric.signal === 'SHORT' ? 'signal-short' : 'signal-neutral'}">
                            ${metric.signal}
                            ${metric.confidence ? `<span class="confidence">(${metric.confidence})</span>` : ''}
                        </span>
                        ${metric.reasoning && metric.reasoning.length > 0 ? 
                        `<div class="reasoning-text">
                            <strong>Fundamentos de la señal:</strong>
                            ${metric.reasoning.map(reason => `<div class="reasoning-item">• ${reason}</div>`).join('')}
                        </div>` : ''}
                    </div>
                </td>
            </tr>
        `;
    },

    /**
     * Genera HTML para una fila de tabla de mercado único - VERSIÓN CORREGIDA
     * @private
     * @param {Object} metric - Métricas de la criptomoneda
     * @param {Number} index - Índice de la fila
     * @param {Object} allData - Datos completos para acceder a MFI
     * @returns {String} - HTML para la fila de tabla
     */
    _generateSingleMarketTableRow: function(metric, index, allData) {
        // Crear fila para modos normales (spot/futuros/ambos)
        const changeColor = metric.change_pct >= 0 ? 'positive' : 'negative';
        const flowColor = metric.capital_flow >= 0 ? 'positive' : 'negative';
        const forceColor = metric.directional_force >= 0 ? 'positive' : 'negative';
        const impulseColor = metric.impulse >= 0 ? 'positive' : 'negative';
        
        // Obtener símbolo y tipo de mercado por separado
        const symbolParts = metric.symbol.split('_');
        const symbolBase = symbolParts[0];
        const marketTypeShow = metric.market_type;
        
        // Obtener datos completos para MFI
        const cryptoKey = metric.symbol;
        let mfiValue = null;
        let mfiColor = '';
        
        // Primero intentar obtener MFI directamente de la métrica
        if (metric.mfi !== undefined) {
            mfiValue = metric.mfi;
            
            // Colorear MFI según zonas
            if (mfiValue > 80) {
                mfiColor = 'color: red';  // Sobrecompra
            } else if (mfiValue < 20) {
                mfiColor = 'color: green';  // Sobreventa
            }
        } 
        // Si no existe en la métrica, intentar buscarlo en allData
        else if (allData && cryptoKey in allData) {
            const df = allData[cryptoKey];
            if (df && df.length > 0 && df[df.length - 1].mfi !== undefined) {
                mfiValue = df[df.length - 1].mfi;
                
                // Colorear MFI según zonas
                if (mfiValue > 80) {
                    mfiColor = 'color: red';  // Sobrecompra
                } else if (mfiValue < 20) {
                    mfiColor = 'color: green';  // Sobreventa
                }
            }
        }
        
        
        return `
            <tr style="background-color:${index % 2 === 0 ? '#f9f9f9' : 'white'}">
                <td style="text-align:center;font-weight:bold">${index+1}</td>
                <td style="font-weight:bold">${symbolBase}</td>
                <td style="text-align:center;background-color:${marketTypeShow === 'spot' ? '#f0f8ff' : '#fff0f5'}">${marketTypeShow.charAt(0).toUpperCase() + marketTypeShow.slice(1)}</td>
                <td style="text-align:right">$${metric.price.toFixed(4)}</td>
                <td style="text-align:right" class="${changeColor}">${metric.change_pct.toFixed(2)}%</td>
                <td style="text-align:right" class="${flowColor}">${formatNumber(metric.capital_flow)}</td>
                <td style="text-align:right" class="${forceColor}">${metric.directional_force.toFixed(2)}</td>
                <td style="text-align:right">${metric.concentration.toFixed(1)}x</td>
                <td style="text-align:right" class="${impulseColor}">${metric.impulse.toFixed(1)}</td>
                <td style="text-align:center;font-weight:bold;${mfiColor}">${mfiValue !== null ? mfiValue.toFixed(1) : 'N/A'}</td>
                <td style="text-align:right">${metric.divergence.toFixed(1)}%</td>
                <td style="text-align:center">
                    <div class="signal-hover">
                        <span class="signal ${metric.signal === 'LONG' ? 'signal-long' : metric.signal === 'SHORT' ? 'signal-short' : 'signal-neutral'}">
                            ${metric.signal}
                            ${metric.confidence ? `<span class="confidence">(${metric.confidence})</span>` : ''}
                        </span>
                        ${metric.reasoning && metric.reasoning.length > 0 ? 
                        `<div class="reasoning-text">
                            <strong>Fundamentos de la señal:</strong>
                            ${metric.reasoning.map(reason => `<div class="reasoning-item">• ${reason}</div>`).join('')}
                        </div>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }
};

// Exportar el módulo para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartUtils;
} else {
    // Si no estamos en un entorno Node.js, exponer al objeto global (window)
    window.ChartUtils = ChartUtils;
}