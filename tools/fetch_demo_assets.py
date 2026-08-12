"""Fetch and normalize the pinned Wikimedia Commons demo roll.

Every source URL, author, and license is explicit so the public demo remains
rebuildable and attributable. The software is MIT; individual demo photographs
remain under the licenses listed in public/demo/ATTRIBUTION.md.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps


ASSETS = (
    {
        "file": "red-firefighter-bicycle.webp",
        "name": "red firefighter bicycle.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Red_Firefighter_Bicycle_in_Prague_C.jpg/960px-Red_Firefighter_Bicycle_in_Prague_C.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Red_Firefighter_Bicycle_in_Prague_C.jpg",
        "author": "Mojmir Churavy",
        "license": "CC0 1.0",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
    },
    {
        "file": "golden-dog-in-snow.webp",
        "name": "golden dog in snow.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/7/7d/Golden_Retriever_sitting_in_snow_%28Barras%29.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Golden_Retriever_sitting_in_snow_(Barras).jpg",
        "author": "Barras",
        "license": "CC BY 3.0",
        "license_url": "https://creativecommons.org/licenses/by/3.0/",
    },
    {
        "file": "birthday-cake-candles.webp",
        "name": "birthday cake with candles.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Italy_-_birthday_cake_with_candles_1.jpg/960px-Italy_-_birthday_cake_with_candles_1.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Italy_-_birthday_cake_with_candles_1.jpg",
        "author": "Francesca Cesa Bianchi",
        "license": "CC BY-SA 3.0 IT",
        "license_url": "https://creativecommons.org/licenses/by-sa/3.0/it/deed.en",
    },
    {
        "file": "mountains-at-sunset.webp",
        "name": "mountains and rice field at sunset.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Square_plot_of_a_green_paddy_field%2C_hut_and_karst_mountains_under_colorful_clouds_at_sunset%2C_Vang_Vieng%2C_Laos.jpg/960px-Square_plot_of_a_green_paddy_field%2C_hut_and_karst_mountains_under_colorful_clouds_at_sunset%2C_Vang_Vieng%2C_Laos.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Square_plot_of_a_green_paddy_field,_hut_and_karst_mountains_under_colorful_clouds_at_sunset,_Vang_Vieng,_Laos.jpg",
        "author": "Basile Morin",
        "license": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    {
        "file": "blue-vintage-car.webp",
        "name": "blue vintage car by a cafe.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/White_and_blue_vintage_car_near_the_Serdobol_cafe_in_Sortavala_2025.jpg/960px-White_and_blue_vintage_car_near_the_Serdobol_cafe_in_Sortavala_2025.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:White_and_blue_vintage_car_near_the_Serdobol_cafe_in_Sortavala_2025.jpg",
        "author": "AKA MBG",
        "license": "CC0 1.0",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
    },
    {
        "file": "yellow-flower.webp",
        "name": "yellow flower in sunlight.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Yellow_Portulaca_flower_in_sunshine%2C_on_black_background.jpg/960px-Yellow_Portulaca_flower_in_sunshine%2C_on_black_background.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Yellow_Portulaca_flower_in_sunshine,_on_black_background.jpg",
        "author": "Basile Morin",
        "license": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    {
        "file": "cat-on-sofa.webp",
        "name": "cat resting on a sofa.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Cat_in_sofa_at_Cat_Cafe_Nyankoto.jpg/960px-Cat_in_sofa_at_Cat_Cafe_Nyankoto.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Cat_in_sofa_at_Cat_Cafe_Nyankoto.jpg",
        "author": "Emma0mb",
        "license": "CC BY 4.0",
        "license_url": "https://creativecommons.org/licenses/by/4.0/",
    },
    {
        "file": "sailboat-at-sea.webp",
        "name": "white sailboat at sea.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Hunter_260_sailboat_Sea_Esta_3784.jpg/960px-Hunter_260_sailboat_Sea_Esta_3784.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Hunter_260_sailboat_Sea_Esta_3784.jpg",
        "author": "Ahunt",
        "license": "CC0 1.0",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
    },
    {
        "file": "hiker-in-forest.webp",
        "name": "hiker walking through a forest.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Forest-trees-hiker-hiking_%2823700043303%29.jpg/960px-Forest-trees-hiker-hiking_%2823700043303%29.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Forest-trees-hiker-hiking_(23700043303).jpg",
        "author": "Pixel.la Free Stock Photos",
        "license": "CC0 1.0",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
    },
    {
        "file": "homemade-pizza.webp",
        "name": "homemade vegetable pizza.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Colorful_homemade_pizza_with_fresh_vegetables_and_toppings_on_a_wooden_table.jpg/960px-Colorful_homemade_pizza_with_fresh_vegetables_and_toppings_on_a_wooden_table.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Colorful_homemade_pizza_with_fresh_vegetables_and_toppings_on_a_wooden_table.jpg",
        "author": "Shixart1985",
        "license": "CC BY 2.0",
        "license_url": "https://creativecommons.org/licenses/by/2.0/",
    },
    {
        "file": "coffee-and-book.webp",
        "name": "coffee on an open book.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Top_view_of_the_cup_of_coffee_with_cinnamon_on_an_open_book_and_a_donut_next_to_it.jpg/960px-Top_view_of_the_cup_of_coffee_with_cinnamon_on_an_open_book_and_a_donut_next_to_it.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Top_view_of_the_cup_of_coffee_with_cinnamon_on_an_open_book_and_a_donut_next_to_it.jpg",
        "author": "Shixart1985",
        "license": "CC BY 2.0",
        "license_url": "https://creativecommons.org/licenses/by/2.0/",
    },
    {
        "file": "airplane-wing-at-dusk.webp",
        "name": "airplane wing under a blue sky.webp",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Clouds_disappearing_into_a_darkening_blue_sky_over_an_airplane_wing.jpg/960px-Clouds_disappearing_into_a_darkening_blue_sky_over_an_airplane_wing.jpg",
        "source": "https://commons.wikimedia.org/wiki/File:Clouds_disappearing_into_a_darkening_blue_sky_over_an_airplane_wing.jpg",
        "author": "Shocksingularity",
        "license": "CC0 1.0",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
    },
)


def fetch(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "PinholeChallenge/1.0 (github.com/TAUIL-Abd-Elilah)"},
    )
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 5:
                raise
            time.sleep(2**attempt)
    raise RuntimeError("unreachable")


def main() -> None:
    output = Path("public/demo")
    output.mkdir(parents=True, exist_ok=True)
    manifest = []
    for asset in ASSETS:
        destination = output / asset["file"]
        if destination.exists():
            print(f"reuse {asset['file']}")
        else:
            print(f"fetch {asset['file']}")
            image = Image.open(BytesIO(fetch(asset["url"])))
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.thumbnail((960, 960), Image.Resampling.LANCZOS)
            image.save(destination, "WEBP", quality=82, method=6)
            time.sleep(0.75)
        manifest.append(
            {
                "file": asset["file"],
                "name": asset["name"],
                "type": "image/webp",
            }
        )

    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    lines = [
        "# Demo photo attribution",
        "",
        "These photographs are bundled only as Pinhole's public demonstration roll.",
        "The Pinhole software is MIT licensed; each photograph remains under the",
        "license shown below. Every image was resized and converted to WebP.",
        "",
    ]
    for asset in ASSETS:
        lines.extend(
            [
                f"- **{asset['file']}** — [{asset['author']}]({asset['source']}), "
                f"[{asset['license']}]({asset['license_url']}).",
            ]
        )
    (output / "ATTRIBUTION.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
