"""Strip the flat checkerboard background from the generated sticker PNGs.

The image generator returned RGB PNGs whose "transparency" is a painted
light-grey checkerboard, so a naive colour key would also eat the character's
white outline. This does a border-connected flood fill over low-saturation,
high-brightness pixels instead, then re-encodes real RGBA PNGs.

Usage: python tools/matting.py   (run from the package root; needs ffmpeg on PATH)
"""
import subprocess
from collections import deque
from pathlib import Path

FFMPEG = "ffmpeg"
ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
W = H = 1024
NAMES = ["hero", "obstacle", "gameover", "ball"]


def read_rgb(path):
    out = subprocess.run(
        [FFMPEG, "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True,
    ).stdout
    assert len(out) == W * H * 3, (path, len(out))
    return out


def background_mask(rgb):
    n = W * H
    mask = bytearray(n)
    for i in range(n):
        j = i * 3
        r, g, b = rgb[j], rgb[j + 1], rgb[j + 2]
        mx = r if r > g else g
        if b > mx:
            mx = b
        mn = r if r < g else g
        if b < mn:
            mn = b
        # light grey / off-white checkerboard tiles, including its noise
        if mx - mn < 42 and (r + g + b) > 500:
            mask[i] = 1
    return mask


def flood_alpha(mask):
    n = W * H
    alpha = bytearray(b"\xff" * n)
    seen = bytearray(n)
    q = deque()

    def seed(i):
        if mask[i] and not seen[i]:
            seen[i] = 1
            alpha[i] = 0
            q.append(i)

    for x in range(W):
        seed(x)
        seed((H - 1) * W + x)
    for y in range(H):
        seed(y * W)
        seed(y * W + W - 1)

    while q:
        i = q.popleft()
        x = i % W
        if x > 0:
            k = i - 1
            if mask[k] and not seen[k]:
                seen[k] = 1
                alpha[k] = 0
                q.append(k)
        if x < W - 1:
            k = i + 1
            if mask[k] and not seen[k]:
                seen[k] = 1
                alpha[k] = 0
                q.append(k)
        if i >= W:
            k = i - W
            if mask[k] and not seen[k]:
                seen[k] = 1
                alpha[k] = 0
                q.append(k)
        if i < n - W:
            k = i + W
            if mask[k] and not seen[k]:
                seen[k] = 1
                alpha[k] = 0
                q.append(k)
    return alpha


def main():
    for name in NAMES:
        src = ASSETS / (name + ".png")
        rgb = read_rgb(src)
        alpha = flood_alpha(background_mask(rgb))
        transparent = alpha.count(0)
        print(name, "transparent pixels:", transparent, "/", W * H,
              "(%.1f%%)" % (100 * transparent / (W * H)))
        rgba = bytearray(W * H * 4)
        rgba[0::4] = rgb[0::3]
        rgba[1::4] = rgb[1::3]
        rgba[2::4] = rgb[2::3]
        rgba[3::4] = alpha
        dst = ASSETS / (name + ".rgba.png")
        subprocess.run(
            [FFMPEG, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba",
             "-s", "%dx%d" % (W, H), "-i", "-", "-c:v", "png", "-pix_fmt", "rgba", str(dst)],
            input=bytes(rgba), check=True,
        )
        print("  ->", dst.name)


if __name__ == "__main__":
    main()
