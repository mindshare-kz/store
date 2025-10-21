// === Конфигурация ===
const SHEET_ID = '1k-pn0pQsG_DASbkJngH4yrq3qwNVaeuomm1DOBldXfw';
const BALANCE_URL = `https://opensheet.elk.sh/${SHEET_ID}/Balance`;
const PRODUCTS_URL = `https://opensheet.elk.sh/${SHEET_ID}/Prizes`;
const RECEIVED_BONUS_URL = `https://opensheet.elk.sh/${SHEET_ID}/Received Bonus`;
const LOG_URL = 'https://script.google.com/macros/s/AKfycbyTn_KsNLz8w0vjZ-gPlRNSjiN8G478OkJxURYm9VQBzTLEjmhmtqUHwTcEQWHU7umdiw/exec`;

// === Глобальные переменные ===
let balances = [];
let products = [];
let receivedLogins = [];
let firstBonusBlockedForUser = false;

// === Основной запуск ===
fetchData();

// === Функция загрузки данных ===
async function fetchData() {
  try {
    const [balanceResp, productResp, receivedResp] = await Promise.all([
      fetch(BALANCE_URL),
      fetch(PRODUCTS_URL),
      fetch(RECEIVED_BONUS_URL)
    ]);

    const [balanceData, productData, receivedData] = await Promise.all([
      balanceResp.json(),
      productResp.json(),
      receivedResp.json()
    ]);

    balances = (Array.isArray(balanceData) ? balanceData : balanceData.values || []).map(b => ({
      login: (b.login || b.Login || '').trim(),
      points: parseInt((b.points || b['points '] || '0').toString().trim()) || 0
    }));

    products = (Array.isArray(productData) ? productData : productData.values || []).map(p => ({
      name: p.name || p.Name || '',
      points: parseInt((p.points || p.Points || '0').toString().trim()) || 0,
      image: p.image || p.Image || ''
    }));

    receivedLogins = (Array.isArray(receivedData) ? receivedData : receivedData.values || []).map(r =>
      (r.login || r.Login || '').trim().toLowerCase()
    );

    populateUsers();
  } catch (err) {
    console.error('Ошибка при загрузке данных:', err);
    alert('Ошибка загрузки данных. Попробуйте обновить страницу.');
  }
}

// === Наполнение списка пользователей ===
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
  if (savedLogin && balances.some(b => b.login === savedLogin)) {
    select.value = savedLogin;
  }

  select.addEventListener('change', () => {
    localStorage.setItem('selectedLogin', select.value);
    firstBonusBlockedForUser = false;
    render();
  });

  render();
}

// === Отрисовка магазина ===
function render() {
  const login = document.getElementById('user').value;
  const balance = balances.find(b => b.login === login)?.points || 0;
  document.getElementById('balance').textContent = `Доступно баллов: ${balance}`;

  const grid = document.getElementById('products');
  grid.innerHTML = '';

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';

    const isDisabled = balance < p.points;
    const isFirstBonus = p.name.toLowerCase() === 'первый бонус';
    const disableFirstBonus = isFirstBonus && (firstBonusBlockedForUser || receivedLogins.includes(login.toLowerCase()));

    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p>${p.points} баллов</p>
      <button 
        class="btn"
        ${isDisabled || disableFirstBonus ? 'disabled' : ''}
        onclick="buy('${login}', '${p.name}', ${p.points}, this)">
        Получить
      </button>
    `;

    grid.appendChild(card);
  });
}

// === Покупка приза ===
function buy(user, item, points, btn) {
  if (btn.disabled) return;

  const userBalance = balances.find(b => b.login === user);
  if (!userBalance) return alert('Пользователь не найден.');
  if (userBalance.points < points) return alert('Недостаточно баллов.');

  // Обновляем локальный баланс
  userBalance.points -= points;
  firstBonusBlockedForUser = true;
  render();

  // Визуальный фидбек
  btn.disabled = true;
  btn.textContent = 'Забронировано 🎉';
  alert(`🎁 ${item} можно забрать у команды Research. Поздравляем!`);

  // Логирование
  fetch(`${LOG_URL}?user=${encodeURIComponent(user)}&item=${encodeURIComponent(item)}&points=${points}`)
    .catch(() => alert('Ошибка при записи в лог. Попробуйте позже.'));
}
