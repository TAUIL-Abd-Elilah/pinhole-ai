# Third-party notices

Pinhole is MIT licensed. Its bundled AI model is derived without numerical
changes from `onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX`, revision
`9463a9c508a344c837ffefe9d724f3827bf2dc79`, which identifies its license as
MIT. TinyCLIP was published by Microsoft Research and collaborators at ICCV
2023. The exact source hash, output hashes, graph transformation, and parity
check are recorded by `tools/prepare_model.py` and the generated model manifest.

Runtime dependencies retain their respective licenses in `node_modules` and
their package registries. Pinhole does not redistribute user photographs: it
stores only local thumbnails and compact embeddings in the browser's own
IndexedDB database.
