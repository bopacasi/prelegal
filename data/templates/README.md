# Legal document templates

These are the base legal agreement templates that Prelegal fills in and modifies. They come from [Common Paper](https://github.com/CommonPaper)'s standard agreements.

## Contents

| Template | Folder | Category |
| --- | --- | --- |
| Mutual Non-Disclosure Agreement | `mutual-nda/` | confidentiality |
| Cloud Service Agreement | `cloud-service-agreement/` | commercial |
| Service Level Agreement | `service-level-agreement/` | commercial |
| Software License Agreement | `software-license-agreement/` | commercial |
| Pilot Agreement | `pilot-agreement/` | commercial |
| Professional Services Agreement | `professional-services-agreement/` | services |
| Data Processing Agreement | `data-processing-agreement/` | privacy |
| Business Associate Agreement | `business-associate-agreement/` | privacy |
| AI Addendum | `ai-addendum/` | addendum |
| Design Partner Agreement | `design-partner-agreement/` | partnership |
| Partnership Agreement | `partnership-agreement/` | partnership |

Each folder contains the agreement's `standard-terms.md`. The Mutual NDA also has a `cover-page.md`.

## manifest.json

`manifest.json` is the machine-readable catalog of the dataset. For each template it records:

- `slug`, `name`, `short_name`, `category`, `description` and `version`
- `files`: each file's role (`standard_terms` or `cover_page`), its path in this folder, and its file name in the source repo
- `fields`: the fillable terms the agreement refers to, such as `Governing Law` or `Subscription Period`
  - `source` says which part of the agreement supplies the value: `coverpage`, `keyterms`, `orderform`, `businessterms` or `sow`
  - `occurrences` counts how often the term appears
- `placeholders` (cover pages only): the bracketed text to fill in, e.g. `[Fill in state]`
- `source`: the GitHub repo and the exact commit the files were copied from
- `used_with` (optional): other templates this one is designed to be used with

## Template markup

The files are unchanged copies of Common Paper's Markdown. Fillable terms are marked with spans:

```html
<span class="coverpage_link">Customer</span>
<span class="orderform_link">Subscription Period</span>
```

The `<source>_link` class name matches a field's `source` in the manifest.

## Updating the dataset

Run the build script from the repo root. It needs `git` and Python 3.9+.

```console
python3 scripts/fetch_templates.py
```

The script clones each Common Paper repo, replaces the template folders here, and regenerates `manifest.json` with the new commit hashes. Review the diff before committing it.

## License and attribution

These templates are © Common Paper, Inc. and licensed under [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). The source repo and commit of each template are recorded in `manifest.json`. Any agreement Prelegal produces from these templates must keep the CC BY 4.0 attribution to Common Paper.

This license covers only the files in `data/templates/`. The rest of the Prelegal repo is under its own MIT license.
