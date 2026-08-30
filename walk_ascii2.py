import os
from PIL import Image

img = Image.open('C:/Users/Dhodi Presetia/.gemini/antigravity-ide/brain/7b640210-f75e-4440-8d3f-446924b25051/.user_uploaded/media_1788074453772.png').convert('L')
pixels = img.load()
for y in range(img.height):
    print(''.join(['#' if pixels[x,y] < 100 else '.' for x in range(img.width)]))
