#!/usr/bin/env python3
"""Crop scanned page images down to their content bounding box.

The script analyses each PNG file in the current directory, detects the
bounding box that contains foreground content, expands it by a configurable
margin, and writes the cropped result into a "cropped" subdirectory.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
import math

import cv2
import numpy as np


def pad_to_original_ratio(image: np.ndarray, orig_w: int, orig_h: int) -> np.ndarray:
    """Pad image with white pixels so width:height matches the source ratio."""

    if orig_w <= 0 or orig_h <= 0:
        return image

    crop_h, crop_w = image.shape[:2]
    if crop_h == 0 or crop_w == 0:
        return image

    target_ratio = orig_w / orig_h
    if target_ratio <= 0:
        return image

    current_ratio = crop_w / crop_h
    eps = 1e-6

    pad_top = 0
    pad_bottom = 0
    pad_left = 0
    pad_right = 0

    if current_ratio > target_ratio + eps:
        # Content is comparatively too wide; extend height below to match ratio.
        target_h = math.ceil(crop_w / target_ratio)
        pad_bottom = max(0, target_h - crop_h)
    elif current_ratio < target_ratio - eps:
        # Content is comparatively too tall; extend width evenly on both sides.
        target_w = math.ceil(crop_h * target_ratio)
        total_pad_w = max(0, target_w - crop_w)
        pad_left = total_pad_w // 2
        pad_right = total_pad_w - pad_left

    if pad_bottom == 0 and pad_left == 0 and pad_right == 0:
        return image

    fill = 255 if image.ndim == 2 else (255, 255, 255)
    return cv2.copyMakeBorder(
        image,
        pad_top,
        pad_bottom,
        pad_left,
        pad_right,
        cv2.BORDER_CONSTANT,
        value=fill,
    )


def detect_content_bounds(
    gray: np.ndarray, threshold_shift: int, min_area: int
) -> tuple[int, int, int, int] | None:
    """Return (x_min, y_min, x_max, y_max) for the foreground pixels.

    A small Gaussian blur smooths noise, then an adjusted Otsu threshold keeps
    only sufficiently dark pixels. Returns None when no foreground is detected.
    """

    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    otsu_thresh, _ = cv2.threshold(
        blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    adjusted = np.clip(int(otsu_thresh) + threshold_shift, 0, 255)
    _, binary_inv = cv2.threshold(
        blurred, adjusted, 255, cv2.THRESH_BINARY_INV
    )

    # Remove tiny noise speckles; keeps the implementation compact while
    # preventing stray dots from affecting the bounding box materially.
    binary_inv = cv2.morphologyEx(
        binary_inv, cv2.MORPH_OPEN, np.ones((3, 3), dtype=np.uint8), iterations=1
    )

    # Drop connected components that are still too small (dust, specks, bleed).
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary_inv)
    if num_labels <= 1:
        return None

    areas = stats[1:, cv2.CC_STAT_AREA]
    if min_area > 0:
        area_threshold = min_area
    else:
        percentile = (
            int(np.percentile(np.asarray(areas, dtype=np.float32), 5))
            if areas.size
            else 0
        )
        area_threshold = max(50, percentile)

    for label_idx in range(1, num_labels):
        if stats[label_idx, cv2.CC_STAT_AREA] < area_threshold:
            binary_inv[labels == label_idx] = 0

    if not np.any(binary_inv):
        return None

    coords = np.column_stack(np.where(binary_inv > 0))
    if coords.size == 0:
        return None

    y_min, x_min = coords.min(axis=0)
    y_max, x_max = coords.max(axis=0)
    return int(x_min), int(y_min), int(x_max), int(y_max)


def crop_image(
    path: Path, destination: Path, margin: int, threshold_shift: int, min_area: int
) -> bool:
    image = cv2.imread(str(path))
    if image is None:
        print(f"Skipping {path.name}: failed to read image", file=sys.stderr)
        return False

    orig_h, orig_w = image.shape[:2]
    bounds = detect_content_bounds(
        cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), threshold_shift, min_area
    )
    if bounds is None:
        print(f"Skipping {path.name}: no foreground content detected", file=sys.stderr)
        return False

    x_min, y_min, x_max, y_max = bounds
    # Expand bounds by the requested margin and keep them within the image frame.
    x0 = max(x_min - margin, 0)
    y0 = max(y_min - margin, 0)
    x1 = min(x_max + margin, image.shape[1] - 1)
    y1 = min(y_max + margin, image.shape[0] - 1)

    cropped = image[y0 : y1 + 1, x0 : x1 + 1]
    cropped = pad_to_original_ratio(cropped, orig_w, orig_h)
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(destination), cropped):
        print(f"Failed to write {destination}", file=sys.stderr)
        return False
    return True


def iter_source_images(source_dir: Path, recursive: bool) -> list[Path]:
    pattern = "**/*.png" if recursive else "*.png"
    return sorted(source_dir.glob(pattern))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "source",
        nargs="?",
        default=Path.cwd(),
        type=Path,
        help="Directory that contains the scans (default: current directory)",
    )
    parser.add_argument(
        "--margin",
        type=int,
        default=50,
        help="Extra pixels to retain around the detected content (default: 50)",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Process PNGs in subdirectories as well",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output directory (default: <source>/cropped)",
    )
    parser.add_argument(
        "--threshold-shift",
        type=int,
        default=-75,
        help=(
            "Value added to Otsu threshold before detecting foreground. Negative"
            " values tighten detection to ignore faint background noise"
        ),
    )
    parser.add_argument(
        "--min-area",
        type=int,
        default=4,
        help=(
            "Minimum connected-component area (in pixels) to treat as content."
            " Defaults to an automatic heuristic when set to 0"
        ),
    )
    args = parser.parse_args()

    source_dir = args.source.resolve()
    output_dir = (args.output or (source_dir / "cropped")).resolve()

    if not source_dir.exists() or not source_dir.is_dir():
        print(f"Source directory does not exist: {source_dir}", file=sys.stderr)
        return 1

    images = iter_source_images(source_dir, recursive=args.recursive)
    if not images:
        print("No PNG files found", file=sys.stderr)
        return 1

    processed = 0
    for img_path in images:
        relative = img_path.relative_to(source_dir)
        destination = output_dir / relative
        if crop_image(
            img_path,
            destination,
            args.margin,
            args.threshold_shift,
            args.min_area,
        ):
            processed += 1

    print(f"Cropped {processed} of {len(images)} image(s) to {output_dir}")
    return 0 if processed else 1


if __name__ == "__main__":
    raise SystemExit(main())
