#!/usr/bin/env python3
"""Crop NIE face assets to the runtime portrait window (360x360).

Matches game.js framing:
  source 500x500 → crop at (70, 40) size 360x360
  (horizontal center, top bias so bottom keeps more clothing)
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
NIE_DIRS = [ROOT / 'NIE' / 'boy', ROOT / 'NIE' / 'girl']

SOURCE = 500
CROP_W = 360
CROP_H = 360
CROP_SX = (SOURCE - CROP_W) // 2  # 70
CROP_SY = 40


def crop_box(width: int, height: int) -> tuple[int, int, int, int]:
  if width == SOURCE and height == SOURCE:
    left, top = CROP_SX, CROP_SY
  else:
    # Scale the same framing onto non-500 assets.
    scale_x = width / SOURCE
    scale_y = height / SOURCE
    left = int(round(CROP_SX * scale_x))
    top = int(round(CROP_SY * scale_y))
  right = min(width, left + int(round(CROP_W * (width / SOURCE if width != SOURCE else 1))))
  bottom = min(height, top + int(round(CROP_H * (height / SOURCE if height != SOURCE else 1))))
  if width == SOURCE and height == SOURCE:
    right = left + CROP_W
    bottom = top + CROP_H
  # Clamp and force exact output size when possible.
  if right - left < CROP_W and width >= CROP_W:
    left = max(0, min(width - CROP_W, left))
    right = left + CROP_W
  if bottom - top < CROP_H and height >= CROP_H:
    top = max(0, min(height - CROP_H, top))
    bottom = top + CROP_H
  return left, top, right, bottom


def process_file(path: Path) -> str:
  with Image.open(path) as img:
    img = img.convert('RGBA')
    w, h = img.size
    if w == CROP_W and h == CROP_H:
      return 'skip'
    if w < CROP_W or h < CROP_H:
      return f'small:{w}x{h}'
    box = crop_box(w, h)
    cropped = img.crop(box)
    if cropped.size != (CROP_W, CROP_H):
      cropped = cropped.resize((CROP_W, CROP_H), Image.Resampling.LANCZOS)
    cropped.save(path, format='PNG', optimize=True)
    return f'{w}x{h}->{CROP_W}x{CROP_H}'


def main() -> int:
  changed = 0
  skipped = 0
  errors = []
  for folder in NIE_DIRS:
    if not folder.is_dir():
      errors.append(f'missing {folder}')
      continue
    for path in sorted(folder.glob('*.png')):
      try:
        result = process_file(path)
      except Exception as exc:  # noqa: BLE001
        errors.append(f'{path.name}: {exc}')
        continue
      if result == 'skip':
        skipped += 1
        print(f'  skip  {path.relative_to(ROOT)}')
      elif result.startswith('small:'):
        errors.append(f'{path.name} too small ({result[6:]})')
      else:
        changed += 1
        print(f'  crop  {path.relative_to(ROOT)}  ({result})')
  print(f'\nDone: {changed} cropped, {skipped} already {CROP_W}x{CROP_H}')
  if errors:
    print('Errors:')
    for item in errors:
      print(' ', item)
    return 1
  return 0


if __name__ == '__main__':
  sys.exit(main())
