import sys
from PIL import Image

# Read images
bg_img = Image.open('public/background.jpg')
screen_path = 'C:/Users/Dhodi Presetia/.gemini/antigravity-ide/brain/7b640210-f75e-4440-8d3f-446924b25051/.user_uploaded/media_1788074761559.png'
screen_img = Image.open(screen_path).convert('RGB')

print(f"Background size: {bg_img.size}")
print(f"Screenshot size: {screen_img.size}")

pixels = screen_img.load()
w, h = screen_img.size

# Very naive bounding box finding
red_pixels = []
for y in range(h):
    for x in range(w):
        r, g, b = pixels[x, y]
        # Red line detection: high red, low green and blue
        if r > 200 and g < 50 and b < 50:
            red_pixels.append((x, y))

# Group red pixels into separate boxes
boxes = []
for rx, ry in red_pixels:
    matched = False
    for i, (bx, by, bw, bh) in enumerate(boxes):
        if bx - 10 <= rx <= bx + bw + 10 and by - 10 <= ry <= by + bh + 10:
            # Expand box
            new_bx = min(bx, rx)
            new_by = min(by, ry)
            new_bw = max(bx + bw, rx) - new_bx
            new_bh = max(by + bh, ry) - new_by
            boxes[i] = (new_bx, new_by, new_bw, new_bh)
            matched = True
            break
    if not matched:
        boxes.append((rx, ry, 1, 1))

# Filter small boxes
boxes = [b for b in boxes if b[2] > 20 and b[3] > 20]
boxes.sort(key=lambda b: b[1])

print("Found red boxes:")
for b in boxes:
    print(b)
