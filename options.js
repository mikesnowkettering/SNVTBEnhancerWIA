document.addEventListener('DOMContentLoaded', function () {
  const defaultConfig = {
    ageBands: [
      { maxDays: 7, color: '#f9e79f' },
      { maxDays: 30, color: '#f0ad4e' },
      { maxDays: 90, color: '#e67e22' },
      { maxDays: 9999, color: '#d9534f' },
    ],
  };

  const defaultStorage = { defaultConfig: defaultConfig, boards: {} };

  const statusDiv = document.getElementById('status');
  const tableBody = document.querySelector('#ageBandsTable tbody');
  const boardSelect = document.getElementById('boardSelect');

  let fullConfig = null;
  let currentBoardId = null; // null means default config

  // Load config from chrome.storage.sync or fallback to defaults.
  function loadConfig(callback) {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.get(
        { vtbEnhancerConfig: defaultStorage },
        function (data) {
          let cfg = data.vtbEnhancerConfig;
          // Migrate old format { ageBands: [...] }
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

  // Save configuration using chrome.storage.sync.
  function saveConfig(config, callback) {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.set({ vtbEnhancerConfig: config }, function () {
        if (callback) callback();
      });
    } else {
      localStorage.setItem('vtbEnhancerConfig', JSON.stringify(config));
      if (callback) callback();
    }
  }
  
  // Render the table based directly on a provided configuration object.
  function renderTableFromConfig(config) {
    tableBody.innerHTML = '';
    config.ageBands.forEach((band) => {
      const row = createRow(band);
      tableBody.appendChild(row);
    });
  }

  function refreshTable() {
    let bands = getBandsFromTable();
    bands.sort((a, b) => a.maxDays - b.maxDays);
    if (bands.length === 0 || bands[bands.length - 1].maxDays !== 9999) {
      bands.push({ maxDays: 9999, color: '#d9534f' });
    }
    tableBody.innerHTML = '';
    bands.forEach((band) => {
      const row = createRow(band);
      tableBody.appendChild(row);
    });
  }

  function createRow(band) {
    const tr = document.createElement('tr');

    const tdDays = document.createElement('td');
    if (band.maxDays === 9999) {
      const span = document.createElement('span');
      span.textContent = '∞';
      tdDays.appendChild(span);
    } else {
      const inputDays = document.createElement('input');
      inputDays.type = 'number';
      inputDays.min = '0';
      inputDays.value = band.maxDays;
      tdDays.appendChild(inputDays);
    }
    tr.appendChild(tdDays);

    const tdColor = document.createElement('td');
    const inputColor = document.createElement('input');
    inputColor.type = 'color';
    inputColor.value = band.color;
    tdColor.appendChild(inputColor);
    tr.appendChild(tdColor);

    const tdAction = document.createElement('td');
    if (band.maxDays !== 9999) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.title = 'Delete this age band';
      deleteBtn.addEventListener('click', () => {
        tr.remove();
        refreshTable();
      });
      tdAction.appendChild(deleteBtn);
    }
    tr.appendChild(tdAction);

    return tr;
  }

  function getBandsFromTable() {
    const newBands = [];
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((row) => {
      const daysInput = row.querySelector('td:nth-child(1) input');
      let maxDays;
      if (daysInput) {
        maxDays = parseInt(daysInput.value, 10);
        if (isNaN(maxDays) || maxDays < 0 || maxDays === 0) return;
      } else {
        maxDays = 9999;
      }
      const colorInput = row.querySelector('td:nth-child(2) input');
      newBands.push({ maxDays: maxDays, color: colorInput.value });
    });
    return newBands;
  }

  function populateBoardSelect() {
    boardSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Default (All Boards)';
    boardSelect.appendChild(defaultOption);
    Object.keys(fullConfig.boards).forEach((id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = fullConfig.boards[id].name || id;
      boardSelect.appendChild(opt);
    });
    boardSelect.value = currentBoardId || '';
  }

  function getCurrentConfig() {
    if (!currentBoardId) return fullConfig.defaultConfig;
    const board = fullConfig.boards[currentBoardId];
    if (board && board.ageBands) return board;
    // return copy of default bands
    return { ageBands: fullConfig.defaultConfig.ageBands.map((b) => ({ ...b })) };
  }

  boardSelect.addEventListener('change', () => {
    currentBoardId = boardSelect.value || null;
    renderTableFromConfig(getCurrentConfig());
  });

  document.getElementById('addRowBtn').addEventListener('click', () => {
    let bands = getBandsFromTable();
    const infinityBand =
      bands.find((b) => b.maxDays === 9999) || { maxDays: 9999, color: '#d9534f' };
    bands.push({ maxDays: 1, color: '#ffffff' });
    bands = bands.filter((b) => b.maxDays !== 9999);
    bands.sort((a, b) => a.maxDays - b.maxDays);
    bands.push(infinityBand);
    tableBody.innerHTML = '';
    bands.forEach((band) => tableBody.appendChild(createRow(band)));
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const newBands = getBandsFromTable();
    if (currentBoardId) {
      if (!fullConfig.boards[currentBoardId]) {
        fullConfig.boards[currentBoardId] = {
          name: boardSelect.options[boardSelect.selectedIndex].text,
        };
      }
      fullConfig.boards[currentBoardId].ageBands = newBands;
    } else {
      fullConfig.defaultConfig.ageBands = newBands;
    }
    saveConfig(fullConfig, function () {
      statusDiv.textContent = 'Configuration saved.';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 2000);
    });
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (currentBoardId) {
      if (fullConfig.boards[currentBoardId]) {
        delete fullConfig.boards[currentBoardId].ageBands;
      }
    } else {
      fullConfig.defaultConfig.ageBands = defaultConfig.ageBands.map((b) => ({ ...b }));
    }
    renderTableFromConfig(getCurrentConfig());
    saveConfig(fullConfig, function () {
      statusDiv.textContent = 'Configuration reset to default.';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 2000);
    });
  });

  loadConfig(function (config) {
    fullConfig = config;
    populateBoardSelect();
    renderTableFromConfig(getCurrentConfig());
  });
});
  