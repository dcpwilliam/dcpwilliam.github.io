#!/usr/bin/env python3
# 微信小程序图标生成器

import os
import base64

def create_simple_icon(color):
    r, g, b = color
    size = 64
    png_header = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00@\x00\x00\x00@\x08\x06\x00\x00\x00s\xf4\xf6Y'
    
    raw_data = []
    for y in range(size):
        raw_data.append(b'\x00')
        for x in range(size):
            cx, cy = size//2, size//2
            dist = ((x - cx)**2 + (y - cy)**2)**0.5
            if dist < 20:
                raw_data.append(bytes([r, g, b, 255]))
            else:
                raw_data.append(b'\x00\x00\x00\x00')
    
    import zlib
    compressed = zlib.compress(b''.join(raw_data))
    
    ihdr_data = b'\x00\x00\x00\rIHDR\x00\x00\x00@\x00\x00\x00@\x08\x06\x00\x00\x00s\xf4\xf6Y'
    ihdr_crc = (zlib.crc32(ihdr_data) & 0xffffffff).to_bytes(4, 'big')
    
    idat_len = len(compressed).to_bytes(4, 'big')
    idat_chunk = b'IDAT' + compressed
    idat_crc = (zlib.crc32(idat_chunk) & 0xffffffff).to_bytes(4, 'big')
    
    iend = b'\x00\x00\x00\x00IEND\xaeB`\x82'
    
    png = (
        b'\x89PNG\r\n\x1a\n' +
        b'\x00\x00\x00\rIHDR\x00\x00\x00@\x00\x00\x00@\x08\x06\x00\x00\x00s\xf4\xf6Y' +
        (zlib.crc32(b'IHDR\x00\x00\x00@\x00\x00\x00@\x08\x06\x00\x00\x00s\xf4\xf6Y') & 0xffffffff).to_bytes(4, 'big') +
        idat_len + b'IDAT' + compressed + idat_crc +
        iend
    )
    
    return png

icons = ['home', 'map', 'factor', 'simback', 'me']
normal_color = (136, 153, 170)
active_color = (0, 212, 255)

os.makedirs('miniapp/images', exist_ok=True)

for name in icons:
    # 普通状态
    png = create_simple_icon(normal_color)
    with open(f'miniapp/images/{name}.png', 'wb') as f:
        f.write(png)
    print(f'✓ {name}.png')
    
    # 选中状态
    png_active = create_simple_icon(active_color)
    with open(f'miniapp/images/{name}-active.png', 'wb') as f:
        f.write(png_active)
    print(f'✓ {name}-active.png')

print('\n🎉 图标生成完成！')
