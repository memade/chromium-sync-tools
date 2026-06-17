# LLM Fingerprint Training v1

## Purpose

`tmp.json.training` is a compact, privacy-conscious training and evaluation view derived from `profile` and `chromium`. `tmp.json.trainingDataset` is the safe, direct ingestion node for training pipelines.

It is not a runtime configuration. Its primary task is teaching models to generate the runtime `.chromium` semantic fingerprint config from the collected browser `profile`. Secondary samples help models review browser-fingerprint consistency, identify capture-environment pollution, and map fingerprint surfaces to implementation tasks.

## Shape

```json
{
  "schema": "martell.llm-fingerprint-training.v1",
  "source": {},
  "privacy": {},
  "samples": [],
  "facts": {}
}
```

```json
{
  "schema": "martell.llm-fingerprint-training-dataset.v1",
  "source": {},
  "privacy": {},
  "records": [],
  "facts": {}
}
```

## Privacy Rules

- Do not include raw `payload`.
- Do not include raw `values`.
- Do not include WebRTC candidate strings or network identifiers.
- Do not include full font metric tables.
- Do not include full Intl supportedValues lists.
- Prefer counts, hashes, high-level field names, and normalized/observed pairs.

## Sample Types

`generate-chromium-config-from-profile` gives the model a sanitized collected `profile` as input and a privacy-safe runtime `.chromium` config as output. This is the main supervised sample for learning the `profile -> .chromium` mapping.

`review-fingerprint-consistency` gives the model a focused browser summary plus labels such as:

- capture-environment window geometry normalization
- remote/displayless pointer media-query normalization
- WebGL extension count source disagreement
- mixed Chinese Windows font profile

`plan-browser-fingerprint-implementation` gives the model section summaries and implementation labels from the Chromium contract.

## Relationship To Other Nodes

`profile` keeps raw observations.
`chromium` is the semantic contract plus implementation notes.
`training` is the distilled learning/evaluation view.
`trainingDataset` is the safe direct-training export; use this node instead of the whole `tmp.json`.
