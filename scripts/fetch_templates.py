#!/usr/bin/env python3
"""Build the legal document template dataset from Common Paper's GitHub repos.

Clones each Common Paper agreement repo, copies its Markdown template files into
``data/templates/<slug>/``, and writes ``data/templates/manifest.json``. The
manifest records the source, version and license of each template, and the
fillable fields that the templates reference.

Common Paper templates are licensed under CC BY 4.0, so the files are copied
unchanged and attributed in the manifest and in data/templates/README.md.

Usage:
    python3 scripts/fetch_templates.py

Requires ``git`` on PATH. Uses only the Python standard library.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "data" / "templates"
GITHUB_ORG = "CommonPaper"
LICENSE = {
    "name": "CC BY 4.0",
    "url": "https://creativecommons.org/licenses/by/4.0/",
    "attribution": "Common Paper, Inc. (https://commonpaper.com)",
}

# Curated metadata for each template. ``files`` maps each source file in the
# repo to its role in the agreement.
TEMPLATES = [
    {
        "slug": "mutual-nda",
        "name": "Mutual Non-Disclosure Agreement",
        "short_name": "Mutual NDA",
        "repo": "Mutual-NDA",
        "category": "confidentiality",
        "description": "Lets two parties share confidential information with each other, for an agreed purpose, while each protects the other's information.",
        "files": {
            "Mutual-NDA-coverpage.md": "cover_page",
            "Mutual-NDA.md": "standard_terms",
        },
    },
    {
        "slug": "cloud-service-agreement",
        "name": "Cloud Service Agreement",
        "short_name": "CSA",
        "repo": "CSA",
        "category": "commercial",
        "description": "Terms for selling and buying cloud software and SaaS products.",
        "files": {"CSA.md": "standard_terms"},
    },
    {
        "slug": "service-level-agreement",
        "name": "Service Level Agreement",
        "short_name": "SLA",
        "repo": "SLA",
        "category": "commercial",
        "description": "Uptime and support commitments, plus service credits when they are missed. Used together with the Cloud Service Agreement.",
        "files": {"sla.md": "standard_terms"},
        "used_with": ["cloud-service-agreement"],
    },
    {
        "slug": "software-license-agreement",
        "name": "Software License Agreement",
        "short_name": "Software License",
        "repo": "Software-License-Agreement",
        "category": "commercial",
        "description": "Terms for licensing software that the customer installs and runs itself.",
        "files": {"Software-License-Agreement.md": "standard_terms"},
    },
    {
        "slug": "professional-services-agreement",
        "name": "Professional Services Agreement",
        "short_name": "PSA",
        "repo": "PSA",
        "category": "services",
        "description": "Terms for professional services delivered under one or more Statements of Work.",
        "files": {"psa.md": "standard_terms"},
    },
    {
        "slug": "data-processing-agreement",
        "name": "Data Processing Agreement",
        "short_name": "DPA",
        "repo": "DPA",
        "category": "privacy",
        "description": "Data protection terms for a provider that processes personal data on a customer's behalf, covering GDPR and similar laws.",
        "files": {"DPA.md": "standard_terms"},
    },
    {
        "slug": "business-associate-agreement",
        "name": "Business Associate Agreement",
        "short_name": "BAA",
        "repo": "BAA",
        "category": "privacy",
        "description": "HIPAA terms for a business associate that handles protected health information.",
        "files": {"BAA.md": "standard_terms"},
    },
    {
        "slug": "ai-addendum",
        "name": "AI Addendum",
        "short_name": "AI Addendum",
        "repo": "AI-Addendum",
        "category": "addendum",
        "description": "Addendum covering the use of AI features, including how inputs and outputs may be used and whether they may be used for model training.",
        "files": {"AI-Addendum.md": "standard_terms"},
    },
    {
        "slug": "design-partner-agreement",
        "name": "Design Partner Agreement",
        "short_name": "Design Partner",
        "repo": "Design-Partner-Agreement",
        "category": "partnership",
        "description": "Terms for an early customer who gets access to a product in development in exchange for feedback.",
        "files": {"design-partner-agreement.md": "standard_terms"},
    },
    {
        "slug": "partnership-agreement",
        "name": "Partnership Agreement",
        "short_name": "Partnership",
        "repo": "Partnership-Agreement",
        "category": "partnership",
        "description": "Terms for business partnerships such as referral, reseller and co-marketing arrangements.",
        "files": {"Partnership-Agreement.md": "standard_terms"},
    },
    {
        "slug": "pilot-agreement",
        "name": "Pilot Agreement",
        "short_name": "Pilot",
        "repo": "Pilot-Agreement",
        "category": "commercial",
        "description": "Short-term trial or evaluation terms that let a prospective customer test a product before a full commercial agreement.",
        "files": {"Pilot-Agreement.md": "standard_terms"},
    },
]

# Common Paper marks fillable terms with <span class="<source>_link">Term</span>.
# The class name says which document part supplies the value.
FIELD_SPAN_RE = re.compile(r'<span class="([a-z]+)_link">(.*?)</span>', re.DOTALL)
# Cover pages use bracketed placeholders such as "[Fill in state]". Markdown
# checkboxes ("[x]", "[ ]") and links ("[text](url)") are not placeholders.
BRACKET_RE = re.compile(r"\[([^\]\[]{2,})\](?!\()")
VERSION_RE = re.compile(r"Version (\d+(?:\.\d+)+)")
STANDARDS_URL_RE = re.compile(r"commonpaper\.com/standards/[A-Za-z-]+/(\d+(?:\.\d+)+)")
POSSESSIVE_RE = re.compile(r"(?:’s|'s|’|')$")


def run_git(*args: str, cwd: Path | None = None) -> str:
    return subprocess.run(
        ["git", *args], cwd=cwd, check=True, capture_output=True, text=True
    ).stdout.strip()


def normalize_term(term: str) -> str:
    term = re.sub(r"<[^>]+>", "", term)
    term = re.sub(r"\s+", " ", term).strip()
    return POSSESSIVE_RE.sub("", term)


def extract_fields(text: str) -> list[dict]:
    """Return the fillable fields in a template, sorted by source then name."""
    counts: Counter[tuple[str, str]] = Counter()
    for source, term in FIELD_SPAN_RE.findall(text):
        name = normalize_term(term)
        if name:
            counts[(source, name)] += 1
    return [
        {"name": name, "source": source, "occurrences": n}
        for (source, name), n in sorted(counts.items())
    ]


def extract_placeholders(text: str) -> list[str]:
    seen: dict[str, None] = {}
    for match in BRACKET_RE.findall(text):
        value = match.strip()
        if value.lower() not in {"x", " "}:
            seen.setdefault(value, None)
    return list(seen)


def detect_version(text: str) -> str | None:
    versions = Counter(VERSION_RE.findall(text))
    return versions.most_common(1)[0][0] if versions else None


def build_template(spec: dict, clone_dir: Path) -> dict:
    repo_url = f"https://github.com/{GITHUB_ORG}/{spec['repo']}"
    run_git("clone", "--quiet", "--depth", "1", repo_url + ".git", str(clone_dir))
    commit = run_git("rev-parse", "HEAD", cwd=clone_dir)
    commit_date = run_git("log", "-1", "--format=%cs", cwd=clone_dir)

    dest = OUTPUT_DIR / spec["slug"]
    dest.mkdir(parents=True, exist_ok=True)

    files, all_fields, version = [], {}, None
    for src_name, role in spec["files"].items():
        src = clone_dir / src_name
        if not src.is_file():
            raise FileNotFoundError(f"{spec['repo']}: missing {src_name}")
        text = src.read_text(encoding="utf-8")
        dest_name = f"{role.replace('_', '-')}.md"
        (dest / dest_name).write_text(text, encoding="utf-8")

        version = version or (detect_version(text) if role == "standard_terms" else None)
        fields = extract_fields(text)
        for field in fields:
            key = (field["source"], field["name"])
            if key in all_fields:
                all_fields[key]["occurrences"] += field["occurrences"]
            else:
                all_fields[key] = dict(field)

        entry = {
            "role": role,
            "path": f"{spec['slug']}/{dest_name}",
            "source_path": src_name,
        }
        if role == "cover_page":
            entry["placeholders"] = extract_placeholders(text)
        files.append(entry)

    if version is None:
        # Some templates don't state their version; the repo README links to
        # the versioned standard, e.g. commonpaper.com/standards/<name>/1.0.
        readme = clone_dir / "README.md"
        if readme.is_file():
            match = STANDARDS_URL_RE.search(readme.read_text(encoding="utf-8"))
            version = match.group(1) if match else None

    template = {
        "slug": spec["slug"],
        "name": spec["name"],
        "short_name": spec["short_name"],
        "category": spec["category"],
        "description": spec["description"],
        "version": version,
        "files": files,
        "fields": sorted(all_fields.values(), key=lambda f: (f["source"], f["name"])),
        "source": {
            "repository": repo_url,
            "commit": commit,
            "commit_date": commit_date,
        },
        "license": LICENSE["name"],
    }
    if "used_with" in spec:
        template["used_with"] = spec["used_with"]
    return template


def main() -> int:
    if OUTPUT_DIR.exists():
        for child in OUTPUT_DIR.iterdir():
            if child.is_dir():
                shutil.rmtree(child)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    templates = []
    with tempfile.TemporaryDirectory(prefix="commonpaper-") as tmp:
        for spec in TEMPLATES:
            print(f"Fetching {spec['repo']} ...", file=sys.stderr)
            templates.append(build_template(spec, Path(tmp) / spec["repo"]))

    manifest = {
        "schema_version": 1,
        "description": "Legal agreement templates from Common Paper, used as the base documents that Prelegal fills in and modifies.",
        "source": f"https://github.com/{GITHUB_ORG}",
        "license": LICENSE,
        "field_sources": {
            "coverpage": "Value comes from the agreement's Cover Page.",
            "keyterms": "Value comes from the Key Terms section of the Cover Page.",
            "orderform": "Value comes from an Order Form.",
            "businessterms": "Value comes from the Business Terms section of the Cover Page.",
            "sow": "Value comes from a Statement of Work.",
        },
        "templates": templates,
    }
    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(templates)} templates to {OUTPUT_DIR}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
