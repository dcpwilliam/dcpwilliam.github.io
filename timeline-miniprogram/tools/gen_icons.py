# -*- coding: utf-8 -*-
"""生成 tabBar 图标（81x81 PNG，透明背景）。
用法: python tools/gen_icons.py
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "images", "tab")
SIZE = 81
SS = 4  # 超采样倍数
NORMAL = (166, 174, 188, 255)
ACTIVE = (91, 108, 255, 255)


def new_canvas():
    s = SIZE * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def finish(img):
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def stroke(d, pts, color, w):
    d.line(pts, fill=color, width=w, joint="curve")


def icon_input(color):
    """麦克风 + 声波"""
    img, d = new_canvas()
    u = SIZE * SS / 81.0
    w = int(4.2 * u)
    cx = 40.5 * u
    # 麦头（圆角竖条）
    d.rounded_rectangle([cx - 7.5 * u, 12 * u, cx + 7.5 * u, 44 * u], radius=7.5 * u, outline=color, width=w)
    # 支架弧线
    d.arc([cx - 17 * u, 34 * u, cx + 17 * u, 66 * u], start=0, end=180, fill=color, width=w)
    # 立柱 + 底座
    stroke(d, [(cx, 62 * u), (cx, 70 * u)], color, w)
    stroke(d, [(cx - 10 * u, 70 * u), (cx + 10 * u, 70 * u)], color, w)
    return finish(img)


def icon_choice(color):
    """一条主路分叉成三条"""
    img, d = new_canvas()
    u = SIZE * SS / 81.0
    w = int(4.2 * u)
    r = 4.6 * u
    ox, oy = 14 * u, 40.5 * u          # 起点
    mx, my = 34 * u, 40.5 * u          # 分叉点
    ends = [(64 * u, 15 * u), (64 * u, 40.5 * u), (64 * u, 66 * u)]
    stroke(d, [(ox, oy), (mx, my)], color, w)
    for ex, ey in ends:
        stroke(d, [(mx, my), (ex, ey)], color, w)
        d.ellipse([ex - r, ey - r, ex + r, ey + r], fill=color)
    d.ellipse([ox - r, oy - r, ox + r, oy + r], fill=color)
    d.ellipse([mx - r * 0.8, my - r * 0.8, mx + r * 0.8, my + r * 0.8], fill=color)
    return finish(img)


def icon_timeline(color):
    """时间线：竖轴 + 三个节点"""
    img, d = new_canvas()
    u = SIZE * SS / 81.0
    w = int(4.2 * u)
    cx = 22 * u
    stroke(d, [(cx, 12 * u), (cx, 70 * u)], color, w)
    r = 6.4 * u
    for i, y in enumerate((20, 40.5, 61)):
        cy = y * u
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 0), outline=color, width=w)
        if i == 1:
            d.ellipse([cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45], fill=color)
        bar = 30 * u if i != 2 else 22 * u
        d.rounded_rectangle([cx + 14 * u, cy - 3.4 * u, cx + 14 * u + bar, cy + 3.4 * u], radius=3.4 * u, fill=color)
    return finish(img)


def icon_goal(color):
    """目标：靶心"""
    img, d = new_canvas()
    u = SIZE * SS / 81.0
    w = int(4.2 * u)
    cx = cy = 40.5 * u
    for r, fill in ((26 * u, None), (16 * u, None), (7 * u, color)):
        box = [cx - r, cy - r, cx + r, cy + r]
        if fill:
            d.ellipse(box, fill=fill)
        else:
            d.ellipse(box, outline=color, width=w)
    return finish(img)


def main():
    os.makedirs(OUT, exist_ok=True)
    makers = {"input": icon_input, "goal": icon_goal, "choice": icon_choice, "timeline": icon_timeline}
    for name, fn in makers.items():
        fn(NORMAL).save(os.path.join(OUT, "%s.png" % name))
        fn(ACTIVE).save(os.path.join(OUT, "%s_on.png" % name))
    print("icons ->", OUT)


if __name__ == "__main__":
    main()
