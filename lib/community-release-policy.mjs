const MONTH = /^20\d{2}-(0[1-9]|1[0-2])$/;
// The source's Rangers Book sorts its grade column by grade, evolution, then
// the numeric unitCode in descending order. For verified grade-9 ultimate
// units this is the addition order; PvP popularity must never decide boards.
export function additionNumber(id) {
  const match = typeof id === 'string' && /^u(\d+)e-[a-z0-9_-]+$/i.exec(id);
  const number = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(number) && number > 0 ? number : -1;
}
export function byAdditionOrder(a, b) {
  const left = typeof a === 'string' ? a : a.id;
  const right = typeof b === 'string' ? b : b.id;
  return additionNumber(right) - additionNumber(left) || left.localeCompare(right);
}
export function monthlyBoardLimit(month) {
  if (typeof month !== 'string' || !MONTH.test(month)) throw new Error('invalid release month');
  return Number(month.slice(5)) % 2 === 0 ? 2 : 1;
}
