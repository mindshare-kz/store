const SHEET_ID = '1k-pn0pQsG_DASbkJngH4yrq3qwNVaeuomm1DOBldXfw';
const BALANCE_URL = `https://opensheet.elk.sh/${SHEET_ID}/Balance`;
const PRODUCTS_URL = `https://opensheet.elk.sh/${SHEET_ID}/Prizes`;
const RECEIVED_BONUS_URL = `https://opensheet.elk.sh/${SHEET_ID}/Received Bonus`;
const LOG_URL = 'https://script.google.com/macros/s/AKfycbyTn_KsNLz8w0vjZ-gPlRNSjiN8G478OkJxURYm9VQBzTLEjmhmtqUHwTcEQWHU7umdiw/exec';

let balances = [];
let products = [];
let receivedLogins = [];
let firstBonusBlockedForUser = false;

// === Основная загрузка данных ===
async function fetchData() {
  try {
    const [balanceResp, productResp, receivedResp] = await Promise.all([
      fetch(BALANCE_URL),
      fetch(PRODUCTS_URL),
      fetch(RECEIVED_BONUS_URL)
    ]);

    const balanceJson = await balanceResp.json();
    const productJson = await productResp.json();
    const receivedJson = await receivedResp.json();

    const balanceData = Array.isArray(balanceJson) ? balanceJson : balanceJson.values || [];
    const productData = Array.isArray(productJson) ? productJson : productJson.values || [];
    const receivedData = Array.isArray(receivedJson) ? receivedJson : receivedJson.values || [];

    balances = balanceData.map(b => ({
      login: (b.login || b.Login || '').trim(),
      points: parseInt((b.points || b["points "] || '0').toString().trim()) || 0
    }));

    products = productData.map(p => ({
      name: p.name || p.Name || '',
      points: parseInt((p.points || p.Points || '0').toString().trim()) || 0,
      image: p.image || p.Image || ''
    }));

    receivedLogins = receivedData.map(r => (r.login || r.Login || '').trim().toLowerCase());
    populateUsers();
  } catch (err) {
    console.error('Ошибка при загрузке данных:', err);
  }
}

// === Подставляем логины ===
function populateUsers() {
  const select = document.getElementById('user');
  select.innerHTML = '';
  balances.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.login;
    opt.textContent = u.login;
    select.appendChild(opt);
  });

  const savedLogin = localStorage.getItem('selectedLogin');
  if (savedLogin) select.value = savedLogin;

  select.addEventListener('change', () => {
    localStorage.setItem('selectedLogin', select.value);
    firstBonusBlockedForUser = false;
    render();
  });
  render();
}

// === Рендер карточек ===
function render() {
  const login = document.getElementById('user').value;
  const balance = parseInt(balances.find(b => b.login === login)?.points || 0);
  document.getElementById('balance').textContent = `Доступно баллов: ${balance}`;
  const grid = document.getElementById('products');
  grid.innerHTML = '';

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';

    const isDisabled = balance < p.points;
    const isFirstBonus = p.name === 'Первый бонус';
    const disableFirstBonus = isFirstBonus && (firstBonusBlockedForUser || receivedLogins.includes(login.toLowerCase()));

    // заменили старую .btn на красивую кнопку из Uiverse
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}" />
      <h3>${p.name}</h3>
      <p>${p.points} баллов</p>
      <button class="button" ${isDisabled || disableFirstBonus ? 'disabled' : ''} 
        onclick="buy('${login}', '${p.name}', ${p.points}, this)">
        Получить
      </button>
    `;
    grid.appendChild(card);
  });
}

// === Логика покупки ===
function buy(user, item, points, btn) {
  if (!btn.disabled) {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    alert('Приз можно забрать у команды Research. Поздравляем! ✨');

    const userBalance = balances.find(b => b.login === user);
    if (userBalance && userBalance.points >= points) {
      userBalance.points -= points;
    } else {
      alert('Недостаточно баллов');
      return;
    }

    firstBonusBlockedForUser = true;
    render();

    fetch(`${LOG_URL}?user=${encodeURIComponent(user)}&item=${encodeURIComponent(item)}&points=${points}`)
      .catch(() => alert('Ошибка. Повторите позже.'));
  }
}

// === Добавлен обработчик для новой кнопки ===
document.addEventListener("DOMContentLoaded", function () {
  const loadButton = document.getElementById("loadButton");
  loadButton.addEventListener("click", async () => {
    loadButton.disabled = true;
    loadButton.textContent = "Загружаю...";
    try {
      await fetchData();
    } finally {
      loadButton.disabled = false;
      loadButton.textContent = "Получить список";
    }
  });
});
