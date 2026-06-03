/**
 * Calculates the CRC16-CCITT checksum for a given string.
 * This is the standard algorithm used by QRIS (EMVCo).
 * Polynomial: 0x1021, Initial: 0xFFFF, No Ref, No XOR Out
 * 
 * @param {string} str - The input string to calculate checksum for.
 * @returns {string} The 4-character hex checksum in uppercase.
 */
export function crc16(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Converts a static QRIS payload into a dynamic QRIS payload by embedding a transaction amount.
 * It parses the TLV structure, updates the initiation method (tag 01) to 12 (dynamic),
 * updates/inserts the amount (tag 54), reconstructs the payload, and calculates the new CRC16 checksum.
 * 
 * @param {string} staticPayload - The raw static QRIS payload text (starts with '000201...').
 * @param {number} amount - The amount to embed in the QRIS code.
 * @returns {string} The generated dynamic QRIS payload text.
 */
export function generateDynamicQRIS(staticPayload, amount) {
  if (!staticPayload) return '';

  // Remove the CRC checksum at the end (last 4 characters, preceded by tag '63' and length '04')
  let qrisWithoutCRC = staticPayload.slice(0, -4);
  
  // Safeguard: Ensure we stripped it precisely where tag '6304' is located
  if (qrisWithoutCRC.endsWith('6304')) {
    qrisWithoutCRC = qrisWithoutCRC.slice(0, -4);
  } else {
    const idx = staticPayload.lastIndexOf('6304');
    if (idx !== -1) {
      qrisWithoutCRC = staticPayload.slice(0, idx);
    }
  }

  // Parse TLV (Tag-Length-Value) blocks
  let index = 0;
  const tags = {};
  while (index < qrisWithoutCRC.length) {
    const tag = qrisWithoutCRC.substring(index, index + 2);
    const length = parseInt(qrisWithoutCRC.substring(index + 2, index + 4), 10);
    const value = qrisWithoutCRC.substring(index + 4, index + 4 + length);
    tags[tag] = value;
    index += 4 + length;
  }

  // Set initiation method (tag 01) to '12' (Dynamic QR Code)
  tags['01'] = '12';

  // Set transaction amount (tag 54)
  const amountStr = String(Math.round(amount));
  tags['54'] = amountStr;

  // Reconstruct the QRIS string in sorted tag order (EMVCo tags are sorted)
  let reconstructed = '';
  const sortedTags = Object.keys(tags).sort();
  for (const tag of sortedTags) {
    const value = tags[tag];
    const len = String(value.length).padStart(2, '0');
    reconstructed += tag + len + value;
  }

  // Append '6304' for the checksum tag and compute the CRC16
  reconstructed += '6304';
  const newCrc = crc16(reconstructed);
  
  return reconstructed + newCrc;
}
