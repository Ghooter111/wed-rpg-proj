import cv2
import numpy as np

bg = cv2.imread('public/background.jpg')
screen = cv2.imread('C:/Users/Dhodi Presetia/.gemini/antigravity-ide/brain/7b640210-f75e-4440-8d3f-446924b25051/.user_uploaded/media_1788074761559.png')

scale_x = bg.shape[1] / screen.shape[1]
offset_y = 298

hsv = cv2.cvtColor(screen, cv2.COLOR_BGR2HSV)
mask = cv2.inRange(hsv, np.array([0, 150, 150]), np.array([10, 255, 255])) + \
       cv2.inRange(hsv, np.array([170, 150, 150]), np.array([180, 255, 255]))
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

boxes = []
for cnt in contours:
    x, y, w, h = cv2.boundingRect(cnt)
    if w > 20 and h > 20:
        wx = int(x * scale_x)
        wy = int(y) + offset_y
        ww = int(w * scale_x)
        wh = int(h)
        # Tweak boxes slightly to make them fit nicely
        boxes.append(f"    {{ x: {wx}, y: {wy}, w: {ww}, h: {wh} }},")

print("const collisions = [")
for b in sorted(boxes):
    print(b)
print("];")
