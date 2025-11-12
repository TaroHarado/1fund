// Historical Funding Simulator (Vanilla JavaScript)
// Генерирует фейковые данные и отображает график без зависимостей

(function() {
  'use strict';

  // Список бирж из assets
  const EXCHANGES = [
    'aster', 'binance', 'bingx', 'bitget', 'bluefin', 'bybit', 'cryptocom',
    'drift', 'edgex', 'ethereal', 'extended', 'gateio', 'hibachi', 'huobi',
    'hyperliquid', 'kucoin', 'kuma', 'lighter', 'mexc', 'okx', 'pacifica',
    'paradex'
  ];

  // Цветовая схема для бирж
  const EXCHANGE_COLORS = {
    'aster': '#8B5CF6',
    'binance': '#F3BA2F',
    'bingx': '#0082FF',
    'bitget': '#0082FF',
    'bluefin': '#3B82F6',
    'bybit': '#F7A600',
    'cryptocom': '#103F68',
    'drift': '#00D4FF',
    'edgex': '#6366F1',
    'ethereal': '#10B981',
    'extended': '#F59E0B',
    'gateio': '#C99400',
    'hibachi': '#EF4444',
    'huobi': '#00D4FF',
    'hyperliquid': '#00D4FF',
    'kucoin': '#26A17B',
    'kuma': '#FF6B6B',
    'lighter': '#8B5CF6',
    'mexc': '#00D4FF',
    'okx': '#000000',
    'pacifica': '#06B6D4',
    'paradex': '#6366F1'
  };

  // Простой seed-based RNG
  function seededRandom(seed) {
    let value = seed;
    return function() {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
  }

  // Генерация random walk данных
  function generateRandomWalk(seed, numPoints, min = -5, max = 5) {
    const rng = seededRandom(seed);
    const data = [];
    let current = (rng() * (max - min) + min);
    
    for (let i = 0; i < numPoints; i++) {
      const change = (rng() - 0.5) * 0.5;
      current = Math.max(min, Math.min(max, current + change));
      data.push(current);
    }
    
    return data;
  }

  // Генерация seed
  function generateSeed(asset, exchange, startTime) {
    const str = `${asset}_${exchange}_${startTime}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Генерация данных
  function generateData(asset, startTime, endTime, randomSeed = 0) {
    const interval = 5 * 60 * 1000; // 5 минут
    const numPoints = Math.floor((endTime - startTime) / interval);
    
    const data = [];
    const exchanges = EXCHANGES;
    
    for (let i = 0; i < numPoints; i++) {
      const timestamp = startTime + i * interval;
      const point = { time: timestamp };
      
      exchanges.forEach(exchange => {
        const seed = generateSeed(asset, exchange, startTime) + randomSeed;
        const values = generateRandomWalk(seed, numPoints);
        point[exchange] = values[i];
      });
      
      data.push(point);
    }
    
    return data;
  }

  // Форматирование времени
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Отрисовка графика на canvas
  function drawChart(canvas, data, visibleExchanges, colors) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 40, right: 200, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Очистка
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(15, 15, 15, 0.9)';
    ctx.fillRect(0, 0, width, height);

    if (data.length === 0) return;

    // Масштабирование
    const minTime = data[0].time;
    const maxTime = data[data.length - 1].time;
    const timeRange = maxTime - minTime;
    const yMin = -5;
    const yMax = 5;
    const yRange = yMax - yMin;

    function x(time) {
      return padding.left + ((time - minTime) / timeRange) * chartWidth;
    }

    function y(value) {
      return padding.top + chartHeight - ((value - yMin) / yRange) * chartHeight;
    }

    // Сетка
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Горизонтальные линии (Y)
    for (let i = -5; i <= 5; i++) {
      const yPos = y(i);
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();
    }

    // Вертикальные линии (X) - каждые 2 часа
    const tickInterval = 2 * 60 * 60 * 1000;
    for (let t = minTime; t <= maxTime; t += tickInterval) {
      const xPos = x(t);
      ctx.beginPath();
      ctx.moveTo(xPos, padding.top);
      ctx.lineTo(xPos, height - padding.bottom);
      ctx.stroke();
    }

    // Линия y=0
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y(0));
    ctx.lineTo(width - padding.right, y(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Оси
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Подписи Y
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = -5; i <= 5; i++) {
      ctx.fillText(i.toString(), padding.left - 10, y(i));
    }

    // Подпись Y оси
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Funding (bps)', 0, 0);
    ctx.restore();

    // Подписи X
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let t = minTime; t <= maxTime; t += tickInterval) {
      const xPos = x(t);
      ctx.fillText(formatTime(t), xPos, height - padding.bottom + 10);
    }

    // Отрисовка линий
    visibleExchanges.forEach(exchange => {
      if (!data[0].hasOwnProperty(exchange)) return;

      ctx.strokeStyle = colors[exchange] || '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((point, index) => {
        const xPos = x(point.time);
        const yPos = y(point[exchange]);

        if (index === 0) {
          ctx.moveTo(xPos, yPos);
        } else {
          ctx.lineTo(xPos, yPos);
        }
      });

      ctx.stroke();
    });

    // Tooltip (при наведении)
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (mouseX < padding.left || mouseX > width - padding.right ||
          mouseY < padding.top || mouseY > height - padding.bottom) {
        return;
      }

      // Находим ближайшую точку
      const time = minTime + ((mouseX - padding.left) / chartWidth) * timeRange;
      let closestPoint = data[0];
      let minDist = Math.abs(data[0].time - time);

      data.forEach(point => {
        const dist = Math.abs(point.time - time);
        if (dist < minDist) {
          minDist = dist;
          closestPoint = point;
        }
      });

      // Показываем tooltip
      const tooltip = document.getElementById('chart-tooltip');
      if (tooltip) {
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 10) + 'px';
        tooltip.style.top = (e.clientY + 10) + 'px';
        tooltip.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 5px;">${formatTime(closestPoint.time)}</div>
          ${visibleExchanges.map(ex => {
            const value = closestPoint[ex];
            return `<div style="color: ${colors[ex]}">${ex.toUpperCase()}: ${value.toFixed(2)} bps</div>`;
          }).join('')}
        `;
      }
    });

    canvas.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById('chart-tooltip');
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    });
  }

  // Создание UI
  function createUI() {
    const container = document.createElement('div');
    container.id = 'historical-funding-simulator';
    container.style.cssText = `
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Заголовок и контролы
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;';

    const title = document.createElement('h1');
    title.textContent = 'Historical Funding Rates';
    title.style.cssText = 'font-size: 24px; margin: 0;';

    const controls = document.createElement('div');
    controls.style.cssText = 'display: flex; gap: 10px; align-items: center; flex-wrap: wrap;';

    // Asset selector
    const assetSelect = document.createElement('select');
    assetSelect.id = 'asset-select';
    ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'AVAX'].forEach(symbol => {
      const option = document.createElement('option');
      option.value = symbol;
      option.textContent = symbol;
      assetSelect.appendChild(option);
    });
    assetSelect.style.cssText = 'padding: 8px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff; font-size: 14px;';

    // Range selector
    const rangeSelect = document.createElement('select');
    rangeSelect.id = 'range-select';
    [
      { value: '4h', label: '4 Hours' },
      { value: '12h', label: '12 Hours' },
      { value: '24h', label: '24 Hours' },
      { value: '3d', label: '3 Days' },
      { value: '7d', label: '7 Days' },
      { value: '14d', label: '14 Days' },
      { value: '30d', label: '30 Days' }
    ].forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === '4h') option.selected = true;
      rangeSelect.appendChild(option);
    });
    rangeSelect.style.cssText = assetSelect.style.cssText;

    // Simulated toggle
    const simulatedLabel = document.createElement('label');
    simulatedLabel.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer;';
    const simulatedCheck = document.createElement('input');
    simulatedCheck.type = 'checkbox';
    simulatedCheck.id = 'simulated-check';
    simulatedCheck.checked = true;
    simulatedCheck.style.cursor = 'pointer';
    simulatedLabel.appendChild(simulatedCheck);
    simulatedLabel.appendChild(document.createTextNode('Simulated data'));

    // Randomize button
    const randomizeBtn = document.createElement('button');
    randomizeBtn.textContent = 'Randomize';
    randomizeBtn.id = 'randomize-btn';
    randomizeBtn.style.cssText = 'padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff; cursor: pointer; font-size: 14px;';

    controls.appendChild(assetSelect);
    controls.appendChild(rangeSelect);
    controls.appendChild(simulatedLabel);
    controls.appendChild(randomizeBtn);
    header.appendChild(title);
    header.appendChild(controls);

    // График контейнер
    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = 'position: relative; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 20px; border: 1px solid rgba(255,255,255,0.1);';

    const canvas = document.createElement('canvas');
    canvas.id = 'funding-chart';
    canvas.width = 1200;
    canvas.height = 600;
    canvas.style.cssText = 'width: 100%; max-width: 100%; height: auto;';

    // Легенда
    const legend = document.createElement('div');
    legend.id = 'chart-legend';
    legend.style.cssText = `
      position: absolute;
      right: 20px;
      top: 20px;
      background: rgba(0,0,0,0.8);
      padding: 15px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      max-height: 400px;
      overflow-y: auto;
      z-index: 10;
    `;

    EXCHANGES.forEach(exchange => {
      const item = document.createElement('div');
      item.dataset.exchange = exchange;
      item.style.cssText = 'display: flex; align-items: center; padding: 8px; cursor: pointer; opacity: 1; color: #fff;';
      
      const colorBox = document.createElement('div');
      colorBox.style.cssText = `width: 12px; height: 12px; background: ${EXCHANGE_COLORS[exchange]}; margin-right: 8px; border-radius: 2px;`;
      
      const label = document.createElement('span');
      label.textContent = exchange.toUpperCase();
      label.style.fontSize = '12px';
      
      item.appendChild(colorBox);
      item.appendChild(label);
      
      item.addEventListener('click', () => {
        const isVisible = item.style.opacity === '1';
        item.style.opacity = isVisible ? '0.5' : '1';
        item.style.color = isVisible ? '#888' : '#fff';
        updateChart();
      });
      
      legend.appendChild(item);
    });

    chartContainer.appendChild(canvas);
    chartContainer.appendChild(legend);

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'chart-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      display: none;
      background: rgba(0,0,0,0.9);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      padding: 10px;
      color: #fff;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
    `;

    container.appendChild(header);
    container.appendChild(chartContainer);
    document.body.appendChild(tooltip);

    return { container, canvas, assetSelect, rangeSelect, simulatedCheck, randomizeBtn };
  }

  // Обновление графика
  function updateChart() {
    const asset = document.getElementById('asset-select').value;
    const range = document.getElementById('range-select').value;
    const simulated = document.getElementById('simulated-check').checked;
    const canvas = document.getElementById('funding-chart');
    const legend = document.getElementById('chart-legend');

    if (!simulated || !canvas) return;

    // Вычисление времени
    const now = new Date();
    let start;
    switch (range) {
      case '4h': start = new Date(now.getTime() - 4 * 60 * 60 * 1000); break;
      case '12h': start = new Date(now.getTime() - 12 * 60 * 60 * 1000); break;
      case '24h': start = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case '3d': start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); break;
      case '7d': start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '14d': start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); break;
      case '30d': start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      default: start = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    }

    const randomSeed = window.historicalFundingRandomSeed || 0;
    const data = generateData(asset, start.getTime(), now.getTime(), randomSeed);

    // Получаем видимые биржи
    const visibleExchanges = Array.from(legend.querySelectorAll('[data-exchange]'))
      .filter(item => item.style.opacity === '1')
      .map(item => item.dataset.exchange);

    drawChart(canvas, data, visibleExchanges, EXCHANGE_COLORS);
  }

  // Инициализация
  function init() {
    const main = document.querySelector('main');
    if (!main) {
      setTimeout(init, 100);
      return;
    }

    // Очищаем контент
    main.innerHTML = '';

    const { container, assetSelect, rangeSelect, simulatedCheck, randomizeBtn } = createUI();
    main.appendChild(container);

    // Инициализация random seed
    window.historicalFundingRandomSeed = 0;

    // Обработчики событий
    assetSelect.addEventListener('change', updateChart);
    rangeSelect.addEventListener('change', updateChart);
    simulatedCheck.addEventListener('change', updateChart);
    randomizeBtn.addEventListener('click', () => {
      window.historicalFundingRandomSeed = Date.now();
      updateChart();
    });

    // Первоначальная отрисовка
    updateChart();

    // Обновление при изменении размера окна
    window.addEventListener('resize', () => {
      const canvas = document.getElementById('funding-chart');
      if (canvas) {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        canvas.width = Math.max(800, rect.width - 40);
        updateChart();
      }
    });
  }

  // Запуск после загрузки
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

