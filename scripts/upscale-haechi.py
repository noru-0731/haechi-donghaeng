"""해치 포즈 4배 업스케일(2026-10-19, 사용자 요청: 첫 화면 해치 화질).

원본은 서울시 해치 캐릭터 사용규정 쪽의 2D 응용동작 JPG(포즈 하나가 가로 130px 안팎)다.
1. 띠 그림에서 포즈를 1배로 자른다(흰 바탕 그대로, 둘레 흰 여백 8px).
2. Real-ESRGAN 애니메이션용 모델(RealESRGAN_x4plus_anime_6B, 공개 가중치)로 4배 키운다. JPG 얼룩도 함께 걷힌다.
3. 4배 그림에서 흰 바탕을 지운다. 가장자리에서 이어진 흰 화소만 바탕으로 보고(배·눈의 흰색은 남김),
   바탕과 섞인 테두리 화소는 둘레의 가장 어두운 색과 흰색이 섞인 것으로 보고 투명도를 다시 계산한다(흰 얼룩 없음).
4. 화면 표시 크기에 맞춰 줄여 저장한다(가장 큰 포즈 높이 640px. 화면에는 320px 이하로 띄워 2배 해상도).

쓰는 법: python3 -I scripts/upscale-haechi.py <해치 원본 폴더> <모델 .pth> <저장 폴더>
모델 구조(RRDBNet)는 ESRGAN 논문 구조를 그대로 적었다. 가중치만 weights_only로 불러온다.
"""
import os
import sys

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from scipy import ndimage as ndi

POSES = {
    "hello": ("01", 127, 282),
    "listen": ("01", 428, 531),
    "wink": ("02", 301, 411),
    "worry": ("03", 0, 79),
    "point": ("03", 100, 228),
    "cheer": ("03", 387, 515),
    "idea": ("05", 0, 130),
    "search": ("05", 140, 280),
}
PAD = 8
UP = 4
TARGET_MAX_H = 640


# ───── RRDBNet(ESRGAN) ─────
class ResidualDenseBlock(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1)
        self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1)
        self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf, gc=32):
        super().__init__()
        self.rdb1 = ResidualDenseBlock(nf, gc)
        self.rdb2 = ResidualDenseBlock(nf, gc)
        self.rdb3 = ResidualDenseBlock(nf, gc)

    def forward(self, x):
        return self.rdb3(self.rdb2(self.rdb1(x))) * 0.2 + x


class RRDBNet(nn.Module):
    def __init__(self, nb=6, nf=64, gc=32):
        super().__init__()
        self.conv_first = nn.Conv2d(3, nf, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.conv_body = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_last = nn.Conv2d(nf, 3, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        feat = self.conv_first(x)
        feat = feat + self.conv_body(self.body(feat))
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode="nearest")))
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode="nearest")))
        return self.conv_last(self.lrelu(self.conv_hr(feat)))


def load_model(path):
    net = RRDBNet()
    sd = torch.load(path, map_location="cpu", weights_only=True)
    sd = sd.get("params_ema", sd.get("params", sd))
    net.load_state_dict(sd, strict=True)
    return net.eval()


def upscale(net, rgb: np.ndarray) -> np.ndarray:
    x = torch.from_numpy(rgb.astype(np.float32) / 255).permute(2, 0, 1)[None]
    with torch.no_grad():
        y = net(x).clamp(0, 1)[0].permute(1, 2, 0).numpy()
    return (y * 255).round().astype(np.uint8)


# ───── 흰 바탕 지우기(4배 그림에서) ─────
def matte(big: np.ndarray) -> Image.Image:
    crop = big.astype(float)
    H, W, _ = crop.shape
    mn, mx = crop.min(axis=2), crop.max(axis=2)
    whiteish = (mn >= 226) & (mx - mn < 24)
    lab, _ = ndi.label(whiteish)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    fg = ~bg
    # 이웃 포즈에서 들어온 조각 빼기: 가장 큰 덩어리와 그 둘레에 있는 덩어리만
    flab, n = ndi.label(fg)
    sizes = ndi.sum(fg, flab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    near = ndi.binary_dilation(flab == main, iterations=40 * UP)
    keep = np.zeros_like(fg)
    for k in range(1, n + 1):
        comp = flab == k
        if k == main or (sizes[k - 1] >= 12 * UP * UP and (comp & near).sum() == comp.sum()):
            keep |= comp
    fg = keep
    # 테두리 되돌리기: 바탕 쪽 2px, 그림 쪽 1px 띠
    lum = crop @ np.array([0.299, 0.587, 0.114])
    ring_out = ndi.binary_dilation(fg, iterations=2) & ~fg & (mn < 252)
    ring_in = fg & ndi.binary_dilation(~fg, iterations=1)
    band = ring_out | ring_in
    alpha = fg.astype(float)
    out = crop.copy()
    lum_fg = np.where(fg, lum, 999.0)
    R = 4
    ys, xs = np.nonzero(band)
    white = np.array([255.0, 255.0, 255.0])
    for y, x in zip(ys, xs):
        y0, y1, x0, x1 = max(0, y - R), min(H, y + R + 1), max(0, x - R), min(W, x + R + 1)
        win = lum_fg[y0:y1, x0:x1]
        if win.min() > 900:
            continue
        iy, ix = np.unravel_index(np.argmin(win), win.shape)
        Fc = crop[y0 + iy, x0 + ix]
        d = white - Fc
        denom = float(d @ d)
        if denom < 1e-6:
            continue
        a = float((white - crop[y, x]) @ d) / denom
        alpha[y, x] = min(1.0, max(0.0, a))
        out[y, x] = Fc
    rgba = np.dstack([out, alpha * 255]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    bbox = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    m = 2 * UP
    return img.crop((max(0, bbox[0] - m), max(0, bbox[1] - m), min(W, bbox[2] + m), min(H, bbox[3] + m)))


def main():
    src, model_path, dst = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(dst, exist_ok=True)
    torch.set_num_threads(max(1, os.cpu_count() or 1))
    net = load_model(model_path)
    strips = {}
    cut = {}
    for name, (no, x0, x1) in POSES.items():
        if no not in strips:
            strips[no] = np.asarray(Image.open(os.path.join(src, f"hechi_03_2D_{no}.jpg")).convert("RGB"))
        s = strips[no]
        crop = s[:, max(0, x0 - 3) : min(s.shape[1], x1 + 3)]
        crop = np.pad(crop, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=255)
        cut[name] = matte(upscale(net, crop))
    # 포즈끼리 크기 비율을 지키며 가장 큰 높이를 TARGET_MAX_H로
    scale = TARGET_MAX_H / max(im.height for im in cut.values())
    for name, im in cut.items():
        w, h = round(im.width * scale), round(im.height * scale)
        arr = np.asarray(im).astype(float) / 255
        pre = Image.fromarray((np.dstack([arr[..., :3] * arr[..., 3:4], arr[..., 3]]) * 255).astype(np.uint8), "RGBA")
        small = np.asarray(pre.resize((w, h), Image.LANCZOS)).astype(float) / 255
        a = small[..., 3:4]
        rgb = np.where(a > 1e-3, small[..., :3] / np.maximum(a, 1e-3), 0)
        res = Image.fromarray((np.dstack([rgb.clip(0, 1), a]) * 255).round().astype(np.uint8), "RGBA")
        res.save(os.path.join(dst, f"{name}.png"), optimize=True)
        print(name, res.size)


if __name__ == "__main__":
    main()
