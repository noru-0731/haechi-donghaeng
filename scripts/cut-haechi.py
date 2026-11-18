"""해치 포즈 자르기(계획서 4단계 대체안).

AI.zip은 2009년판 노란 해치라 지금 해치(해치&소울프렌즈)와 디자인이 달라 쓰지 않는다.
원본: 서울시 해치 캐릭터 사용규정 쪽(www.seoul.go.kr/seoul/symbol_ca.do)의 2D 응용동작 JPG.

하는 일
1. 띠 그림에서 포즈 하나를 잘라 흰 바탕을 지운다(가장자리에서 이어진 흰 화소만 바탕으로 본다. 배·눈·이빨의 흰색은 남는다).
2. 바탕과 섞인 테두리 화소는 둘레의 가장 어두운 색(대개 갈색 윤곽선)과 흰색이 섞인 것으로 보고
   투명도를 다시 계산하고 색을 되돌린다. 그래서 어두운 바탕에서도 흰 테두리 얼룩이 생기지 않는다.
3. 2배로 키워 저장한다. 화면에는 원본 크기 이하로 보여 준다(그래서 그림은 표시 크기의 두 배 해상도).

쓰는 법: python3 -I scripts/cut-haechi.py <해치 원본 폴더> <저장 폴더>
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

# 포즈 이름: (띠 번호, 가로 범위) — 범위는 띠 그림의 화소 좌표
POSES = {
    "hello": ("01", 127, 282),  # 인사: 팔을 흔들며 입을 벌림
    "listen": ("01", 428, 531),  # 듣기: 바르게 서서 봄
    "wink": ("02", 301, 411),  # 윙크: 의사를 물을 때
    "worry": ("03", 0, 79),  # 걱정: 놀란 입, 손을 모음
    "point": ("03", 100, 228),  # 가리키기: 왼팔을 뻗음
    "cheer": ("03", 387, 515),  # 기쁨: 두 팔을 듦
    "idea": ("05", 0, 130),  # 아이디어: 전구
    "search": ("05", 140, 280),  # 찾기: 돋보기
}
PAD = 8
SCALE = 2


def cut(strip: np.ndarray, x0: int, x1: int) -> Image.Image:
    h, w, _ = strip.shape
    crop = strip[:, max(0, x0 - 3) : min(w, x1 + 3)].astype(float)
    crop = np.pad(crop, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
    H, W, _ = crop.shape
    mn, mx = crop.min(axis=2), crop.max(axis=2)

    # 1. 바탕: 가장자리에서 이어진 거의 흰 화소
    whiteish = (mn >= 228) & (mx - mn < 22)
    lab, _ = ndi.label(whiteish)
    edge_labels = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge_labels[edge_labels > 0])
    fg = ~bg

    # 이웃 포즈에서 들어온 조각 빼기: 가장 큰 덩어리와 그 둘레(40px 안)에 있는 덩어리만 남긴다
    flab, n = ndi.label(fg)
    sizes = ndi.sum(fg, flab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    near = ndi.binary_dilation(flab == main, iterations=40)
    keep = np.zeros_like(fg)
    for k in range(1, n + 1):
        comp = flab == k
        if k == main or (sizes[k - 1] >= 12 and (comp & near).sum() == comp.sum()):
            keep |= comp
    fg = keep

    # 2. 테두리 되돌리기
    lum = crop @ np.array([0.299, 0.587, 0.114])
    ring_out = ndi.binary_dilation(fg, iterations=1) & ~fg & (mn < 252)  # 바탕 쪽 섞인 화소
    ring_in = fg & ndi.binary_dilation(~fg, iterations=1)  # 그림 쪽 맨 바깥 화소
    band = ring_out | ring_in
    alpha = fg.astype(float)
    out = crop.copy()
    # 둘레 5×5에서 가장 어두운 그림 화소의 색을 참 색(F)으로 본다
    lum_fg = np.where(fg, lum, 999.0)
    darkest = ndi.minimum_filter(lum_fg, size=5)
    ys, xs = np.nonzero(band)
    white = np.array([255.0, 255.0, 255.0])
    for y, x in zip(ys, xs):
        y0, y1, xa, xb = max(0, y - 2), min(H, y + 3), max(0, x - 2), min(W, x + 3)
        win = lum_fg[y0:y1, xa:xb]
        iy, ix = np.unravel_index(np.argmin(win), win.shape)
        F = crop[y0 + iy, xa + ix]
        d = white - F
        denom = float(d @ d)
        if denom < 1e-6 or darkest[y, x] > 900:
            continue
        a = float((white - crop[y, x]) @ d) / denom
        a = min(1.0, max(0.0, a))
        alpha[y, x] = a
        out[y, x] = F

    rgba = np.dstack([out, alpha * 255]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    bbox = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    img = img.crop((max(0, bbox[0] - 2), max(0, bbox[1] - 2), min(W, bbox[2] + 2), min(H, bbox[3] + 2)))

    # 3. 2배로 키우기(곱한 알파로 키워 가장자리 색이 번지지 않게)
    arr = np.asarray(img).astype(float) / 255
    pre = Image.fromarray((np.dstack([arr[..., :3] * arr[..., 3:4], arr[..., 3]]) * 255).astype(np.uint8), "RGBA")
    big = np.asarray(pre.resize((img.width * SCALE, img.height * SCALE), Image.LANCZOS)).astype(float) / 255
    a = big[..., 3]
    a2 = np.clip((a - 0.12) / 0.76, 0, 1)
    a2 = a2 * a2 * (3 - 2 * a2)  # 가장자리를 조금 또렷하게
    rgb = np.where(a[..., None] > 1e-3, big[..., :3] / np.maximum(a[..., None], 1e-3), 0)
    res = np.dstack([rgb.clip(0, 1), a2]) * 255
    return Image.fromarray(res.round().astype(np.uint8), "RGBA")


def main():
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    strips = {}
    for name, (no, x0, x1) in POSES.items():
        if no not in strips:
            strips[no] = np.asarray(Image.open(os.path.join(src, f"hechi_03_2D_{no}.jpg")).convert("RGB"))
        img = cut(strips[no], x0, x1)
        img.save(os.path.join(dst, f"{name}.png"), optimize=True)
        print(name, img.size)


if __name__ == "__main__":
    main()
