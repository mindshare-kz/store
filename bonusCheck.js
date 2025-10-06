
const LOGINS_URL = "https://script.google.com/macros/s/AKfycbw7UwAzXuwwIh4DFdfcsXGsQQTSQRmbWa62k7HS1uP4QKbizbqJyjNhxV6Ok0AknF6S2A/exec?mode=logins";

const SPECIAL_PRIZE = "Первый бонус-приз";

/**
 * Проверка, можно ли пользователю взять спецприз
 * @param {string} userLogin - логин текущего пользователя
 * @param {string} prizeName - название приза
 * @returns {Promise<boolean>} - true = можно, false = нельзя
 */
async function canTakePrize(userLogin, prizeName) {
  if (prizeName !== SPECIAL_PRIZE) {
    // Если не спецприз — всегда можно
    return true;
  }

  try {
    const response = await fetch(LOGINS_URL);
    if (!response.ok) {
      console.error("Ошибка загрузки логинов:", response.statusText);
      return true; // на всякий случай не блокируем
    }
    const allLogins = await response.json();

    // Если пользователь уже встречается в логах или архиве, значит бонус-приз ему нельзя
    return !allLogins.includes(userLogin);
  } catch (err) {
    console.error("Ошибка при проверке бонус-приза:", err);
    return true; // при ошибке не блокируем
  }
}

/**
 * Блокировка кнопки "Купить", если приз = спецприз и пользователю нельзя
 * @param {string} userLogin - текущий логин
 */
async function checkAndBlockSpecialPrize(userLogin) {
  const buttons = document.querySelectorAll(".buy-btn"); // предполагаем, что кнопки имеют класс .buy-btn

  for (let btn of buttons) {
    const prizeName = btn.getAttribute("data-prize"); // например <button class="buy-btn" data-prize="Первый бонус-приз">Купить</button>

    const allowed = await canTakePrize(userLogin, prizeName);

    if (!allowed) {
      btn.disabled = true;
      btn.innerText = "Недоступно";
      btn.style.backgroundColor = "#ccc";
      btn.style.cursor = "not-allowed";
    }
  }
}
