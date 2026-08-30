import cv2
import numpy as np

bg = cv2.imread('public/background.jpg')
hsv = cv2.cvtColor(bg, cv2.COLOR_BGR2HSV)

# Blue color for fountain water
lower_blue = np.array([100, 50, 50])
upper_blue = np.array([130, 255, 255])
mask = cv2.inRange(hsv, lower_blue, upper_blue)

contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
for cnt in contours:
    x, y, w, h = cv2.boundingRect(cnt)
    if w > 20 and h > 20:
        print(f"Found blue area (fountain?) at x={x}, y={y}, w={w}, h={h}")
