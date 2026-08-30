import cv2
import numpy as np

bg = cv2.imread('public/background.jpg') # 571 x 1024
screen = cv2.imread('C:/Users/Dhodi Presetia/.gemini/antigravity-ide/brain/7b640210-f75e-4440-8d3f-446924b25051/.user_uploaded/media_1788074761559.png') # 830 x 518

# Extract red boxes first in screen coordinates
hsv = cv2.cvtColor(screen, cv2.COLOR_BGR2HSV)
mask1 = cv2.inRange(hsv, np.array([0, 150, 150]), np.array([10, 255, 255]))
mask2 = cv2.inRange(hsv, np.array([170, 150, 150]), np.array([180, 255, 255]))
mask = mask1 + mask2

contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
boxes = []
for cnt in contours:
    x, y, w, h = cv2.boundingRect(cnt)
    if w > 20 and h > 20:
        boxes.append((x, y, w, h))

print(f"Found {len(boxes)} red boxes.")

# Scale screen horizontally to match bg width (571)
scale_x = bg.shape[1] / screen.shape[1] # 571 / 830
screen_resized = cv2.resize(screen, (bg.shape[1], screen.shape[0]))

# Match template to find Y offset
# We only care about Y offset since X is aligned (both are 571 wide now)
res = cv2.matchTemplate(bg, screen_resized, cv2.TM_CCOEFF_NORMED)
min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)

offset_x, offset_y = max_loc
print(f"Match score: {max_val:.2f}, offset Y: {offset_y}")

final_boxes = []
for bx, by, bw, bh in boxes:
    # Scale X coordinates and add Y offset
    fx = int(bx * scale_x)
    fw = int(bw * scale_x)
    fy = by + offset_y
    # Slight margin reduction
    final_boxes.append(f"{{ x: {fx}, y: {fy}, w: {fw}, h: {bh} }},")

print("const collisions = [")
for b in sorted(final_boxes):
    print("    " + b)
print("];")
