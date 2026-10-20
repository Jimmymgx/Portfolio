#!/usr/bin/env python3
"""
Build hero media from the owner-supplied intro video and portrait image.

Outputs (written to ./apps/web/public):
  hero/hero.mp4          H.264 / yuv420p / CRF 24 / AAC / faststart
  hero/hero.webm         VP9 / Opus
  hero/hero-poster.webp  poster frame
  portrait-bust.webp     head-and-shoulders crop (from the supplied image)
  og.jpg                 1200x630 social card

Usage:
  python scripts/build-hero-assets.py --video scripts/source-media/<intro.mp4> --image scripts/source-media/<portrait.jpg>
Optional:
  --crop-x N          left edge of the crop in source pixels (default: auto-detected, centred on subject)
  --loop-fade 0.5     crossfade seconds for the seamless loop (0 disables)
  --max-seconds 10    use at most this many seconds of the video
  --no-levels         skip the gentle background levels correction

FFmpeg: uses `ffmpeg` on PATH, otherwise the binary bundled with `imageio-ffmpeg`
(pip install imageio-ffmpeg numpy pillow).
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "apps" / "web" / "public"
OUT_W, OUT_H = 768, 960  # 4:5 portrait


def ffmpeg_exe() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("FFmpeg not found. Install it or run: pip install imageio-ffmpeg")


FF = ffmpeg_exe()


def run(args: list[str]) -> None:
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def probe_size(video: Path) -> tuple[int, int]:
    p = subprocess.run([FF, "-hide_banner", "-i", str(video)], capture_output=True, text=True)
    import re

    m = re.search(r"Video:.*?(\d{3,5})x(\d{3,5})", p.stderr)
    if not m:
        sys.exit("Could not read video size")
    return int(m.group(1)), int(m.group(2))


def detect_subject_center(video: Path, w: int, h: int, workdir: Path) -> int:
    """Find the horizontal centre of the dark/non-background subject in a mid-clip frame."""
    frame = workdir / "detect.png"
    run(["-ss", "2", "-i", str(video), "-frames:v", "1", str(frame)])
    g = np.asarray(Image.open(frame).convert("L"), dtype=np.float32)
    mask = g < 190  # backdrop is near-white; clothes, hair, skin are darker
    cols = np.where(mask.sum(axis=0) > h * 0.02)[0]
    if cols.size == 0:
        return w // 2
    return int((cols.min() + cols.max()) / 2)


def build_video(args: argparse.Namespace, workdir: Path) -> None:
    video = Path(args.video)
    w, h = probe_size(video)
    crop_h = h
    crop_w = int(round(h * OUT_W / OUT_H))
    if crop_w > w:
        crop_w = w
        crop_h = int(round(w * OUT_H / OUT_W))
    if args.crop_x is not None:
        x = args.crop_x
    else:
        cx = detect_subject_center(video, w, h, workdir)
        x = cx - crop_w // 2
    x = max(0, min(w - crop_w, x))
    print(f"crop {crop_w}x{crop_h} at x={x}")

    base = f"crop={crop_w}:{crop_h}:{x}:0,scale={OUT_W}:{OUT_H}:flags=lanczos"
    if not args.no_levels:
        # gentle: lift the near-white backdrop to pure white so multiply-blend disappears into the page
        base += ",curves=all='0/0 0.9/1 1/1'"
    base += ",fps=24,format=yuv420p"

    dur = args.max_seconds
    fade = args.loop_fade
    (PUBLIC / "hero").mkdir(parents=True, exist_ok=True)
    looped = workdir / "looped.mkv"

    if fade > 0 and dur > fade * 4:
        body = dur - fade
        # body = [fade..dur] blended at its end into head = [0..fade] -> ends where the loop restarts
        fc = (
            f"[0:v]trim=start={fade}:end={dur},setpts=PTS-STARTPTS,{base}[vb];"
            f"[0:v]trim=start=0:end={fade},setpts=PTS-STARTPTS,{base}[vh];"
            f"[vb][vh]xfade=transition=fade:duration={fade}:offset={body - fade}[v];"
            # Audio: the clip's first and last moments are silent, so no audio crossfade is needed.
            # (An acrossfade here truncated the audio to under a second.) Short fades avoid clicks.
            f"[0:a]atrim=start={fade}:end={dur},asetpts=PTS-STARTPTS,"
            f"afade=t=in:d=0.01,afade=t=out:st={body - 0.01}:d=0.01[a]"
        )
        run(["-i", str(video), "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
             "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", str(looped)])
    else:
        fc = f"[0:v]trim=0:{dur},setpts=PTS-STARTPTS,{base}[v];[0:a]atrim=0:{dur},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={dur-0.05}:d=0.05[a]"
        run(["-i", str(video), "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
             "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", str(looped)])

    run(["-i", str(looped), "-c:v", "libx264", "-crf", "24", "-pix_fmt", "yuv420p",
         "-preset", "slow", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
         str(PUBLIC / "hero" / "hero.mp4")])
    run(["-i", str(looped), "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-crf", "34", "-b:v", "0", "-row-mt", "1",
         "-c:a", "libopus", "-b:a", "64k", str(PUBLIC / "hero" / "hero.webm")])

    poster_png = workdir / "poster.png"
    run(["-ss", "2.5", "-i", str(looped), "-frames:v", "1", str(poster_png)])
    Image.open(poster_png).convert("RGB").save(PUBLIC / "hero" / "hero-poster.webp", quality=82)


def build_images(args: argparse.Namespace) -> None:
    if not args.image:
        print("no --image given: skipping portrait-bust.webp and og.jpg")
        return
    img = Image.open(args.image).convert("RGB")
    W, H = img.size
    # bust crop (4:5) around the head; tune with --bust x,y,w if the source framing differs
    if args.bust:
        bx, by, bw = args.bust
    else:
        bw = int(H * 0.46)
        bx = int(W * 0.5 - bw / 2)
        by = int(H * 0.05)
    bh = int(bw * 1.25)
    bust = img.crop((bx, by, bx + bw, min(H, by + bh))).resize((768, 960), Image.LANCZOS)
    bust.save(PUBLIC / "portrait-bust.webp", quality=86)

    og = Image.new("RGB", (1200, 630), (244, 242, 238))
    pw = int(630 * 0.8)
    og.paste(bust.resize((pw, 630), Image.LANCZOS), (1200 - pw - 40, 0))
    d = ImageDraw.Draw(og)
    try:
        big = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 84)
        small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 38)
    except Exception:
        big = small = ImageFont.load_default()
    d.text((70, 210), "Mohamed", font=big, fill=(13, 13, 13))
    d.text((70, 305), "Gamal", font=big, fill=(13, 13, 13))
    d.text((72, 430), "Fullstack Developer", font=small, fill=(58, 58, 58))
    og.save(PUBLIC / "og.jpg", quality=88)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--video", required=True)
    ap.add_argument("--image")
    ap.add_argument("--crop-x", type=int)
    ap.add_argument("--loop-fade", type=float, default=0.5)
    ap.add_argument("--max-seconds", type=float, default=10.0)
    ap.add_argument("--no-levels", action="store_true")
    ap.add_argument("--bust", type=lambda s: tuple(int(v) for v in s.split(",")), help="x,y,width of the bust crop")
    args = ap.parse_args()
    with tempfile.TemporaryDirectory() as td:
        build_video(args, Path(td))
    build_images(args)
    print("done ->", PUBLIC)


if __name__ == "__main__":
    main()
