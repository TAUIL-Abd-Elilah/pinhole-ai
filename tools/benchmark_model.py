"""Reproducible native ONNX Runtime benchmark for Pinhole's graph surgery."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import statistics
import subprocess
import time
import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort


SOURCE_URL = (
    "https://huggingface.co/onnx-community/"
    "TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX/resolve/"
    "9463a9c508a344c837ffefe9d724f3827bf2dc79/onnx/model_int8.onnx"
)
SOURCE_SHA256 = "844d1a46ab18acf50c989e541b12fe3b6dc7f8d6004725b4e992d142788e0600"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_source(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        request = urllib.request.Request(
            SOURCE_URL,
            headers={"User-Agent": "PinholeChallenge/1.0"},
        )
        with urllib.request.urlopen(request, timeout=120) as response, path.open("wb") as stream:
            while chunk := response.read(1024 * 1024):
                stream.write(chunk)
    actual = sha256(path)
    if actual != SOURCE_SHA256:
        raise RuntimeError(f"source checksum mismatch: {actual}")


def percentile(values: list[float], value: float) -> float:
    return float(np.percentile(np.asarray(values), value))


def benchmark(
    session: ort.InferenceSession,
    feeds: dict[str, np.ndarray],
    output_names: list[str] | None,
    samples: int,
    warmup: int,
) -> dict[str, float | int]:
    for _ in range(warmup):
        session.run(output_names, feeds)
    timings = []
    for _ in range(samples):
        started = time.perf_counter_ns()
        session.run(output_names, feeds)
        timings.append((time.perf_counter_ns() - started) / 1_000_000)
    median = statistics.median(timings)
    return {
        "samples": samples,
        "median_ms": median,
        "p95_ms": percentile(timings, 95),
        "min_ms": min(timings),
        "max_ms": max(timings),
        "mad_ms": statistics.median(abs(value - median) for value in timings),
    }


def load_session(path: Path, threads: int) -> tuple[ort.InferenceSession, float]:
    options = ort.SessionOptions()
    options.intra_op_num_threads = threads
    options.inter_op_num_threads = 1
    options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    started = time.perf_counter_ns()
    session = ort.InferenceSession(
        str(path),
        sess_options=options,
        providers=["CPUExecutionProvider"],
    )
    elapsed_ms = (time.perf_counter_ns() - started) / 1_000_000
    return session, elapsed_ms


def hardware() -> dict[str, object]:
    lscpu = None
    if os.name != "nt":
        try:
            lscpu = subprocess.run(
                ["lscpu"],
                check=True,
                capture_output=True,
                text=True,
            ).stdout
        except (OSError, subprocess.CalledProcessError):
            pass
    return {
        "platform": platform.platform(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "logical_cpus": os.cpu_count(),
        "python": platform.python_version(),
        "onnxruntime": ort.__version__,
        "onnxruntime_device": ort.get_device(),
        "lscpu": lscpu,
        "github": {
            key: os.environ.get(key)
            for key in (
                "GITHUB_ACTIONS",
                "GITHUB_RUN_ID",
                "GITHUB_RUN_ATTEMPT",
                "RUNNER_ARCH",
                "RUNNER_OS",
                "ImageOS",
                "ImageVersion",
            )
            if os.environ.get(key)
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=50)
    parser.add_argument("--warmup", type=int, default=7)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--cache", type=Path, default=Path(".cache/models"))
    parser.add_argument("--threads", type=int, nargs="*", default=None)
    args = parser.parse_args()

    source = args.cache / "tinyclip-int8.onnx"
    text_path = Path("public/models/pinhole-tinyclip/onnx/text_model_quantized.onnx")
    vision_path = Path("public/models/pinhole-tinyclip/onnx/vision_model_quantized.onnx")
    ensure_source(source)

    input_ids = np.full((1, 77), 49407, dtype=np.int64)
    input_ids[0, 0] = 49406
    input_ids[0, 1:10] = np.asarray([320, 1125, 539, 320, 1929, 267, 494, 518, 2582])
    attention_mask = np.zeros_like(input_ids)
    attention_mask[0, :11] = 1
    pixel_values = np.zeros((1, 3, 224, 224), dtype=np.float32)
    combined_feeds = {
        "input_ids": input_ids,
        "attention_mask": attention_mask,
        "pixel_values": pixel_values,
    }
    text_feeds = {"input_ids": input_ids, "attention_mask": attention_mask}
    vision_feeds = {"pixel_values": pixel_values}

    cpu_count = os.cpu_count() or 1
    thread_counts = args.threads or sorted({1, min(2, cpu_count), min(4, cpu_count)})
    runs: dict[str, object] = {}
    for threads in thread_counts:
        combined, combined_load = load_session(source, threads)
        text, text_load = load_session(text_path, threads)
        vision, vision_load = load_session(vision_path, threads)

        combined_text = combined.run(["text_embeds"], combined_feeds)[0]
        split_text = text.run(None, text_feeds)[0]
        combined_vision = combined.run(["image_embeds"], combined_feeds)[0]
        split_vision = vision.run(None, vision_feeds)[0]

        runs[str(threads)] = {
            "session_load_ms": {
                "combined": combined_load,
                "text": text_load,
                "vision": vision_load,
            },
            # This is the stock CLIPModel forward used by Transformers.js: both
            # branches plus all four outputs are evaluated for a text query.
            "stock_combined_forward": benchmark(
                combined, combined_feeds, None, args.samples, args.warmup
            ),
            # This is the strongest possible use of the unsplit graph when the
            # caller manually requests only text_embeds from raw ORT.
            "combined_requested_text_only": benchmark(
                combined, combined_feeds, ["text_embeds"], args.samples, args.warmup
            ),
            "split_text_forward": benchmark(
                text, text_feeds, None, args.samples, args.warmup
            ),
            "split_vision_forward": benchmark(
                vision, vision_feeds, None, args.samples, args.warmup
            ),
            "parity": {
                "text_exact": bool(np.array_equal(combined_text, split_text)),
                "vision_exact": bool(np.array_equal(combined_vision, split_vision)),
                "text_max_abs_error": float(np.max(np.abs(combined_text - split_text))),
                "vision_max_abs_error": float(np.max(np.abs(combined_vision - split_vision))),
            },
        }

    result = {
        "schema": "pinhole-model-benchmark/v1",
        "created_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "hardware": hardware(),
        "method": {
            "warmup": args.warmup,
            "samples": args.samples,
            "execution_provider": "CPUExecutionProvider",
            "execution_mode": "ORT_SEQUENTIAL",
            "inter_op_threads": 1,
            "input": "one 77-token sequence and one zero-valued 224x224 RGB control image",
        },
        "artifacts": {
            "combined": {"bytes": source.stat().st_size, "sha256": sha256(source)},
            "text": {"bytes": text_path.stat().st_size, "sha256": sha256(text_path)},
            "vision": {"bytes": vision_path.stat().st_size, "sha256": sha256(vision_path)},
        },
        "runs_by_intra_op_threads": runs,
    }
    rendered = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
