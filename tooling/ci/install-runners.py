#!/usr/bin/env python3
"""Install this repository's two native macOS ARM64 GitHub runner services."""

import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import tarfile
import tempfile
import time


REPO = "BerkAkidil9/SwimmingPoolManagementSystem"
LABEL = "swimcenter-ci"
BASE = Path.home() / ".github-runners"
SECRETS = []


def run(command, *, cwd=None, env=None):
    result = subprocess.run(command, cwd=cwd, env=env, capture_output=True, text=True)
    if result.returncode:
        message = result.stdout + result.stderr
        for secret in SECRETS:
            message = message.replace(secret, "[redacted]")
        raise RuntimeError(f"{command[0]} failed: {message[-4000:]}")
    return result.stdout


def api(endpoint, method="GET"):
    return json.loads(run(["gh", "api", "--method", method, endpoint]))


def main():
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        raise RuntimeError("This installer requires native macOS ARM64")
    if os.geteuid() == 0:
        raise RuntimeError("Run as the Mac's logged-in user, without sudo")

    metadata = api(f"repos/{REPO}")
    if not metadata.get("permissions", {}).get("admin"):
        raise RuntimeError("Repository administration permission is required")
    existing = api(f"repos/{REPO}/actions/runners")["runners"]
    release = api("repos/actions/runner/releases/latest")
    asset = next(a for a in release["assets"] if a["name"].startswith("actions-runner-osx-arm64-") and a["name"].endswith(".tar.gz"))
    digest = asset.get("digest", "")
    if not digest.startswith("sha256:"):
        raise RuntimeError("Official runner release has no SHA-256 checksum")
    archive = Path(tempfile.gettempdir()) / asset["name"]
    if not archive.exists() or hashlib.file_digest(archive.open("rb"), "sha256").hexdigest() != digest[7:]:
        print(f"Downloading official runner {release['tag_name']}", flush=True)
        run(["curl", "--fail", "--location", "--retry", "3", "--output", str(archive), asset["browser_download_url"]])
    with archive.open("rb") as source:
        if hashlib.file_digest(source, "sha256").hexdigest() != digest[7:]:
            raise RuntimeError("Runner archive checksum mismatch")
    print("Official runner archive checksum verified", flush=True)

    for index in [1, 2]:
        name = f"swimcenter-ci-{index}"
        directory = BASE / name
        config = directory / ".runner"
        remote = next((r for r in existing if r["name"] == name), None)
        if config.exists():
            data = json.loads(config.read_text(encoding="utf-8-sig"))
            if data.get("gitHubUrl") != f"https://github.com/{REPO}" or data.get("agentName") != name:
                raise RuntimeError(f"Refusing to modify a runner registered to another repository: {directory}")
            if remote is None or remote["id"] != data.get("agentId"):
                raise RuntimeError(f"Local and GitHub runner registration disagree: {name}")
        else:
            if remote is not None:
                raise RuntimeError(f"A remote runner named {name} already exists; refusing to replace it")
            directory.mkdir(parents=True, exist_ok=True)
            if any(directory.iterdir()):
                raise RuntimeError(f"Refusing to overwrite a nonempty unregistered directory: {directory}")
            with tarfile.open(archive, "r:gz") as bundle:
                bundle.extractall(directory, filter="data")
            token = api(f"repos/{REPO}/actions/runners/registration-token", "POST")["token"]
            SECRETS.append(token)
            registration_env = dict(os.environ, ACTIONS_RUNNER_INPUT_TOKEN=token)
            # Pass the short-lived registration token only in the process environment.
            run(["./config.sh", "--unattended", "--url", f"https://github.com/{REPO}",
                 "--name", name, "--labels", LABEL, "--work", "_work"], cwd=directory, env=registration_env)
            print(f"Registered {name}", flush=True)

        service_name = f"actions.runner.BerkAkidil9-SwimmingPoolManagementSystem.{name}"
        plist = Path.home() / "Library/LaunchAgents" / (service_name + ".plist")
        if not plist.exists():
            run(["./svc.sh", "install"], cwd=directory)
        service = subprocess.run(["launchctl", "print", f"gui/{os.getuid()}/{service_name}"], capture_output=True)
        if service.returncode:
            run(["./svc.sh", "start"], cwd=directory)
        print(f"Service installed and started: {name}", flush=True)

    for _ in range(20):
        runners = api(f"repos/{REPO}/actions/runners")["runners"]
        own = [r for r in runners if r["name"] in ["swimcenter-ci-1", "swimcenter-ci-2"]]
        if len(own) == 2 and all(r["status"] == "online" for r in own):
            print(json.dumps([{"name": r["name"], "status": r["status"], "labels": [v["name"] for v in r["labels"]]} for r in own]), flush=True)
            return
        time.sleep(2)
    raise RuntimeError("Runner services started but both did not become online within 40 seconds")


if __name__ == "__main__":
    main()
