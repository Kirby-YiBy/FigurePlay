/* FigurePlay · 极简 ZIP 打包（store 无压缩，用于多页导出） */
(function () {
  'use strict';
  const FP = (window.FP = window.FP || {});

  const CRC_TABLE = (function () {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function encodeName(name) {
    return new TextEncoder().encode(String(name));
  }

  function dosDateTime(date) {
    const d = date || new Date();
    const year = Math.max(1980, d.getFullYear());
    const time = ((d.getHours() & 0x1F) << 11) | ((d.getMinutes() & 0x3F) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1F);
    const day = ((year - 1980) << 9) | (((d.getMonth() + 1) & 0x0F) << 5) | (d.getDate() & 0x1F);
    return { time: time & 0xFFFF, date: day & 0xFFFF };
  }

  /**
   * @param {Array<{name:string, bytes:Uint8Array}>} files
   * @returns {Uint8Array}
   */
  FP.buildZip = function (files) {
    const chunks = [];
    const central = [];
    let offset = 0;
    const stamp = dosDateTime(new Date());
    files.forEach(function (file) {
      const data = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
      const nameBytes = encodeName(file.name);
      const crc = crc32(data);
      const local = new Uint8Array(30 + nameBytes.length + data.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);      // version needed
      lv.setUint16(6, 0x0800, true);  // UTF-8 filename
      lv.setUint16(8, 0, true);       // method: store
      lv.setUint16(10, stamp.time, true);
      lv.setUint16(12, stamp.date, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      local.set(data, 30 + nameBytes.length);
      chunks.push(local);

      const cd = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);      // version made by
      cv.setUint16(6, 20, true);      // version needed
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, stamp.time, true);
      cv.setUint16(14, stamp.date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      cd.set(nameBytes, 46);
      central.push(cd);

      offset += local.length;
    });

    let centralSize = 0;
    central.forEach(function (cd) { centralSize += cd.length; });
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    let total = offset + centralSize + eocd.length;
    const out = new Uint8Array(total);
    let pos = 0;
    chunks.forEach(function (chunk) { out.set(chunk, pos); pos += chunk.length; });
    central.forEach(function (chunk) { out.set(chunk, pos); pos += chunk.length; });
    out.set(eocd, pos);
    return out;
  };
})();
