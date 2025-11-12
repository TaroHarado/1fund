// Phantom Wallet Connect Integration
// Заменяет кнопки Log In/Sign Up на кнопку Connect с интеграцией Phantom Wallet

(function() {
  'use strict';

  // Проверка наличия Phantom Wallet
  function isPhantomInstalled() {
    return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
  }

  // Подключение к Phantom Wallet
  async function connectPhantom() {
    try {
      if (!isPhantomInstalled()) {
        alert('Phantom Wallet не установлен. Пожалуйста, установите расширение Phantom Wallet: https://phantom.app/');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const provider = window.solana;
      
      // Запрос на подключение
      const response = await provider.connect();
      console.log('Connected to Phantom:', response.publicKey.toString());
      
      // После подключения запрашиваем подпись транзакции
      await requestSignature(provider, response.publicKey);
      
    } catch (err) {
      console.error('Error connecting to Phantom:', err);
      if (err.code === 4001) {
        alert('Подключение отклонено пользователем');
      } else {
        alert('Ошибка подключения к Phantom Wallet: ' + err.message);
      }
    }
  }

  // Запрос подписи транзакции
  async function requestSignature(provider, publicKey) {
    try {
      // Загружаем Solana Web3.js если не доступен
      let web3 = await loadSolanaWeb3();
      
      if (!web3) {
        throw new Error('Не удалось загрузить Solana Web3.js');
      }

      await createAndSignTransaction(provider, publicKey, web3);
      
    } catch (err) {
      console.error('Error creating transaction:', err);
      // Fallback: используем signMessage если транзакция не удалась
      try {
        const message = new TextEncoder().encode(
          `Подключение к 1fund.fun\n\n` +
          `Адрес: ${publicKey.toString()}\n` +
          `Время: ${new Date().toISOString()}`
        );
        await provider.signMessage(message, 'utf8');
        updateConnectButton(publicKey.toString());
        alert('Успешно подключено к Phantom Wallet!');
      } catch (msgErr) {
        if (msgErr.code === 4001) {
          alert('Подпись отклонена пользователем');
        } else {
          updateConnectButton(publicKey.toString());
          console.log('Signature skipped, but connection successful');
        }
      }
    }
  }

  // Загрузка Solana Web3.js библиотеки
  function loadSolanaWeb3() {
    return new Promise((resolve, reject) => {
      // Проверяем, доступна ли библиотека
      if (typeof window !== 'undefined' && window.solanaWeb3 && window.solanaWeb3.Connection) {
        resolve(window.solanaWeb3);
        return;
      }

      // Проверяем, загружается ли уже
      if (document.querySelector('script[data-solana-web3]')) {
        const checkInterval = setInterval(() => {
          if (window.solanaWeb3 && window.solanaWeb3.Connection) {
            clearInterval(checkInterval);
            resolve(window.solanaWeb3);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Timeout loading Solana Web3.js'));
        }, 10000);
        return;
      }

      // Загружаем из CDN (используем jsdelivr как более надежный вариант)
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.87.6/lib/index.iife.min.js';
      script.setAttribute('data-solana-web3', 'true');
      script.onload = () => {
        // Проверяем доступность классов
        if (window.solanaWeb3 && window.solanaWeb3.Connection) {
          resolve(window.solanaWeb3);
        } else {
          // Пробуем альтернативный CDN
          const script2 = document.createElement('script');
          script2.src = 'https://unpkg.com/@solana/web3.js@1.87.6/lib/index.iife.min.js';
          script2.setAttribute('data-solana-web3-fallback', 'true');
          script2.onload = () => {
            if (window.solanaWeb3 && window.solanaWeb3.Connection) {
              resolve(window.solanaWeb3);
            } else {
              reject(new Error('Solana Web3.js loaded but classes not available'));
            }
          };
          script2.onerror = () => {
            reject(new Error('Failed to load Solana Web3.js from fallback CDN'));
          };
          document.head.appendChild(script2);
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load Solana Web3.js'));
      };
      document.head.appendChild(script);
    });
  }

  // Создание и подпись транзакции
  async function createAndSignTransaction(provider, publicKey, web3) {
    try {
      const { Connection, Transaction, SystemProgram, PublicKey, clusterApiUrl } = web3;

      // Подключаемся к Solana RPC (используем devnet для тестирования, можно изменить на mainnet-beta)
      const connection = new Connection(
        clusterApiUrl('devnet'),
        'confirmed'
      );

      // Создаем PublicKey объект
      const fromPubkey = new PublicKey(publicKey.toString());
      const toPubkey = new PublicKey(publicKey.toString());

      // Получаем последний blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      // Создаем новую транзакцию
      const transaction = new Transaction({
        feePayer: fromPubkey,
        recentBlockhash: blockhash,
      });

      // Добавляем инструкцию перевода 0 lamports самому себе (для подписи)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPubkey,
          toPubkey: toPubkey,
          lamports: 0,
        })
      );

      // Запрашиваем подпись транзакции через Phantom Wallet
      const signedTransaction = await provider.signTransaction(transaction);
      
      console.log('Transaction signed successfully:', {
        signature: signedTransaction.signature ? signedTransaction.signature.toString('base64') : 'N/A',
        publicKey: publicKey.toString()
      });
      
      // Обновляем UI после успешной подписи
      updateConnectButton(publicKey.toString());
      
      alert('Транзакция успешно подписана! Подключение к Phantom Wallet установлено.');
      
    } catch (err) {
      console.error('Error signing transaction:', err);
      throw err; // Пробрасываем ошибку для fallback обработки
    }
  }

  // Создание кнопки Connect
  function createConnectButton() {
    const button = document.createElement('button');
    button.id = 'phantom-connect-btn';
    button.textContent = 'Connect';
    button.className = 'phantom-connect-button';
    button.style.cssText = `
      padding: 8px 16px;
      background: linear-gradient(135deg, #AB9FF2 0%, #8B5CF6 100%);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    `;

    // Добавляем иконку Phantom (если нужно)
    const icon = document.createElement('span');
    icon.innerHTML = '🔗';
    icon.style.fontSize = '16px';
    button.appendChild(icon);

    // Hover эффект
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = 'none';
    });

    // Обработчик клика
    button.addEventListener('click', connectPhantom);

    return button;
  }

  // Обновление кнопки после подключения
  function updateConnectButton(address) {
    const button = document.getElementById('phantom-connect-btn');
    if (button) {
      const shortAddress = address.slice(0, 4) + '...' + address.slice(-4);
      button.textContent = shortAddress;
      button.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
      
      // Добавляем обработчик отключения
      button.onclick = async () => {
        try {
          if (window.solana && window.solana.isConnected) {
            await window.solana.disconnect();
            button.textContent = 'Connect';
            button.style.background = 'linear-gradient(135deg, #AB9FF2 0%, #8B5CF6 100%)';
            button.onclick = connectPhantom;
            alert('Отключено от Phantom Wallet');
          }
        } catch (err) {
          console.error('Error disconnecting:', err);
        }
      };
    }
  }

  // Поиск и замена кнопок Log In / Sign Up
  function replaceAuthButtons() {
    // Ищем различные варианты кнопок
    const selectors = [
      'button:contains("Log In")',
      'button:contains("Sign Up")',
      'button:contains("Login")',
      'button:contains("Signup")',
      'a:contains("Log In")',
      'a:contains("Sign Up")',
      'a:contains("Login")',
      'a:contains("Signup")',
      '[data-testid*="login"]',
      '[data-testid*="signup"]',
      '.login-button',
      '.signup-button',
      '#login-button',
      '#signup-button'
    ];

    // Ищем по тексту
    const allButtons = document.querySelectorAll('button, a');
    const authButtons = [];

    allButtons.forEach(btn => {
      const text = btn.textContent.trim().toLowerCase();
      if (text.includes('log in') || text.includes('login') || 
          text.includes('sign up') || text.includes('signup')) {
        authButtons.push(btn);
      }
    });

    // Удаляем найденные кнопки
    authButtons.forEach(btn => {
      btn.remove();
    });

    // Ищем контейнер для кнопок (обычно в навигации)
    const navContainers = [
      document.querySelector('nav .flex.items-center'),
      document.querySelector('nav > div > div:last-child'),
      document.querySelector('[class*="nav"] [class*="button"]').parentElement,
      document.querySelector('.hidden.lg\\:flex.items-center.gap-2')
    ];

    let targetContainer = null;

    // Ищем контейнер с "Loading..." в навигации
    // Ищем по селектору, который точно есть в HTML
    const navLoading = document.querySelector('nav .hidden.lg\\:flex.items-center.gap-2');
    if (navLoading && navLoading.textContent.includes('Loading...')) {
      targetContainer = navLoading;
    } else {
      // Альтернативный поиск
      const loadingContainers = document.querySelectorAll('nav *');
      for (let container of loadingContainers) {
        if (container.textContent && container.textContent.trim() === 'Loading...') {
          targetContainer = container;
          break;
        }
      }
    }

    // Если не нашли, используем последний контейнер в навигации
    if (!targetContainer) {
      const nav = document.querySelector('nav');
      if (nav) {
        const navChildren = nav.querySelectorAll('div');
        if (navChildren.length > 0) {
          // Ищем контейнер с классом, который обычно содержит кнопки
          for (let child of navChildren) {
            if (child.classList.contains('flex') && child.classList.contains('items-center')) {
              targetContainer = child;
              break;
            }
          }
        }
      }
    }

    // Если нашли контейнер, заменяем содержимое
    if (targetContainer) {
      // Очищаем содержимое (убираем "Loading...")
      const children = Array.from(targetContainer.childNodes);
      children.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.includes('Loading...')) {
          child.remove();
        } else if (child.nodeType === Node.ELEMENT_NODE && child.textContent.includes('Loading...')) {
          child.remove();
        }
      });
      
      // Удаляем все дочерние элементы
      targetContainer.innerHTML = '';
      
      // Устанавливаем стили
      if (!targetContainer.classList.contains('flex')) {
        targetContainer.classList.add('flex');
      }
      if (!targetContainer.classList.contains('items-center')) {
        targetContainer.classList.add('items-center');
      }
      targetContainer.style.gap = '10px';
      
      // Добавляем кнопку Connect
      const connectButton = createConnectButton();
      targetContainer.appendChild(connectButton);
    } else {
      // Если не нашли контейнер, добавляем кнопку в навигацию
      const nav = document.querySelector('nav');
      if (nav) {
        const connectButton = createConnectButton();
        connectButton.style.position = 'absolute';
        connectButton.style.right = '20px';
        connectButton.style.top = '50%';
        connectButton.style.transform = 'translateY(-50%)';
        nav.style.position = 'relative';
        nav.appendChild(connectButton);
      }
    }

    // Также проверяем мобильное меню
    const mobileMenu = document.querySelector('.lg\\:hidden');
    if (mobileMenu) {
      const mobileContainer = mobileMenu.querySelector('.flex.flex-row.items-center');
      if (mobileContainer) {
        // Очищаем и добавляем кнопку
        const existingButtons = mobileContainer.querySelectorAll('button, a');
        existingButtons.forEach(btn => {
          const text = btn.textContent.trim().toLowerCase();
          if (text.includes('log in') || text.includes('login') || 
              text.includes('sign up') || text.includes('signup')) {
            btn.remove();
          }
        });

        const connectButton = createConnectButton();
        connectButton.id = 'phantom-connect-btn-mobile';
        mobileContainer.appendChild(connectButton);
      }
    }
  }

  // Проверка подключения при загрузке
  function checkExistingConnection() {
    if (isPhantomInstalled() && window.solana.isConnected) {
      window.solana.on('connect', (publicKey) => {
        updateConnectButton(publicKey.toString());
      });

      window.solana.on('disconnect', () => {
        const button = document.getElementById('phantom-connect-btn');
        if (button) {
          button.textContent = 'Connect';
          button.style.background = 'linear-gradient(135deg, #AB9FF2 0%, #8B5CF6 100%)';
        }
      });
    }
  }

  // Инициализация
  function init() {
    // Ждем загрузки DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(replaceAuthButtons, 500); // Даем время на рендеринг React компонентов
        checkExistingConnection();
      });
    } else {
      setTimeout(replaceAuthButtons, 500);
      checkExistingConnection();
    }

    // Также пытаемся заменить после загрузки всех скриптов
    window.addEventListener('load', () => {
      setTimeout(replaceAuthButtons, 1000);
    });

    // Периодически проверяем (на случай динамического рендеринга)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const existingButton = document.getElementById('phantom-connect-btn');
      if (!existingButton) {
        replaceAuthButtons();
      }
      if (attempts > 10) {
        clearInterval(interval);
      }
    }, 1000);
  }

  // Запуск
  init();

})();

