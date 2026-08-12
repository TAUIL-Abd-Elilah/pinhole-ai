"""Generate PWA raster icons from Pinhole's code-native aperture mark."""

from pathlib import Path
from math import cos, pi, sin

from PIL import Image, ImageDraw


def icon(size: int) -> Image.Image:
    image = Image.new("RGB", (size, size), "#dce7e8")
    draw = ImageDraw.Draw(image)
    center = size / 2
    radius = size * 0.31
    width = max(2, round(size * 0.018))
    draw.ellipse(
        (center - radius, center - radius, center + radius, center + radius),
        outline="#14282c",
        width=width,
    )
    for blade in range(6):
        angle = blade * pi / 3 - pi / 2
        inner = radius * 0.34
        draw.line(
            (
                center + cos(angle) * radius,
                center + sin(angle) * radius,
                center + cos(angle) * inner,
                center + sin(angle) * inner,
            ),
            fill="#14282c",
            width=max(2, round(width * 0.7)),
        )
    dot = radius * 0.27
    draw.ellipse(
        (center - dot, center - dot, center + dot, center + dot),
        fill="#ed6547",
    )
    return image


def main() -> None:
    output = Path("public")
    for size in (192, 512):
        icon(size).save(output / f"pwa-{size}x{size}.png", optimize=True)


if __name__ == "__main__":
    main()
