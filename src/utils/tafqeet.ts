/**
 * Arabic number to currency words converter (Tafqeet)
 */
export function tafqeetArabic(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'صفر جنيهاً مصرياً لا غير';

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(num: number): string {
    let result = '';
    const h = Math.floor(num / 100);
    const remainder = num % 100;
    const t = Math.floor(remainder / 10);
    const u = remainder % 10;

    if (h > 0) {
      result += hundreds[h];
    }

    if (remainder > 0) {
      if (h > 0) result += ' و ';
      if (remainder < 10) {
        result += units[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        if (u > 0) {
          result += units[u] + ' و ' + tens[t];
        } else {
          result += tens[t];
        }
      }
    }
    return result;
  }

  const intPart = Math.floor(Math.abs(amount));
  const decPart = Math.round((Math.abs(amount) - intPart) * 100);

  let parts: string[] = [];

  const billions = Math.floor(intPart / 1000000000);
  const millions = Math.floor((intPart % 1000000000) / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const ones = intPart % 1000;

  if (billions > 0) {
    parts.push(convertGroup(billions) + (billions === 1 ? ' مليار' : (billions === 2 ? ' ملياران' : ' مليارات')));
  }
  if (millions > 0) {
    parts.push(convertGroup(millions) + (millions === 1 ? ' مليون' : (millions === 2 ? ' مليونان' : ' ملايين')));
  }
  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else parts.push(convertGroup(thousands) + ' آلاف');
  }
  if (ones > 0) {
    parts.push(convertGroup(ones));
  }

  let text = parts.join(' و ');
  if (!text) text = 'صفر';

  let finalStr = `فقط وقدره ${text} جنيهاً مصرياً`;
  if (decPart > 0) {
    finalStr += ` و ${convertGroup(decPart)} قرشاً`;
  }
  finalStr += ' لا غير';

  return finalStr;
}
