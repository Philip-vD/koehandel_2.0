function addAmount(target, amount, times = 1) {
  target[amount] += times;
}

function subtractAmount(target, amount, times = 1) {
  target[amount] -= times;
}

function addMoney(target, money) {
  for (const [amount, times] of Object.entries(money)) {
    addAmount(target, amount, times);
  }
}

function subtractMoney(target, money) {
  for (const [amount, times] of Object.entries(money)) {
    subtractAmount(target, amount, times);
  }
}

function calculateTotal(money) {
  var res = 0;
  for (const [amount, times] of Object.entries(money)) {
    res += times * amount;
  }
  return res;
}

function cardCount(money) {
  return Object.values(money).reduce((a, b) => a + b, 0);
}

module.exports = {
  addAmount: addAmount,
  subtractAmount: subtractAmount,
  addMoney: addMoney,
  subtractMoney: subtractMoney,
  calculateTotal: calculateTotal,
  cardCount: cardCount,
};
