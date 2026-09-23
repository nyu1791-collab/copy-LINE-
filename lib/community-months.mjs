const MONTH=/^20\d{2}-(0[1-9]|1[0-2])$/;
function validMonth(value){return typeof value==='string'&&MONTH.test(value);}
/**
 * Move a viewer to the new JST month only when they were following the
 * current-month board. A viewer deliberately reading an archive stays there.
 */
export function activeMonthAfterJstRollover(selectedMonth,previousCurrentMonth,nextCurrentMonth){
 if(!validMonth(selectedMonth)||!validMonth(previousCurrentMonth)||!validMonth(nextCurrentMonth))return selectedMonth;
 if(nextCurrentMonth<=previousCurrentMonth)return selectedMonth;
 return selectedMonth===previousCurrentMonth?nextCurrentMonth:selectedMonth;
}
/** Keep the current month selectable, then show at most 23 available archives. */
export function availableJstMonths(currentMonth,knownMonths=[]){
 if(!validMonth(currentMonth))return [];
 const months=new Set([currentMonth]);
 for(const month of Array.isArray(knownMonths)?knownMonths:[]){
  if(validMonth(month)&&month<=currentMonth)months.add(month);
 }
 return [...months].sort((a,b)=>b.localeCompare(a)).slice(0,1200);
}
