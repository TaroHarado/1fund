// Historical Funding Simulator
// Генерирует фейковые данные и отображает график

(function() {
  'use strict';

  // Список бирж из assets
  const EXCHANGES = [
    'aster', 'binance', 'bingx', 'bitget', 'bluefin', 'bybit', 'cryptocom',
    'drift', 'edgex', 'ethereal', 'extended', 'gateio', 'hibachi', 'huobi',
    'hyperliquid', 'kucoin', 'kuma', 'lighter', 'mexc', 'okx', 'pacifica',
    'paradex'
  ];

  // Цветовая схема для бирж (стабильная)
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
      // Random walk: следующее значение = текущее + случайное изменение
      const change = (rng() - 0.5) * 0.5; // Небольшое изменение
      current = Math.max(min, Math.min(max, current + change));
      data.push(current);
    }
    
    return data;
  }

  // Генерация seed из asset + exchange + startTime
  function generateSeed(asset, exchange, startTime) {
    const str = `${asset}_${exchange}_${startTime}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Генерация данных для всех бирж
  function generateData(asset, startTime, endTime, randomSeed = 0) {
    const interval = 5 * 60 * 1000; // 5 минут в миллисекундах
    const numPoints = Math.floor((endTime - startTime) / interval);
    
    const data = [];
    const exchanges = EXCHANGES;
    
    // Генерируем точки времени
    for (let i = 0; i < numPoints; i++) {
      const timestamp = startTime + i * interval;
      const point = { time: timestamp };
      
      // Генерируем данные для каждой биржи
      exchanges.forEach(exchange => {
        const seed = generateSeed(asset, exchange, startTime) + randomSeed;
        const values = generateRandomWalk(seed, numPoints);
        point[exchange] = values[i];
      });
      
      data.push(point);
    }
    
    return data;
  }

  // Форматирование времени для оси X
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Создание компонента графика
  function createChartComponent(data, visibleExchanges, colors) {
    // Проверяем, загружена ли Recharts
    if (typeof window !== 'undefined' && window.Recharts) {
      const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = window.Recharts;
      
      const lines = visibleExchanges.map(exchange => (
        React.createElement(Line, {
          key: exchange,
          type: "monotone",
          dataKey: exchange,
          stroke: colors[exchange],
          strokeWidth: 2,
          dot: false,
          name: exchange.toUpperCase()
        })
      ));

      return React.createElement(ResponsiveContainer, { width: "100%", height: 500 },
        React.createElement(LineChart, { data: data },
          React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.1)" }),
          React.createElement(XAxis, {
            dataKey: "time",
            tickFormatter: formatTime,
            stroke: "rgba(255,255,255,0.5)",
            style: { fontSize: '12px' }
          }),
          React.createElement(YAxis, {
            domain: [-5, 5],
            label: { value: 'Funding (bps)', angle: -90, position: 'insideLeft' },
            stroke: "rgba(255,255,255,0.5)",
            style: { fontSize: '12px' }
          }),
          React.createElement(Tooltip, {
            labelFormatter: (value) => formatTime(value),
            formatter: (value, name) => [`${value.toFixed(2)} bps`, name.toUpperCase()],
            contentStyle: { backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }
          }),
          React.createElement(Line, {
            type: "monotone",
            dataKey: "zero",
            stroke: "rgba(255,255,255,0.3)",
            strokeWidth: 1,
            strokeDasharray: "5 5",
            dot: false,
            name: ""
          }),
          ...lines
        )
      );
    }
    
    // Fallback: используем простой canvas или сообщение
    return React.createElement('div', { style: { padding: '20px', textAlign: 'center' } },
      'Recharts не загружен. Установите recharts: npm install recharts'
    );
  }

  // Создание легенды
  function createLegend(exchanges, visibleExchanges, colors, onToggle) {
    return React.createElement('div', {
      style: {
        position: 'absolute',
        right: '20px',
        top: '20px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: '15px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)',
        maxHeight: '400px',
        overflowY: 'auto',
        zIndex: 10
      }
    },
      exchanges.map(exchange => {
        const isVisible = visibleExchanges.includes(exchange);
        return React.createElement('div', {
          key: exchange,
          onClick: () => onToggle(exchange),
          style: {
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            cursor: 'pointer',
            opacity: isVisible ? 1 : 0.5,
            color: isVisible ? '#fff' : '#888'
          }
        },
          React.createElement('div', {
            style: {
              width: '12px',
              height: '12px',
              backgroundColor: colors[exchange],
              marginRight: '8px',
              borderRadius: '2px'
            }
          }),
          React.createElement('span', { style: { fontSize: '12px' } }, exchange.toUpperCase())
        );
      })
    );
  }

  // Основной компонент
  function HistoricalFundingSimulator() {
    const [asset, setAsset] = React.useState('BTC');
    const [range, setRange] = React.useState('4h');
    const [startTime, setStartTime] = React.useState(null);
    const [endTime, setEndTime] = React.useState(null);
    const [data, setData] = React.useState([]);
    const [visibleExchanges, setVisibleExchanges] = React.useState([...EXCHANGES]);
    const [simulated, setSimulated] = React.useState(true);
    const [randomSeed, setRandomSeed] = React.useState(0);

    // Вычисление диапазона времени
    React.useEffect(() => {
      const now = new Date();
      let start;
      
      switch (range) {
        case '4h':
          start = new Date(now.getTime() - 4 * 60 * 60 * 1000);
          break;
        case '12h':
          start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
          break;
        case '24h':
        case '1d':
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '3d':
          start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          break;
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '14d':
          start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      }
      
      setStartTime(start.getTime());
      setEndTime(now.getTime());
    }, [range]);

    // Генерация данных при изменении параметров
    React.useEffect(() => {
      if (startTime && endTime && simulated) {
        const generated = generateData(asset, startTime, endTime, randomSeed);
        // Добавляем линию y=0
        generated.forEach(point => point.zero = 0);
        setData(generated);
      }
    }, [asset, startTime, endTime, simulated, randomSeed]);

    const toggleExchange = (exchange) => {
      setVisibleExchanges(prev => 
        prev.includes(exchange)
          ? prev.filter(e => e !== exchange)
          : [...prev, exchange]
      );
    };

    const randomize = () => {
      setRandomSeed(Date.now());
    };

    return React.createElement('div', {
      style: {
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        color: '#fff'
      }
    },
      // Заголовок и контролы
      React.createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '15px'
        }
      },
        React.createElement('h1', { style: { fontSize: '24px', margin: 0 } }, 'Historical Funding Rates'),
        React.createElement('div', {
          style: {
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }
        },
          // Asset selector
          React.createElement('select', {
            value: asset,
            onChange: (e) => setAsset(e.target.value),
            style: {
              padding: '8px 12px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px'
            }
          },
            ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'AVAX'].map(symbol =>
              React.createElement('option', { key: symbol, value: symbol }, symbol)
            )
          ),
          // Range selector
          React.createElement('select', {
            value: range,
            onChange: (e) => setRange(e.target.value),
            style: {
              padding: '8px 12px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px'
            }
          },
            [
              { value: '4h', label: '4 Hours' },
              { value: '12h', label: '12 Hours' },
              { value: '24h', label: '24 Hours' },
              { value: '3d', label: '3 Days' },
              { value: '7d', label: '7 Days' },
              { value: '14d', label: '14 Days' },
              { value: '30d', label: '30 Days' }
            ].map(opt =>
              React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
            )
          ),
          // Simulated data toggle
          React.createElement('label', {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }
          },
            React.createElement('input', {
              type: 'checkbox',
              checked: simulated,
              onChange: (e) => setSimulated(e.target.checked),
              style: { cursor: 'pointer' }
            }),
            React.createElement('span', null, 'Simulated data')
          ),
          // Randomize button
          React.createElement('button', {
            onClick: randomize,
            style: {
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }
          }, 'Randomize')
        )
      ),
      // График
      React.createElement('div', {
        style: {
          position: 'relative',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      },
        data.length > 0 && simulated ? (
          React.createElement(React.Fragment, null,
            createLegend(EXCHANGES, visibleExchanges, EXCHANGE_COLORS, toggleExchange),
            createChartComponent(
              data,
              visibleExchanges,
              EXCHANGE_COLORS
            )
          )
        ) : (
          React.createElement('div', {
            style: {
              padding: '40px',
              textAlign: 'center',
              color: '#888'
            }
          }, simulated ? 'Loading...' : 'Simulated data is disabled')
        )
      )
    );
  }

  // Инициализация после загрузки страницы
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  function init() {
    // Ждем загрузки React и Recharts
    const checkDependencies = setInterval(() => {
      if (typeof window.React !== 'undefined' && typeof window.Recharts !== 'undefined') {
        clearInterval(checkDependencies);
        
        // Создаем корневой элемент для React
        const root = document.createElement('div');
        root.id = 'historical-funding-simulator-root';
        
        // Ищем место для вставки (основной контент)
        const main = document.querySelector('main');
        if (main) {
          // Очищаем существующий контент
          main.innerHTML = '';
          main.appendChild(root);
          
          // Рендерим компонент
          const reactRoot = window.ReactDOM.createRoot(root);
          reactRoot.render(React.createElement(HistoricalFundingSimulator));
        }
      }
    }, 100);
    
    // Таймаут на случай, если зависимости не загрузятся
    setTimeout(() => clearInterval(checkDependencies), 10000);
  }

})();

