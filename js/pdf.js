/* FigurePlay · 极简 PDF 生成器（支持多页，内嵌 JPEG 位图，无第三方依赖） */
(function () {
  'use strict';
  const FP = (window.FP = window.FP || {});

  function pad10(n) {
    const s = String(Math.max(0, Math.floor(n)));
    return '0000000000'.slice(s.length) + s;
  }

  function ascii(str) {
    return new TextEncoder().encode(str);
  }

  function pdfString(str) {
    str = String(str == null ? '' : str);
    let printable = true;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 32 || code > 126) { printable = false; break; }
    }
    if (printable) {
      return '(' + str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')';
    }
    let hex = 'FEFF';
    for (let i = 0; i < str.length; i++) {
      hex += ('0000' + str.charCodeAt(i).toString(16).toUpperCase()).slice(-4);
    }
    return '<' + hex + '>';
  }

  function concat(parts) {
    let total = 0;
    for (let i = 0; i < parts.length; i++) total += parts[i].length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (let i = 0; i < parts.length; i++) {
      out.set(parts[i], offset);
      offset += parts[i].length;
    }
    return out;
  }

  function pdfDate(date) {
    const d = date || new Date();
    function p(n) { return ('0' + n).slice(-2); }
    return 'D:' + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
      p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  }

  function jpegSize(bytes) {
    if (!bytes || bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
      throw new Error('PDF 生成失败：JPEG 数据无效');
    }
    for (let i = 2; i < bytes.length - 9;) {
      if (bytes[i] !== 0xFF) { i++; continue; }
      const marker = bytes[i + 1];
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2 || marker === 0xC3 ||
        marker === 0xC5 || marker === 0xC6 || marker === 0xC7 ||
        marker === 0xC9 || marker === 0xCA || marker === 0xCB ||
        marker === 0xCD || marker === 0xCE || marker === 0xCF) {
        return {
          height: (bytes[i + 5] << 8) | bytes[i + 6],
          width: (bytes[i + 7] << 8) | bytes[i + 8]
        };
      }
      if (marker === 0xD8 || marker === 0xD9) { i += 2; continue; }
      const len = (bytes[i + 2] << 8) | bytes[i + 3];
      if (len < 2) break;
      i += 2 + len;
    }
    throw new Error('PDF 生成失败：无法读取 JPEG 尺寸');
  }

  /**
   * 生成多页 PDF。
   * @param {Array<{jpegBytes:Uint8Array,widthMm:number,heightMm:number}>} pages
   * @param {object} opts { title }
   * @returns {Uint8Array}
   */
  FP.buildPdfFromImages = function (pages, opts) {
    opts = opts || {};
    if (!Array.isArray(pages) || !pages.length) throw new Error('PDF 生成失败：没有页面');
    const title = pdfString(opts.title || 'figure');
    const creator = pdfString((opts.creator || 'FigurePlay') + ' ' + FP.APP_VERSION);
    const date = pdfString(pdfDate());

    const objects = [];
    let next = 1;
    const catalogNum = next++;
    const pagesNum = next++;
    objects[catalogNum] = [ascii('<< /Type /Catalog /Pages ' + pagesNum + ' 0 R >>')];
    const pageNums = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const size = jpegSize(page.jpegBytes);
      const widthPt = page.widthMm * 72 / 25.4;
      const heightPt = page.heightMm * 72 / 25.4;
      const w = widthPt.toFixed(3);
      const h = heightPt.toFixed(3);
      const pageNum = next++;
      const imgNum = next++;
      const contentNum = next++;
      const content = 'q\n' + w + ' 0 0 ' + h + ' 0 0 cm\n/Im0 Do\nQ\n';
      const contentBytes = ascii(content);
      objects[imgNum] = [
        ascii('<< /Type /XObject /Subtype /Image /Width ' + size.width + ' /Height ' + size.height +
          ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + page.jpegBytes.length + ' >>\nstream\n'),
        page.jpegBytes,
        ascii('\nendstream')
      ];
      objects[contentNum] = [
        ascii('<< /Length ' + contentBytes.length + ' >>\nstream\n'),
        contentBytes,
        ascii('endstream')
      ];
      objects[pageNum] = [ascii(
        '<< /Type /Page /Parent ' + pagesNum + ' 0 R /MediaBox [0 0 ' + w + ' ' + h + '] ' +
        '/Resources << /XObject << /Im0 ' + imgNum + ' 0 R >> /ProcSet [/PDF /ImageC] >> ' +
        '/Contents ' + contentNum + ' 0 R >>'
      )];
      pageNums.push(pageNum);
    }
    objects[pagesNum] = [ascii('<< /Type /Pages /Kids [' +
      pageNums.map(function (n) { return n + ' 0 R'; }).join(' ') + '] /Count ' + pages.length + ' >>')];

    const infoNum = next++;
    objects[infoNum] = [ascii(
      '<< /Title ' + title + ' /Creator ' + creator + ' /Producer ' + creator +
      ' /CreationDate ' + date + ' >>'
    )];

    const chunks = [];
    let offset = 0;
    function push(bytes) { chunks.push(bytes); offset += bytes.length; }
    function pushText(str) { push(ascii(str)); }

    pushText('%PDF-1.4\n%');
    push(new Uint8Array([0xE2, 0xE3, 0xCF, 0xD3]));
    pushText('\n');

    const offsets = [0];
    for (let i = 1; i <= infoNum; i++) {
      offsets[i] = offset;
      pushText(i + ' 0 obj\n');
      const segments = objects[i] || [ascii('<< >>')];
      for (let s = 0; s < segments.length; s++) push(segments[s]);
      pushText('\nendobj\n');
    }

    const xrefStart = offset;
    pushText('xref\n0 ' + (infoNum + 1) + '\n');
    pushText('0000000000 65535 f \n');
    for (let i = 1; i <= infoNum; i++) {
      pushText(pad10(offsets[i]) + ' 00000 n \n');
    }
    pushText('trailer\n<< /Size ' + (infoNum + 1) + ' /Root ' + catalogNum + ' 0 R /Info ' + infoNum + ' 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF\n');
    return concat(chunks);
  };

  /**
   * 单页 PDF（兼容旧调用）：由 JPEG 字节构建。
   */
  FP.buildPdfFromJpeg = function (jpegBytes, geom, opts) {
    return FP.buildPdfFromImages([{
      jpegBytes: jpegBytes,
      widthMm: geom.widthMm,
      heightMm: geom.heightMm
    }], opts);
  };

  FP.pdfPointSize = function (geom) {
    return {
      width: geom.widthMm * 72 / 25.4,
      height: geom.heightMm * 72 / 25.4
    };
  };
})();
