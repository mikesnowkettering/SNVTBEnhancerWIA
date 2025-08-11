document.addEventListener('DOMContentLoaded', function() {
    const defaultConfig = {
      ageBands: [
        { maxDays: 7, color: '#f9e79f' },
        { maxDays: 30, color: '#f0ad4e' },
        { maxDays: 90, color: '#e67e22' },
        { maxDays: 9999, color: '#d9534f' }
      ]
    };
  
    const statusDiv = document.getElementById('status');
    const tableBody = document.querySelector('#ageBandsTable tbody');
  
    // Load config from chrome.storage.sync or fallback to defaults.
    function loadConfig(callback) {
      if (
        typeof chrome !== 'undefined' &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        chrome.storage.sync.get(
          { vtbEnhancerConfig: defaultConfig },
          function (data) {
            callback(data.vtbEnhancerConfig);
          }
        );
      } else {
        callback(defaultConfig);
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
      config.ageBands.forEach(band => {
        const row = createRow(band);
        tableBody.appendChild(row);
      });
    }
  
    // Create a table row for an age band.
    function createRow(band) {
      const tr = document.createElement('tr');
  
      // Max Days cell
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
  
      // Color cell
      const tdColor = document.createElement('td');
      const inputColor = document.createElement('input');
      inputColor.type = 'color';
      inputColor.value = band.color;
      tdColor.appendChild(inputColor);
      tr.appendChild(tdColor);
  
      // Action cell
      const tdAction = document.createElement('td');
      if (band.maxDays !== 9999) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn';
        deleteBtn.textContent = '✕';
        deleteBtn.title = 'Delete this age band';
        deleteBtn.addEventListener('click', () => {
          tr.remove();
          renderTable();
        });
        tdAction.appendChild(deleteBtn);
      }
      tr.appendChild(tdAction);
  
      return tr;
    }
  
    // Gather age bands from the current table; discard rows with 0 as maxDays.
    function getBandsFromTable() {
      const newBands = [];
      const rows = tableBody.querySelectorAll('tr');
      rows.forEach(row => {
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
      newBands.sort((a, b) => a.maxDays - b.maxDays);
      if (newBands.length === 0 || newBands[newBands.length - 1].maxDays !== 9999) {
        newBands.push({ maxDays: 9999, color: '#d9534f' });
      }
      return newBands;
    }
  
    // Re-render the table using unsaved changes if available; otherwise, load from storage.
    function renderTable() {
      loadConfig(function(config) {
        let bands = getBandsFromTable();
        if (bands.length === 0) {
          bands = config.ageBands;
        }
        bands.sort((a, b) => a.maxDays - b.maxDays);
        if (bands.length === 0 || bands[bands.length - 1].maxDays !== 9999) {
          bands.push({ maxDays: 9999, color: '#d9534f' });
        }
        tableBody.innerHTML = '';
        bands.forEach(band => {
          const row = createRow(band);
          tableBody.appendChild(row);
        });
      });
    }
  
    document.getElementById('addRowBtn').addEventListener('click', () => {
      loadConfig(function (config) {
        let bands = getBandsFromTable();
        const infinityBand =
          bands.find((b) => b.maxDays === 9999) || {
            maxDays: 9999,
            color: '#d9534f',
          };
        bands.push({ maxDays: 1, color: '#ffffff' });
        // Remove any existing 9999 band, then re-add it at the end using its previous color.
        bands = bands.filter((b) => b.maxDays !== 9999);
        bands.sort((a, b) => a.maxDays - b.maxDays);
        bands.push(infinityBand);
        tableBody.innerHTML = '';
        bands.forEach((band) => {
          const row = createRow(band);
          tableBody.appendChild(row);
        });
      });
    });
  
    document.getElementById('saveBtn').addEventListener('click', () => {
      const newBands = getBandsFromTable();
      const config = { ageBands: newBands };
      saveConfig(config, function() {
        statusDiv.textContent = 'Configuration saved.';
        setTimeout(() => { statusDiv.textContent = ''; }, 2000);
      });
    });
  
    // When "Reset to Default" is clicked, save the default config and re-render immediately.
    document.getElementById('resetBtn').addEventListener('click', () => {
      saveConfig(defaultConfig, function() {
        renderTableFromConfig(defaultConfig);
        statusDiv.textContent = 'Configuration reset to default.';
        setTimeout(() => { statusDiv.textContent = ''; }, 2000);
      });
    });
  
    // On initial page load, pull configuration from chrome.storage.sync and render the table.
    loadConfig(function(config) {
      renderTableFromConfig(config);
    });
  });
  