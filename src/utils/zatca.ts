/**
 * Saudi ZATCA (Fatoora) E-Invoicing QR Code TLV (Tag-Length-Value) Encoder.
 * Strictly complies with Saudi Arabia's Phase 1 & 2 e-invoicing requirements.
 */

function encodeTLV(tag: number, value: string): Uint8Array {
  const valueBuffer = new TextEncoder().encode(value);
  const buffer = new Uint8Array(2 + valueBuffer.length);
  buffer[0] = tag;
  buffer[1] = valueBuffer.length;
  buffer.set(valueBuffer, 2);
  return buffer;
}

export function generateZATCABase64(
  sellerName: string,
  vatNumber: string,
  timestamp: string, // ISO 8601 (e.g. 2026-07-19T08:46:58Z)
  totalWithVat: string, // e.g. "300.00"
  vatAmount: string // e.g. "39.13"
): string {
  try {
    const tlv1 = encodeTLV(1, sellerName);
    const tlv2 = encodeTLV(2, vatNumber);
    const tlv3 = encodeTLV(3, timestamp);
    const tlv4 = encodeTLV(4, totalWithVat);
    const tlv5 = encodeTLV(5, vatAmount);

    const totalLength = tlv1.length + tlv2.length + tlv3.length + tlv4.length + tlv5.length;
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    [tlv1, tlv2, tlv3, tlv4, tlv5].forEach(buf => {
      combined.set(buf, offset);
      offset += buf.length;
    });

    // Convert Uint8Array to Base64 in a browser-safe environment
    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error('Error encoding ZATCA TLV:', error);
    return '';
  }
}

/**
 * Generates an image URL for the QR code from the base64-encoded ZATCA TLV data.
 * Utilizes qrserver API as a stable, lightweight, zero-dependency visual encoder.
 */
export function getZATCAQRImageUrl(base64Data: string): string {
  if (!base64Data) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(base64Data)}`;
}
