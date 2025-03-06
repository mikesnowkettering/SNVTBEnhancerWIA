/*
  ServiceNow Visual Task Board Enhancer - Work Item Age
  - Runs only if the URL contains "vtb.do" which means it is on a Visual Task Board.
  - Runs only once per card.  
  - Finds "Actual start date" in each card’s record fields.
  - Displays an "Age" badge flush at the very bottom center of the card.
  - Badge background color increases in intensity as age increases:
      < 7 days: subtle light yellow (#f9e79f)
    7–30 days: moderate orange (#f0ad4e)
   30–90 days: strong orange (#e67e22)
     90+ days: alarming red (#d9534f)
  - Badge text color is set to maximize contrast (black or white).
  - If no valid date exists, nothing is displayed.
*/
(function() {
  if (!window.location.href.includes("vtb.do")) return;

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
      fontSize: '14px'
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
      const spans = li.querySelectorAll('span.sn-widget-list-table-cell.ng-binding');
      if (spans.length >= 2 && spans[0].textContent.trim() === 'Actual start date') {
        return spans[1].textContent.trim();
      }
    }
    return null;
  }

  function getBadgeColor(age) {
    if (age < 7) return '#f9e79f';
    else if (age < 30) return '#f0ad4e';
    else if (age < 90) return '#e67e22';
    else return '#d9534f';
  }

  // Returns black or white based on background brightness.
  function getContrastColor(hexColor) {
    try {
      if (hexColor[0] === "#") hexColor = hexColor.substring(1);
      const r = parseInt(hexColor.substr(0,2), 16);
      const g = parseInt(hexColor.substr(2,2), 16);
      const b = parseInt(hexColor.substr(4,2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? "#000000" : "#ffffff";
    } catch (e) {
      return "#000000";
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
      zIndex: '1000'
    });
    return badge;
  }

  function processCard(card) {
    if (card.hasAttribute('data-task-age-enhanced')) return;
    try {
      const actualStart = findActualStartDate(card);
      if (!actualStart) return;
      const age = calculateDaysDiff(actualStart);
      if (age === null) return;
      const badgeColor = getBadgeColor(age);
      const badge = createBadge(`Age: ${age} day${age !== 1 ? 's' : ''}`, badgeColor);
      if (getComputedStyle(card).position === 'static') {
        card.style.position = 'relative';
      }
      card.appendChild(badge);
      card.setAttribute('data-task-age-enhanced', 'true');
    } catch (err) {
      console.error('Work Item Age Error:', err);
    }
  }

  function processExistingCards() {
    const cards = document.querySelectorAll('.vtb-card-component-wrapper');
    console.log(`Found ${cards.length} cards on ${location.href}`);
    if (!cards.length) showDebugMessage('No VTB cards found.');
    cards.forEach(processCard);
  }

  function observeCards() {
    const observer = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList.contains('vtb-card-component-wrapper')) processCard(node);
            node.querySelectorAll?.('.vtb-card-component-wrapper').forEach(processCard);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    console.log(window.top === window.self ? 'Running in top frame' : 'Running in an iframe');
    showDebugMessage('Enhancer Active');
    processExistingCards();
    setTimeout(processExistingCards, 3000);
    observeCards();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
