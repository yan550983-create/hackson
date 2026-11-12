#!/usr/bin/env python3
"""Cloud-only collaboration smoke test: no credentials, external services, or local Mac dependency."""
from __future__ import annotations
import hashlib
import json
import os
import platform
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts" / "cloud-agent-smoke.json"
FILES = ("README.md", "web/index.html", "scripts/cloud_agent_smoke.py")


def main() -> None:
    checks: dict[str, str] = {}
    for name in FILES:
        path = ROOT / name
        if not path.is_file():
            raise SystemExit(f"FAIL: missing {name}")
        checks[name] = hashlib.sha256(path.read_bytes()).hexdigest()

    report = {
        "result": "PASS",
        "run_location": "github-actions" if os.getenv("GITHUB_ACTIONS") == "true" else "external-computer",
        "platform": platform.platform(),
        "python": platform.python_version(),
        "commit_sha": os.getenv("GITHUB_SHA") or "not-provided",
        "sha256": checks,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
