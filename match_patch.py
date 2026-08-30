import cv2
import numpy as np

bg = cv2.imread('public/background.jpg')
screen = cv2.imread('C:/Users/Dhodi Presetia/.gemini/antigravity-ide/brain/7b640210-f75e-4440-8d3f-446924b25051/.user_uploaded/media_1788074761559.png')

# The fountain is near the center horizontally, and slightly below center vertically in the screenshot.
# Let's crop the fountain from the screenshot.
# Based on the screenshot dimensions (830x518), center is (415, 259).
# Fountain is around here. Let's just crop a 100x100 patch at (350, 250).
patch = screen[250:350, 350:450]
cv2.imwrite('fountain_patch.jpg', patch)

# Scale screen back to bg width (571)
scale_x = bg.shape[1] / screen.shape[1]
screen_resized = cv2.resize(screen, (bg.shape[1], screen.shape[0]))

# Let's take a larger patch from screen_resized to match in bg
patch2 = screen_resized[100:400, 100:400]

res = cv2.matchTemplate(bg, patch2, cv2.TM_CCOEFF_NORMED)
min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)

print(f"Match score: {max_val:.2f}, max_loc: {max_loc}")

offset_y = max_loc[1] - 100
print(f"Calculated offset Y: {offset_y}")

# Now, read the red boxes again
hsv = cv2.cvtColor(screen, cv2.COLOR_BGR2HSV)
mask = cv2.inRange(hsv, np.array([0, 150, 150]), np.array([10, 255, 255])) + \
       cv2.inRange(hsv, np.array([170, 150, 150]), np.array([180, 255, 255]))
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

boxes = []
for cnt in contours:
    x, y, w, h = cv2.boundingRect(cnt)
    if w > 20 and h > 20:
        # Scale to world
        wx = int(x * scale_x)
        wy = int(y) + offset_y
        ww = int(w * scale_x)
        wh = int(h)
        boxes.append(f"    {{ x: {wx}, y: {wy}, w: {ww}, h: {wh} }},")

print("const collisions = [")
for b in sorted(boxes):
    print(b)
print("];")
