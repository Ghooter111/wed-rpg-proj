import cv2
import numpy as np

bg = cv2.imread('public/background.jpg')
screen = cv2.imread('C:/Users/Dhodi Presetia/.gemini/antigravity-ide/brain/7b640210-f75e-4440-8d3f-446924b25051/.user_uploaded/media_1788074761559.png')

# Find red boxes in screen
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

# To find offset, crop a patch from screen that doesn't have red boxes or UI
# Let's just use matchTemplate directly. The red boxes might introduce noise, but bg dominates.
res = cv2.matchTemplate(bg, screen, cv2.TM_CCOEFF_NORMED)
min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)

offset_x, offset_y = max_loc
print(f"Screenshot offset relative to bg: x={offset_x}, y={offset_y}, match={max_val:.2f}")

# Map boxes to bg coordinates
final_boxes = []
for bx, by, bw, bh in boxes:
    fx = bx + offset_x
    fy = by + offset_y
    final_boxes.append(f"{{ x: {fx}, y: {fy}, w: {bw}, h: {bh} }},")

print("const collisions = [")
for b in sorted(final_boxes):
    print("    " + b)
print("];")
