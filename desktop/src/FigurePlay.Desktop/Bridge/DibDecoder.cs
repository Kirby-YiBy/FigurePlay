using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

namespace FigurePlay.Desktop.Bridge
{
    /// <summary>
    /// CF_DIB（DeviceIndependentBitmap，源自 BITMAPINFO 结构）解码器。
    /// 支持 1/4/8/16/24/32bpp、BI_RGB 与 BI_BITFIELDS、自底向上/自顶向下。
    /// </summary>
    internal static class DibDecoder
    {
        public static ClipboardImageResult Decode(byte[] dib, List<string> diagnostics)
        {
            if (diagnostics == null)
            {
                diagnostics = new List<string>();
            }

            if (dib == null || dib.Length < 40)
            {
                throw new InvalidOperationException("DIB 数据不完整。");
            }

            int headerSize = ReadInt32(dib, 0);
            if (headerSize < 40 || headerSize > dib.Length)
            {
                throw new NotSupportedException("不支持的 DIB 头（biSize=" + headerSize + "）。");
            }

            int width = ReadInt32(dib, 4);
            int rawHeight = ReadInt32(dib, 8);
            bool topDown = rawHeight < 0;
            int height = Math.Abs(rawHeight);
            int bitCount = ReadUInt16(dib, 14);
            int compression = ReadInt32(dib, 16);
            int clrUsed = ReadInt32(dib, 32);
            int clrImportant = ReadInt32(dib, 36);

            diagnostics.Add(string.Format(
                "dib: {0}x{1} bpp={2} compression={3} clrUsed={4} topDown={5}",
                width,
                height,
                bitCount,
                compression,
                clrUsed,
                topDown));

            if (width <= 0 || height <= 0 || width > 100000 || height > 100000)
            {
                throw new InvalidOperationException("DIB 尺寸无效：" + width + "x" + height + "。");
            }

            if (compression != 0 && compression != 3)
            {
                throw new NotSupportedException("不支持的 DIB 压缩方式（biCompression=" + compression + "）。");
            }

            if (bitCount != 1 && bitCount != 4 && bitCount != 8 &&
                bitCount != 16 && bitCount != 24 && bitCount != 32)
            {
                throw new NotSupportedException("不支持的 DIB 位深：" + bitCount + "bpp。");
            }

            uint maskR = 0;
            uint maskG = 0;
            uint maskB = 0;
            uint maskA = 0;
            int extraMaskBytes = 0;

            if (compression == 3)
            {
                if (headerSize >= 52)
                {
                    maskR = ReadUInt32(dib, 40);
                    maskG = ReadUInt32(dib, 44);
                    maskB = ReadUInt32(dib, 48);
                    if (headerSize >= 56)
                    {
                        maskA = ReadUInt32(dib, 52);
                    }
                }
                else
                {
                    extraMaskBytes = 12;
                    maskR = ReadUInt32(dib, headerSize);
                    maskG = ReadUInt32(dib, headerSize + 4);
                    maskB = ReadUInt32(dib, headerSize + 8);
                }
            }

            int paletteCount = 0;
            if (bitCount <= 8)
            {
                paletteCount = clrUsed > 0 ? clrUsed : (1 << bitCount);
                if (paletteCount > 1 << bitCount)
                {
                    paletteCount = 1 << bitCount;
                }
            }
            else if (clrUsed > 0)
            {
                paletteCount = clrUsed;
            }

            int paletteOffset = headerSize + extraMaskBytes;
            int dataOffset = paletteOffset + paletteCount * 4;
            if (dataOffset > dib.Length)
            {
                throw new InvalidOperationException("DIB 调色板数据不完整。");
            }

            int[] palette = null;
            if (paletteCount > 0)
            {
                palette = new int[Math.Max(paletteCount, 1 << Math.Min(bitCount, 8))];
                for (int i = 0; i < paletteCount; i++)
                {
                    int p = paletteOffset + i * 4;
                    if (p + 3 >= dib.Length)
                    {
                        break;
                    }

                    byte b = dib[p];
                    byte g = dib[p + 1];
                    byte r = dib[p + 2];
                    palette[i] = (255 << 24) | (r << 16) | (g << 8) | b;
                }
            }

            int stride = ((width * bitCount + 31) / 32) * 4;
            long required = (long)dataOffset + (long)stride * height;
            if (required > dib.Length)
            {
                throw new InvalidOperationException(
                    "DIB 像素数据不完整（需要 " + required + " 字节，实际 " + dib.Length + " 字节）。");
            }

            int pixelBytes = bitCount / 8;
            int byteWidth = width * 4;
            using (Bitmap bitmap = new Bitmap(width, height, PixelFormat.Format32bppArgb))
            {
                BitmapData bitmapData = bitmap.LockBits(
                    new Rectangle(0, 0, width, height),
                    ImageLockMode.WriteOnly,
                    PixelFormat.Format32bppArgb);
                try
                {
                    byte[] row = new byte[byteWidth];
                    for (int y = 0; y < height; y++)
                    {
                        int sourceRow = topDown ? y : (height - 1 - y);
                        int source = dataOffset + sourceRow * stride;
                        DecodeRow(
                            dib,
                            source,
                            row,
                            width,
                            bitCount,
                            pixelBytes,
                            compression,
                            palette,
                            maskR,
                            maskG,
                            maskB,
                            maskA);
                        Marshal.Copy(row, 0, IntPtr.Add(bitmapData.Scan0, y * bitmapData.Stride), row.Length);
                    }
                }
                finally
                {
                    bitmap.UnlockBits(bitmapData);
                }

                ClipboardImageResult result = RasterConverter.FromImage(bitmap, "DIB", diagnostics);
                return result;
            }
        }

        private static void DecodeRow(
            byte[] dib,
            int source,
            byte[] row,
            int width,
            int bitCount,
            int pixelBytes,
            int compression,
            int[] palette,
            uint maskR,
            uint maskG,
            uint maskB,
            uint maskA)
        {
            switch (bitCount)
            {
                case 32:
                    for (int x = 0; x < width; x++)
                    {
                        int p = source + x * 4;
                        if (compression == 3 && maskR != 0 && maskG != 0 && maskB != 0)
                        {
                            uint value = (uint)(dib[p] | (dib[p + 1] << 8) | (dib[p + 2] << 16) | (dib[p + 3] << 24));
                            byte r;
                            byte g;
                            byte b;
                            byte a;
                            ApplyMasks(value, maskR, maskG, maskB, maskA, out r, out g, out b, out a);
                            SetPixel(row, x * 4, r, g, b, a);
                        }
                        else
                        {
                            // 标准 CF_DIB 的 32bpp 不保证 Alpha 有效，统一按不透明处理。
                            SetPixel(row, x * 4, dib[p + 2], dib[p + 1], dib[p], 255);
                        }
                    }

                    break;

                case 24:
                    for (int x = 0; x < width; x++)
                    {
                        int p = source + x * 3;
                        SetPixel(row, x * 4, dib[p + 2], dib[p + 1], dib[p], 255);
                    }

                    break;

                case 16:
                    for (int x = 0; x < width; x++)
                    {
                        int p = source + x * 2;
                        ushort value = (ushort)(dib[p] | (dib[p + 1] << 8));
                        if (compression == 3 && maskR != 0)
                        {
                            byte r;
                            byte g;
                            byte b;
                            byte a;
                            ApplyMasks(value, maskR, maskG, maskB, maskA, out r, out g, out b, out a);
                            SetPixel(row, x * 4, r, g, b, a);
                        }
                        else
                        {
                            int r = (value >> 10) & 0x1F;
                            int g = (value >> 5) & 0x1F;
                            int b = value & 0x1F;
                            SetPixel(
                                row,
                                x * 4,
                                (byte)((r * 255 + 15) / 31),
                                (byte)((g * 255 + 15) / 31),
                                (byte)((b * 255 + 15) / 31),
                                255);
                        }
                    }

                    break;

                case 8:
                    for (int x = 0; x < width; x++)
                    {
                        int index = dib[source + x];
                        int color = index < palette.Length ? palette[index] : unchecked((int)0xFF000000);
                        WriteArgb(row, x * 4, color);
                    }

                    break;

                case 4:
                    for (int x = 0; x < width; x++)
                    {
                        int p = source + (x >> 1);
                        byte value = dib[p];
                        int index = (x & 1) == 0 ? (value >> 4) : (value & 0x0F);
                        int color = index < palette.Length ? palette[index] : unchecked((int)0xFF000000);
                        WriteArgb(row, x * 4, color);
                    }

                    break;

                case 1:
                    for (int x = 0; x < width; x++)
                    {
                        int p = source + (x >> 3);
                        int index = (dib[p] >> (7 - (x & 7))) & 1;
                        int color = index < palette.Length ? palette[index] : unchecked((int)0xFF000000);
                        WriteArgb(row, x * 4, color);
                    }

                    break;

                default:
                    throw new NotSupportedException("不支持的 DIB 位深：" + bitCount + "bpp。");
            }
        }

        private static void SetPixel(byte[] row, int offset, byte r, byte g, byte b, byte a)
        {
            row[offset] = b;
            row[offset + 1] = g;
            row[offset + 2] = r;
            row[offset + 3] = a;
        }

        private static void WriteArgb(byte[] row, int offset, int argb)
        {
            row[offset] = (byte)(argb & 0xFF);
            row[offset + 1] = (byte)((argb >> 8) & 0xFF);
            row[offset + 2] = (byte)((argb >> 16) & 0xFF);
            row[offset + 3] = (byte)((argb >> 24) & 0xFF);
        }

        private static void ApplyMasks(
            uint value,
            uint maskR,
            uint maskG,
            uint maskB,
            uint maskA,
            out byte r,
            out byte g,
            out byte b,
            out byte a)
        {
            r = ExtractChannel(value, maskR);
            g = ExtractChannel(value, maskG);
            b = ExtractChannel(value, maskB);
            a = maskA == 0 ? (byte)255 : ExtractChannel(value, maskA);
        }

        private static byte ExtractChannel(uint value, uint mask)
        {
            if (mask == 0)
            {
                return 0;
            }

            int shift = 0;
            while (shift < 32 && ((mask >> shift) & 1) == 0)
            {
                shift++;
            }

            uint extracted = (value & mask) >> shift;
            uint max = mask >> shift;
            if (max == 0)
            {
                return 0;
            }

            return (byte)((extracted * 255u + (max / 2)) / max);
        }

        private static int ReadInt32(byte[] buffer, int offset)
        {
            return buffer[offset]
                | (buffer[offset + 1] << 8)
                | (buffer[offset + 2] << 16)
                | (buffer[offset + 3] << 24);
        }

        private static int ReadUInt16(byte[] buffer, int offset)
        {
            return buffer[offset] | (buffer[offset + 1] << 8);
        }

        private static uint ReadUInt32(byte[] buffer, int offset)
        {
            return (uint)ReadInt32(buffer, offset);
        }
    }
}
