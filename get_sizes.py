import os
import struct

def get_image_size(file_path):
    with open(file_path, 'rb') as f:
        head = f.read(24)
        if len(head) != 24:
            return None
        if head.startswith(b'\x89PNG\r\n\x1a\n'):
            width, height = struct.unpack('>ii', head[16:24])
            return width, height
    return None

img_dir = r"c:\Users\VAI\Github\Aether\images"
for filename in os.listdir(img_dir):
    if filename.endswith(".png"):
        size = get_image_size(os.path.join(img_dir, filename))
        if size:
            print(f"{filename}: {size[0]}x{size[1]}")
