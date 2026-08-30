import os
from PIL import Image

files = ['walk_up.png', 'walk_left.png', 'walk_right.png', 'walk_down.png']
chars = ' .:-=+*#%@'

for f in files:
    print('\n---', f, '---')
    try:
        img = Image.open('public/'+f).convert('RGBA')
        # Replace transparent with white
        bg = Image.new('RGBA', img.size, (255,255,255,255))
        out = Image.alpha_composite(bg, img).convert('L').resize((60, 30))
        pixels = out.load()
        for y in range(out.height):
            print(''.join([chars[pixels[x,y]//26] for x in range(out.width)]))
    except Exception as e:
        print(e)
