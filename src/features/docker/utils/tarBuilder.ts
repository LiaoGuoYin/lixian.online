// 简单的 TAR 文件构建器，专门用于浏览器环境
export class TarBuilder {
  private data: Uint8Array[] = [];
  private totalSize = 0;

  // TAR 头部格式
  private createHeader(name: string, size: number, mode = '0000644', uid = '0000000', gid = '0000000', type = '0'): Uint8Array {
    const header = new Uint8Array(512);
    const encoder = new TextEncoder();

    // 文件名 (100 bytes)
    const nameBytes = encoder.encode(name);
    header.set(nameBytes.slice(0, 100), 0);

    // 文件模式 (8 bytes)
    const modeBytes = encoder.encode(mode.padStart(7, '0') + '\0');
    header.set(modeBytes, 100);

    // 用户 ID (8 bytes)
    const uidBytes = encoder.encode(uid.padStart(7, '0') + '\0');
    header.set(uidBytes, 108);

    // 组 ID (8 bytes)
    const gidBytes = encoder.encode(gid.padStart(7, '0') + '\0');
    header.set(gidBytes, 116);

    // 文件大小 (12 bytes)
    const sizeStr = size.toString(8).padStart(11, '0') + '\0';
    const sizeBytes = encoder.encode(sizeStr);
    header.set(sizeBytes, 124);

    // 修改时间 (12 bytes) - 当前时间
    const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0';
    const mtimeBytes = encoder.encode(mtime);
    header.set(mtimeBytes, 136);

    // 校验和字段先填 8 个空格（TAR spec 要求计算时此字段视为空格）
    header.set(encoder.encode('        '), 148);

    // 文件类型 (1 byte) — 必须在计算 checksum 之前设置
    header.set(encoder.encode(type), 156);

    // 计算校验和（此时 header 已包含正确的 typeflag）
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }

    // 写入校验和
    const checksumStr = checksum.toString(8).padStart(6, '0') + '\0 ';
    const checksumBytes = encoder.encode(checksumStr);
    header.set(checksumBytes, 148);

    return header;
  }

  // 添加文件到 TAR
  addFile(name: string, content: string | Uint8Array): void {
    const contentBytes = typeof content === 'string' 
      ? new TextEncoder().encode(content)
      : content;
    
    // 添加头部
    const header = this.createHeader(name, contentBytes.length);
    this.data.push(header);
    this.totalSize += 512;
    
    // 添加内容
    this.data.push(contentBytes);
    this.totalSize += contentBytes.length;
    
    // TAR 要求 512 字节对齐
    const padding = (512 - (contentBytes.length % 512)) % 512;
    if (padding > 0) {
      const paddingBytes = new Uint8Array(padding);
      this.data.push(paddingBytes);
      this.totalSize += padding;
    }
  }

  // 添加空目录
  addDirectory(name: string): void {
    const dirName = name.endsWith('/') ? name : name + '/';
    // 传入 type='5'，checksum 在 createHeader 内部正确计算
    const header = this.createHeader(dirName, 0, '0000755', '0000000', '0000000', '5');
    this.data.push(header);
    this.totalSize += 512;
  }

  // 生成最终的 TAR 数据
  build(): Uint8Array {
    // TAR 文件以两个空的 512 字节块结束
    const endBlock1 = new Uint8Array(512);
    const endBlock2 = new Uint8Array(512);
    this.data.push(endBlock1, endBlock2);
    this.totalSize += 1024;
    
    // 合并所有数据
    const result = new Uint8Array(this.totalSize);
    let offset = 0;
    
    for (const chunk of this.data) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }
}