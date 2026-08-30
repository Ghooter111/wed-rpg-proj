from PIL import Image

img = Image.open('public/background.jpg').convert('L')
img = img.resize((114, 102)) # scale down to fit in console
pixels = img.load()
chars = " .:-=+*#%@"

for y in range(img.height):
    line = ""
    for x in range(img.width):
        val = pixels[x, y]
        # map 0-255 to 0-9
        idx = int(val / 256 * 10)
        line += chars[idx]
    print(line)
