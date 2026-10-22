#!/usr/bin/env python3
"""Compare uv's frozen and locked modes using a disposable, offline fixture.

Requires Python 3.10+ and an independently installed uv. No download, global
configuration change, credential, or connection to a package index is performed.
"""

import argparse
import hashlib
import json
import os
import pathlib
import platform
import shutil
import subprocess
import sys
import tempfile
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--uv", default=shutil.which("uv"))
    args = parser.parse_args()
    if not args.uv:
        parser.error("Install uv separately, or pass its executable with --uv.")
    uv = str(pathlib.Path(args.uv).resolve())
    steps = []
    with tempfile.TemporaryDirectory(prefix="yamashi-uv-locking-") as directory:
        root = pathlib.Path(directory)
        env = {key: value for key, value in os.environ.items() if not key.startswith("UV_")}
        env.update(UV_CACHE_DIR=str(root / "cache"), UV_PYTHON_DOWNLOADS="never",
                   UV_PYTHON=sys.executable, UV_PROJECT_ENVIRONMENT=str(root / ".venv"))

        def run(label, arguments, succeeds=True):
            result = subprocess.run(arguments, cwd=root, env=env, text=True,
                                    capture_output=True, timeout=60)

            def redact_paths(value):
                for location in [str(root.resolve()), str(root), sys.executable]:
                    value = value.replace(location, "<local-path>")
                return value

            steps.append({"step": label, "exitCode": result.returncode,
                          "stdout": redact_paths(result.stdout.strip()),
                          "stderr": redact_paths(result.stderr.strip())})
            if (result.returncode == 0) != succeeds:
                raise RuntimeError(json.dumps(steps[-1], ensure_ascii=False))
            return result

        def command(*arguments):
            return [uv, "--no-config", "--offline", *arguments]

        version = run("version", [uv, "--version"]).stdout.strip()
        project = '[project]\nname = "locking-demo"\nversion = "0.1.0"\nrequires-python = ">=3.10"\ndependencies = []\n'
        (root / "pyproject.toml").write_text(project, encoding="utf-8")
        run("initial-lock", command("lock"))
        lock = root / "uv.lock"
        before = hashlib.sha256(lock.read_bytes()).hexdigest()

        files = {
            "audit_sentinel.py": 'VALUE = "installed"\n',
            "audit_sentinel-1.0.0.dist-info/METADATA": "Metadata-Version: 2.1\nName: audit-sentinel\nVersion: 1.0.0\n",
            "audit_sentinel-1.0.0.dist-info/WHEEL": "Wheel-Version: 1.0\nGenerator: YAMASHI-TECH-fixture\nRoot-Is-Purelib: true\nTag: py3-none-any\n",
        }
        record = "audit_sentinel-1.0.0.dist-info/RECORD"
        files[record] = "".join(f"{name},,\n" for name in [*files, record])
        wheel = root / "audit_sentinel-1.0.0-py3-none-any.whl"
        with zipfile.ZipFile(wheel, "w") as archive:
            for name, value in files.items():
                archive.writestr(name, value)
        changed = project.replace('dependencies = []', 'dependencies = ["audit-sentinel"]')
        changed += '\n[tool.uv.sources]\naudit-sentinel = { path = "audit_sentinel-1.0.0-py3-none-any.whl" }\n'
        (root / "pyproject.toml").write_text(changed, encoding="utf-8")

        run("stale-lock: sync --locked", command("sync", "--locked"), succeeds=False)
        run("stale-lock: lock --check", command("lock", "--check"), succeeds=False)
        run("stale-lock: sync --frozen", command("sync", "--frozen"))
        if hashlib.sha256(lock.read_bytes()).hexdigest() != before:
            raise RuntimeError("An operation changed the stale lock unexpectedly.")
        python = root / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        run("frozen: new dependency is absent", [str(python), "-I", "-c",
            "import importlib.util; assert importlib.util.find_spec('audit_sentinel') is None; print('absent')"])
        run("update-lock", command("lock"))
        run("current-lock: sync --locked", command("sync", "--locked"))
        run("locked: dependency is installed", [str(python), "-I", "-c",
            "import audit_sentinel; print(audit_sentinel.VALUE)"])
        print(json.dumps({"uv": version, "python": platform.python_version(),
                          "system": platform.system(), "machine": platform.machine(),
                          "offline": True, "staleLockUnchanged": True, "steps": steps},
                         ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
