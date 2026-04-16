export async function convertCrxToZip(crxBlob: Blob): Promise<Blob> {
  try {
    const buffer = await crxBlob.arrayBuffer();

    if (buffer.byteLength < 16) {
      console.warn("文件太小，可能已经是 ZIP 格式");
      return crxBlob;
    }

    const view = new DataView(buffer);
    const textDecoder = new TextDecoder();

    const zipMagic = textDecoder.decode(buffer.slice(0, 2));
    if (zipMagic === "PK") {
      return new Blob([buffer], { type: "application/zip" });
    }

    const magic = textDecoder.decode(buffer.slice(0, 4));
    let zipOffset = 0;

    if (magic === "Cr24") {
      const version = view.getUint32(4, true);

      if (version === 3) {
        if (buffer.byteLength < 12) {
          throw new Error("CRX3 文件头不完整");
        }
        const headerSize = view.getUint32(8, true);
        zipOffset = 12 + headerSize;
      } else if (version === 2) {
        if (buffer.byteLength < 16) {
          throw new Error("CRX2 文件头不完整");
        }
        const pubKeyLength = view.getUint32(8, true);
        const sigLength = view.getUint32(12, true);
        zipOffset = 16 + pubKeyLength + sigLength;
      } else {
        throw new Error(`不支持的 CRX 版本: ${version}`);
      }
    } else {
      for (let index = 0; index < Math.min(buffer.byteLength - 2, 1024); index++) {
        const testMagic = textDecoder.decode(buffer.slice(index, index + 2));
        if (testMagic === "PK") {
          zipOffset = index;
          break;
        }
      }

      if (zipOffset === 0) {
        return new Blob([buffer], { type: "application/zip" });
      }
    }

    if (zipOffset >= buffer.byteLength) {
      throw new Error("ZIP 数据偏移量超出文件范围");
    }

    const zipData = buffer.slice(zipOffset);
    if (zipData.byteLength < 4) {
      throw new Error("提取的 ZIP 数据太小");
    }

    const zipHeader = textDecoder.decode(zipData.slice(0, 2));
    if (zipHeader !== "PK") {
      throw new Error("提取的数据不是有效的 ZIP 格式");
    }

    return new Blob([zipData], { type: "application/zip" });
  } catch (error) {
    console.error("CRX 转 ZIP 失败:", error);
    return crxBlob;
  }
}
