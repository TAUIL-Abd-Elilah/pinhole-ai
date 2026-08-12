"""Create exact-parity TinyCLIP text and vision models for Pinhole.

The upstream INT8 graph contains both encoders. A text-only search therefore
runs a dummy image through the much larger vision encoder. This script pins and
verifies the upstream artifact, extracts each independent graph, checks exact
output parity, and writes a machine-readable manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import urllib.request
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
from onnx.utils import extract_model


MODEL_REPO = "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX"
MODEL_REVISION = "9463a9c508a344c837ffefe9d724f3827bf2dc79"
SOURCE_SHA256 = "844d1a46ab18acf50c989e541b12fe3b6dc7f8d6004725b4e992d142788e0600"
MODEL_FILES = (
    "config.json",
    "merges.txt",
    "preprocessor_config.json",
    "special_tokens_map.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "vocab.json",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(relative_path: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    url = (
        f"https://huggingface.co/{MODEL_REPO}/resolve/"
        f"{MODEL_REVISION}/{relative_path}"
    )
    print(f"download {relative_path}")
    urllib.request.urlretrieve(url, destination)


def verify_parity(source: Path, text_model: Path, vision_model: Path) -> dict[str, float | bool]:
    rng = np.random.default_rng(42)
    input_ids = np.zeros((2, 77), dtype=np.int64)
    input_ids[:, 0] = 49406
    input_ids[:, -1] = 49407
    attention_mask = np.ones_like(input_ids)
    pixel_values = rng.normal(size=(2, 3, 224, 224)).astype(np.float32)

    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    providers = ["CPUExecutionProvider"]
    combined = ort.InferenceSession(str(source), options, providers=providers)
    text = ort.InferenceSession(str(text_model), options, providers=providers)
    vision = ort.InferenceSession(str(vision_model), options, providers=providers)

    combined_text, combined_vision = combined.run(
        ["text_embeds", "image_embeds"],
        {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "pixel_values": pixel_values,
        },
    )
    split_text = text.run(
        None,
        {"input_ids": input_ids, "attention_mask": attention_mask},
    )[0]
    split_vision = vision.run(None, {"pixel_values": pixel_values})[0]

    return {
        "text_exact": bool(np.array_equal(combined_text, split_text)),
        "vision_exact": bool(np.array_equal(combined_vision, split_vision)),
        "text_max_abs_error": float(np.max(np.abs(combined_text - split_text))),
        "vision_max_abs_error": float(np.max(np.abs(combined_vision - split_vision))),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("public/models/pinhole-tinyclip"))
    parser.add_argument("--cache", type=Path, default=Path(".cache/models"))
    args = parser.parse_args()

    source = args.cache / "tinyclip-int8.onnx"
    if not source.exists():
        download("onnx/model_int8.onnx", source)
    actual_source_hash = sha256(source)
    if actual_source_hash != SOURCE_SHA256:
        raise RuntimeError(
            f"source checksum mismatch: expected {SOURCE_SHA256}, got {actual_source_hash}"
        )

    onnx_dir = args.output / "onnx"
    onnx_dir.mkdir(parents=True, exist_ok=True)
    text_model = onnx_dir / "text_model_quantized.onnx"
    vision_model = onnx_dir / "vision_model_quantized.onnx"
    extract_model(
        str(source),
        str(text_model),
        ["input_ids", "attention_mask"],
        ["text_embeds"],
    )
    extract_model(
        str(source),
        str(vision_model),
        ["pixel_values"],
        ["image_embeds"],
    )
    onnx.checker.check_model(str(text_model))
    onnx.checker.check_model(str(vision_model))

    for filename in MODEL_FILES:
        cached_file = args.cache / filename
        if not cached_file.exists():
            download(filename, cached_file)
        shutil.copy2(cached_file, args.output / filename)

    parity = verify_parity(source, text_model, vision_model)
    if not parity["text_exact"] or not parity["vision_exact"]:
        raise RuntimeError(f"split graph parity failed: {parity}")

    manifest = {
        "source": {
            "repository": MODEL_REPO,
            "revision": MODEL_REVISION,
            "path": "onnx/model_int8.onnx",
            "sha256": actual_source_hash,
            "bytes": source.stat().st_size,
        },
        "artifacts": {
            "text": {
                "path": "onnx/text_model_quantized.onnx",
                "sha256": sha256(text_model),
                "bytes": text_model.stat().st_size,
            },
            "vision": {
                "path": "onnx/vision_model_quantized.onnx",
                "sha256": sha256(vision_model),
                "bytes": vision_model.stat().st_size,
            },
        },
        "parity": parity,
    }
    (args.output / "pinhole-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
