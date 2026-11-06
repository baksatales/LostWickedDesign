"""Build a curated source archive without exporting runtime secrets or private state."""
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
import hashlib
import json
import re
import stat
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "generated-artifacts" / "handover" / "baksa-tales-developer-handover.zip"
PREFIX = "baksa-tales-developer-handover"
SOURCE_DIRS = ("artifacts", "lib", "reference", "scripts", "supabase", "docs")
ROOT_FILES = (
    "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json",
    "tsconfig.base.json", ".gitignore", ".replitignore", ".replit", "replit.md",
    "flake.nix", "flake.lock",
)
BLOCKED = {
    "node_modules", "dist", ".git", ".agents", ".conversation", ".cache", ".config",
    ".local", "generated-artifacts", "coverage", "test-results", "playwright-report",
    "__pycache__", ".vite", ".turbo", ".DS_Store",
}
ENV_EXAMPLE = """# Blank values only. Obtain development credentials separately.
# Current processes expect environment variables; this file is not auto-loaded.
SUPABASE_URL=
SUPABASE_ANON_KEY=
# Optional writing assistant:
AI_INTEGRATIONS_OPENAI_BASE_URL=
AI_INTEGRATIONS_OPENAI_API_KEY=
NODE_ENV=development
LOG_LEVEL=info
# Optional unused workspace database scaffold; NOT a Supabase replacement:
# DATABASE_URL=
# Set PORT and BASE_PATH separately per service; see README.md.
"""
PATTERNS = {
    "private-key": rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    "provider-key": rb"(?<![A-Za-z0-9])(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,})",
    "github-token": rb"(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})",
    "jwt": rb"eyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{16,}",
    "credentialed-database-url": rb"(?:postgres(?:ql)?|mysql)://[^/\s:@]+:[^/\s@]+@",
}
TEXT_SUFFIXES = {".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", ".sql", ".md",
                 ".json", ".yaml", ".yml", ".html", ".css", ".toml", ".sh", ".nix", ".txt"}


def allowed(path):
    return not any(part in BLOCKED for part in path.parts) and not (
        path.name.startswith(".env") or path.suffix in {".log", ".map", ".zip", ".pem", ".key"}
        or path.name.endswith(".tsbuildinfo")
    )


def inspect(name, data):
    if PurePosixPath(name).suffix not in TEXT_SUFFIXES and PurePosixPath(name).suffix:
        return
    for label, pattern in PATTERNS.items():
        for match in re.finditer(pattern, data):
            value = match.group(0).upper()
            if any(marker in value for marker in (b"TEST_ONLY", b"NOT_A_REAL", b"PLACEHOLDER", b"EXAMPLE", b"YOUR_")):
                continue
            # Report only location/category, never suspected credential contents.
            raise RuntimeError(f"Credential-pattern check stopped packaging: {name} [{label}]")


def build():
    entries = {}
    for folder in SOURCE_DIRS:
        # Prune excluded trees before descending; don't traverse dependency folders.
        import os
        for directory, dirs, files in os.walk(ROOT / folder, followlinks=False):
            dirs[:] = sorted(d for d in dirs if d not in BLOCKED
                             and not (Path(directory) / d).is_symlink())
            for filename in sorted(files):
                file = Path(directory) / filename
                relative = file.relative_to(ROOT)
                if file.is_symlink() or not allowed(relative):
                    continue
                entries[relative.as_posix()] = file.read_bytes()
    for name in ROOT_FILES:
        file = ROOT / name
        if file.is_file() and not file.is_symlink():
            entries[name] = file.read_bytes()
    entries[".env.example"] = ENV_EXAMPLE.encode()
    # Never copy registry credentials from the workspace's .npmrc.
    entries[".npmrc"] = b"registry=https://registry.npmjs.org/\n"
    entries["README.md"] = (ROOT / "docs/DEVELOPER_HANDOVER.md").read_bytes()

    original = ROOT / "attached_assets/baksa-tales-replit_1793944794782.zip"
    design_prefix = "baksa-tales-replit/designs/"
    design_types = {".html", ".css", ".js", ".svg", ".png", ".webp", ".jpg", ".jpeg", ".woff", ".woff2"}
    if original.exists():
        with zipfile.ZipFile(original) as source:
            for info in source.infolist():
                if not info.filename.startswith(design_prefix) or info.is_dir():
                    continue
                relative = PurePosixPath(info.filename[len(design_prefix):])
                if relative.is_absolute() or ".." in relative.parts or not allowed(relative):
                    raise RuntimeError("Unsafe path in supplied design reference")
                if stat.S_ISLNK(info.external_attr >> 16) or info.file_size > 10_000_000:
                    raise RuntimeError("Unsupported reference entry")
                if relative.suffix.lower() not in design_types:
                    continue
                entries[f"design-reference/claude-kit/{relative}"] = source.read(info)
    else:
        # The delivered archive already contains the selected design references.
        # Repack it without requiring the owner's original upload/private folders.
        design_root = ROOT / "design-reference" / "claude-kit"
        if not design_root.is_dir():
            raise RuntimeError("The supplied design references are missing")
        for file in sorted(design_root.rglob("*")):
            if file.is_symlink() or not file.is_file():
                continue
            relative = file.relative_to(design_root)
            if not allowed(relative) or relative.suffix.lower() not in design_types:
                continue
            if file.stat().st_size > 10_000_000:
                raise RuntimeError("Unsupported reference entry")
            entries[f"design-reference/claude-kit/{relative.as_posix()}"] = file.read_bytes()

    for name, data in entries.items():
        inspect(name, data)
    manifest = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "source": "Current working files; not a Git history or database export.",
        "credentialCheck": "Secret-file exclusions and common static credential patterns; not a full security audit.",
        "fileCount": len(entries),
        "files": [{"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                  for name, data in sorted(entries.items())],
    }
    entries["HANDOVER_MANIFEST.json"] = (json.dumps(manifest, indent=2) + "\n").encode()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".zip.tmp")
    try:
        with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for name, data in sorted(entries.items()):
                info = zipfile.ZipInfo(f"{PREFIX}/{name}", datetime.now().timetuple()[:6])
                info.compress_type = zipfile.ZIP_DEFLATED
                info.create_system = 3
                source = ROOT / name
                mode = 0o755 if source.is_file() and source.stat().st_mode & 0o111 else 0o644
                info.external_attr = (stat.S_IFREG | mode) << 16
                archive.writestr(info, data, compresslevel=9)
        with zipfile.ZipFile(temporary) as archive:
            if archive.testzip() is not None:
                raise RuntimeError("ZIP CRC verification failed")
            for item in manifest["files"]:
                actual = archive.read(f"{PREFIX}/{item['path']}")
                if hashlib.sha256(actual).hexdigest() != item["sha256"]:
                    raise RuntimeError("Archive content checksum mismatch")
            for item in archive.infolist():
                p = PurePosixPath(item.filename)
                if p.is_absolute() or ".." in p.parts or any(x in BLOCKED for x in p.parts):
                    raise RuntimeError("Excluded or unsafe archive path")
                if p.name.startswith(".env") and p.name != ".env.example":
                    raise RuntimeError("Unexpected environment file")
        temporary.replace(OUTPUT)
    finally:
        if temporary.exists():
            temporary.unlink()
    digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
    OUTPUT.with_suffix(".zip.sha256").write_text(f"{digest}  {OUTPUT.name}\n")
    print(json.dumps({"file": str(OUTPUT.relative_to(ROOT)), "files": len(entries),
                      "bytes": OUTPUT.stat().st_size, "sha256": digest,
                      "crcAndManifestVerified": True}))


if __name__ == "__main__":
    build()
