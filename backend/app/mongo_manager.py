"""
mongo_manager.py
----------------
Automatically starts a local `mongod` process when FastAPI starts,
storing all data in  backend/data/  (next to this file).

Requirements:
  - MongoDB must be installed on the system (mongod in PATH, OR the default
    install path is used as a fallback).
  - No separate `mongod` should already be running on port 27017.
"""

import os
import time
import subprocess
import socket
import shutil

# ─── Paths ────────────────────────────────────────────────────────────────────
# backend/data  →  persisted MongoDB files live here
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR  = os.path.join(_BACKEND_DIR, "data")
LOG_FILE  = os.path.join(_BACKEND_DIR, "data", "mongod.log")
PORT      = 27017

# Common Windows install paths for mongod.exe
_FALLBACK_PATHS = [
    r"C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe",
    r"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe",
    r"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe",
    r"C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe",
    r"C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe",
]

_mongod_process: subprocess.Popen | None = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _find_mongod() -> str | None:
    """Return the path to mongod, or None if not found."""
    # Check PATH first
    found = shutil.which("mongod")
    if found:
        return found
    # Check common Windows install locations
    for path in _FALLBACK_PATHS:
        if os.path.isfile(path):
            return path
    return None


def _is_port_open(port: int, host: str = "127.0.0.1", timeout: float = 1.0) -> bool:
    """Return True if something is already listening on *port*."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


# ─── Public API ───────────────────────────────────────────────────────────────

def start_mongod() -> None:
    """Start a local mongod process.  Called from FastAPI startup."""
    global _mongod_process

    # Make sure the data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)

    # If something is already listening skip launching a new process
    if _is_port_open(PORT):
        print(f"[OK] MongoDB already running on port {PORT} - skipping auto-start.")
        return

    mongod_path = _find_mongod()
    if mongod_path is None:
        print(
            "⚠️  mongod not found on PATH or common install locations.\n"
            "    Please install MongoDB Community Edition and make sure\n"
            "    mongod.exe is in your PATH, then restart the server."
        )
        return

    cmd = [
        mongod_path,
        "--dbpath", DATA_DIR,
        "--port",   str(PORT),
        "--logpath", LOG_FILE,
        "--logappend",
        "--bind_ip", "127.0.0.1",
    ]

    print(f"[>>] Starting embedded MongoDB...")
    print(f"   binary : {mongod_path}")
    print(f"   data   : {DATA_DIR}")
    print(f"   log    : {LOG_FILE}")

    _mongod_process = subprocess.Popen(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Wait up to 10 s for mongod to become ready
    for _ in range(20):
        if _is_port_open(PORT):
            print(f"[OK] MongoDB is up on port {PORT}  (pid={_mongod_process.pid})")
            return
        time.sleep(0.5)

    print("[WARN] MongoDB did not become ready in time - check data/mongod.log")


def stop_mongod() -> None:
    """Gracefully stop the mongod process we started.  Called on shutdown."""
    global _mongod_process
    if _mongod_process and _mongod_process.poll() is None:
        print("[>>] Stopping embedded MongoDB...")
        _mongod_process.terminate()
        try:
            _mongod_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            _mongod_process.kill()
        print("[OK] MongoDB stopped.")
        _mongod_process = None
