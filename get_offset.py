import cv2
import numpy as np

bg = cv2.imread('public/background.jpg') # 571 x 1024
screen = cv2.imread('C:/Users/Dhodi Presetia/.gemini/antigravity-ide/brain/7b640210-f75e-4440-8d3f-446924b25051/.user_uploaded/media_1788074761559.png') # 830 x 518

scale_x = bg.shape[1] / screen.shape[1]
screen_resized = cv2.resize(screen, (bg.shape[1], screen.shape[0]))

# Crop a small patch from screen_resized that has NO red boxes.
# Looking at the image, the very top-left corner (0-100, 0-100) has a red box?
# Let's crop a slice from x=0 to x=100, y=200 to y=300
patch = screen_resized[200:300, 0:100]

res = cv2.matchTemplate(bg, patch, cv2.TM_CCOEFF_NORMED)
min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)

print(f"Patch match score: {max_val:.2f}, max_loc: {max_loc}")

# The patch was taken from y=200 in the screen.
# So max_loc[1] corresponds to screen_y = 200.
# Therefore, screen_y = 0 corresponds to max_loc[1] - 200
offset_y = max_loc[1] - 200

print(f"Calculated offset Y: {offset_y}")
