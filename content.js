/*
  ServiceNow Visual Task Board Enhancer - Work Item Age
  Version 0.7
  - Waits until the board has fully loaded all cards (using a MutationObserver with a debounce) 
    before processing any cards or displaying a status message.
  - Processes each card to calculate and display an "Age" badge based on the card’s "Actual start date".
  - Badge background color is determined by configurable age bands loaded from chrome.storage.sync.
  - Continues watching the DOM for new card elements and applies the badge automatically.
*/
(function () {
  if (!window.location.href.includes('vtb.do')) return;

  const defaultConfig = {
    ageBands: [
      { maxDays: 7, color: '#f9e79f' },
      { maxDays: 30, color: '#f0ad4e' },
      { maxDays: 90, color: '#e67e22' },
      { maxDays: 9999, color: '#d9534f' },
    ],
  };

  const defaultStorage = { defaultConfig: defaultConfig, boards: {} };

  const boardIdMatch = window.location.href.match(/sysparm_board=([^&]+)/);
  const boardId = boardIdMatch ? boardIdMatch[1] : null;

  function getConfig(callback) {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.get(
        { vtbEnhancerConfig: defaultStorage },
        function (data) {
          let cfg = data.vtbEnhancerConfig;
          if (cfg && cfg.ageBands) {
            cfg = { defaultConfig: cfg, boards: {} };
          }
          callback(cfg);
        }
      );
    } else {
      callback(defaultStorage);
    }
  }

  function saveConfig(cfg, callback) {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.set({ vtbEnhancerConfig: cfg }, () => {
        if (callback) callback();
      });
    } else {
      localStorage.setItem('vtbEnhancerConfig', JSON.stringify(cfg));
      if (callback) callback();
    }
  }

  function updateBoardInfo(cfg) {
    if (!boardId) return;
    const label = document.querySelector('label.sn-navhub-title');
    if (!label) return;
    const name = label.textContent.trim();
    if (!cfg.boards[boardId]) {
      cfg.boards[boardId] = { name: name };
      saveConfig(cfg);
    } else if (cfg.boards[boardId].name !== name) {
      cfg.boards[boardId].name = name;
      saveConfig(cfg);
    }
  }

  // Load config then run the main logic.
  getConfig(function (fullConfig) {
    const config =
      boardId && fullConfig.boards[boardId] && fullConfig.boards[boardId].ageBands
        ? fullConfig.boards[boardId]
        : fullConfig.defaultConfig;
    // --- Utility Functions ---
    function showDebugMessage(msg) {
      const div = document.createElement('div');
      div.textContent = msg;
      Object.assign(div.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '5px 10px',
        borderRadius: '4px',
        zIndex: '9999',
        fontSize: '14px',
      });
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 3000);
    }

    function calculateDaysDiff(dateStr) {
      const d = new Date(dateStr);
      if (isNaN(d)) return null;
      return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    }

    function findActualStartDate(card) {
      const liList = card.querySelectorAll('li.ng-scope');
      for (const li of liList) {
        const spans = li.querySelectorAll(
          'span.sn-widget-list-table-cell.ng-binding'
        );
        if (
          spans.length >= 2 &&
          spans[0].textContent.trim() === 'Actual start date'
        ) {
          return spans[1].textContent.trim();
        }
      }
      return null;
    }

    function findState(card) {
      const liList = card.querySelectorAll('li.ng-scope');
      for (const li of liList) {
        const spans = li.querySelectorAll(
          'span.sn-widget-list-table-cell.ng-binding'
        );
        if (spans.length >= 2 && spans[0].textContent.trim() === 'State') {
          return spans[1].textContent.trim();
        }
      }
      return null;
    }

    function getBadgeColor(age) {
      for (const band of config.ageBands) {
        if (age < band.maxDays) return band.color;
      }
      return '#000000';
    }

    // Returns black or white depending on background brightness.
    function getContrastColor(hexColor) {
      try {
        if (hexColor[0] === '#') hexColor = hexColor.substring(1);
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
      } catch (e) {
        return '#000000';
      }
    }

    function createBadge(text, bgColor) {
      const badge = document.createElement('div');
      badge.textContent = text;
      const textColor = getContrastColor(bgColor);
      Object.assign(badge.style, {
        backgroundColor: bgColor,
        color: textColor,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        position: 'absolute',
        bottom: '0px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '1000',
      });
      return badge;
    }

    let updatedCount = 0;

    function processCard(card) {
      if (card.hasAttribute('data-task-age-enhanced')) return;
      try {
        const state = findState(card);
        if (state) {
          const normalized = state.toLowerCase();
          if (
            normalized === 'resolved' ||
            normalized.includes('closed') ||
            normalized.includes('canceled')
          ) {
            const badge = createBadge('Done', '#28a745');
            if (getComputedStyle(card).position === 'static') {
              card.style.position = 'relative';
            }
            card.appendChild(badge);
            card.setAttribute('data-task-age-enhanced', 'true');
            updatedCount++;
            return;
          }
        }
        const actualStart = findActualStartDate(card);
        if (!actualStart) return;
        const age = calculateDaysDiff(actualStart);
        if (age === null) return;
        const badgeColor = getBadgeColor(age);
        const badge = createBadge(
          `Age: ${age} day${age !== 1 ? 's' : ''}`,
          badgeColor
        );
        if (getComputedStyle(card).position === 'static') {
          card.style.position = 'relative';
        }
        card.appendChild(badge);
        card.setAttribute('data-task-age-enhanced', 'true');
        updatedCount++;
      } catch (err) {
        console.error('Work Item Age Error:', err);
      }
    }

    function processExistingCards() {
      const cards = document.querySelectorAll('.vtb-card-component-wrapper');
      if (!cards.length) return;
      cards.forEach((card) => processCard(card));
    }

    function observeCards() {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.classList.contains('vtb-card-component-wrapper'))
                processCard(node);
              node
                .querySelectorAll?.('.vtb-card-component-wrapper')
                .forEach(processCard);
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    // Wait until the board appears to be fully loaded (using a 1-second debounce)
    function waitForBoardLoad(callback) {
      let timer = null;
      const observer = new MutationObserver(() => {
        const cards = document.querySelectorAll('.vtb-card-component-wrapper');
        if (cards.length > 0) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            observer.disconnect();
            callback();
          }, 1000);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const initialCards = document.querySelectorAll(
        '.vtb-card-component-wrapper'
      );
      if (initialCards.length > 0) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          observer.disconnect();
          callback();
        }, 1000);
      }
    }

    function init() {
      waitForBoardLoad(() => {
        updateBoardInfo(fullConfig);
        processExistingCards();
        showDebugMessage(`Updated ${updatedCount} cards with Work Item Age`);
        observeCards();
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  });
})();
