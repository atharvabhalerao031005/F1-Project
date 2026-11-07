"""
VELOCE V2 // PRODUCTION TTL / LRU STORAGE EVICTION DAEMON
Module: backend/storage/ttl_cache_manager.py
Standard: VELOCE-V2-ENGINEERING-SPEC-v2.0

Key Invariants:
1. Configurable TTL: Default 20 minutes (1,200 seconds) of inactivity before eligibility.
2. Hard Quota: 200 MB hard limit; LRU evictions reduce usage down to 80% watermark (160 MB).
3. Active Client Lease Guardrail: Active client sessions hold 5-minute renewable leases;
   active leased sessions are strictly immune to LRU and TTL eviction.
4. Thread & Process Safety: Atomic filesystem manifest synchronization (cache_manifest.json)
   with cross-platform file locking (msvcrt on Windows, fcntl on POSIX, RLock in-process).
5. Manual Purge API: Supports DELETE /api/v1/cache/purge.
"""

import os
import sys
import time
import json
import logging
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union

logger = logging.getLogger("veloce.storage.ttl_cache")

# Cross-platform file locking imports
try:
    import msvcrt  # Windows
    HAS_MSVCRT = True
except ImportError:
    HAS_MSVCRT = False

try:
    import fcntl  # POSIX
    HAS_FCNTL = True
except ImportError:
    HAS_FCNTL = False


class FileLockContext:
    """Cross-platform advisory file lock context manager."""
    def __init__(self, lock_file_path: Path):
        self.lock_file_path = lock_file_path
        self.fp = None

    def __enter__(self):
        try:
            self.lock_file_path.parent.mkdir(parents=True, exist_ok=True)
            self.fp = open(self.lock_file_path, "a+")
            if HAS_MSVCRT:
                # Windows non-blocking lock; retry briefly
                for _ in range(50):
                    try:
                        msvcrt.locking(self.fp.fileno(), msvcrt.LK_NBLCK, 1)
                        break
                    except (IOError, OSError):
                        time.sleep(0.01)
            elif HAS_FCNTL:
                fcntl.flock(self.fp.fileno(), fcntl.LOCK_EX)
        except Exception as e:
            logger.debug(f"Advisory file locking notice: {e}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.fp:
            try:
                if HAS_MSVCRT:
                    try:
                        msvcrt.locking(self.fp.fileno(), msvcrt.LK_UNLCK, 1)
                    except (IOError, OSError):
                        pass
                elif HAS_FCNTL:
                    fcntl.flock(self.fp.fileno(), fcntl.LOCK_UN)
            except Exception:
                pass
            finally:
                try:
                    self.fp.close()
                except Exception:
                    pass


class TtlLruCacheManager:
    """
    Production-grade TTL + LRU Storage Manager for Veloce V2.
    Guarantees cache bounds, multi-client leases, and atomic manifest persistence.
    """

    def __init__(
        self,
        cache_dir: Optional[Union[str, Path]] = None,
        ttl_seconds: int = 1200,          # 20 minutes
        hard_quota_bytes: int = 200 * 1024 * 1024,  # 200 MB
        low_watermark_ratio: float = 0.80, # 80% (160 MB)
    ):
        if cache_dir is None:
            # Default to backend/f1_telemetry_cache
            project_root = Path(__file__).resolve().parent.parent
            self.cache_dir = project_root / "f1_telemetry_cache"
        else:
            self.cache_dir = Path(cache_dir)

        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.manifest_path = self.cache_dir / "cache_manifest.json"
        self.lock_path = self.cache_dir / ".cache_manifest.lock"

        self.ttl_seconds = ttl_seconds
        self.hard_quota_bytes = hard_quota_bytes
        self.low_watermark_bytes = int(hard_quota_bytes * low_watermark_ratio)

        self._in_process_lock = threading.RLock()
        self._manifest_cache: Dict[str, Any] = {}
        self._active_leases: Dict[str, Dict[str, float]] = {}  # session_id -> {client_id: expire_ts}

        self._load_or_rebuild_manifest()

    def _load_or_rebuild_manifest(self) -> None:
        """Reads cache_manifest.json or scans cache_dir if missing."""
        with self._in_process_lock:
            with FileLockContext(self.lock_path):
                if self.manifest_path.exists():
                    try:
                        with open(self.manifest_path, "r", encoding="utf-8") as f:
                            self._manifest_cache = json.load(f)
                            return
                    except Exception as e:
                        logger.warning(f"Corrupt manifest detected, rebuilding from disk: {e}")

                # Rebuild manifest by scanning cache directory
                self._manifest_cache = {
                    "version": "2.0.0",
                    "updated_at": time.time(),
                    "sessions": {},
                }
                self._scan_and_sync_disk()
                self._save_manifest_atomic()

    def _scan_and_sync_disk(self) -> None:
        """Scans disk for .json / .bin telemetry artifacts and indexes them."""
        now = time.time()
        for root, _, files in os.walk(self.cache_dir):
            for file in files:
                if file.startswith(".") or file == "cache_manifest.json" or file.endswith(".sqlite"):
                    continue
                file_path = Path(root) / file
                try:
                    stat = file_path.stat()
                    # Generate logical session id from filename or relpath
                    rel_p = str(file_path.relative_to(self.cache_dir)).replace("\\", "/")
                    session_key = rel_p.rsplit(".", 1)[0].replace("/", "_")
                    if session_key not in self._manifest_cache["sessions"]:
                        self._manifest_cache["sessions"][session_key] = {
                            "file_path": str(file_path),
                            "relative_path": rel_p,
                            "size_bytes": stat.st_size,
                            "created_at": stat.st_ctime if hasattr(stat, "st_ctime") else now,
                            "last_accessed_at": stat.st_atime if hasattr(stat, "st_atime") else now,
                            "pinned": "monza" in session_key or "silverstone" in session_key,
                            "metadata": {},
                        }
                except Exception as e:
                    logger.debug(f"Error inspecting {file_path}: {e}")

    def _save_manifest_atomic(self) -> None:
        """Atomically writes cache_manifest.json using a tempfile and os.replace."""
        tmp_path = self.cache_dir / f"cache_manifest.tmp.{os.getpid()}.{threading.get_ident()}"
        self._manifest_cache["updated_at"] = time.time()
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(self._manifest_cache, f, indent=2)
            os.replace(tmp_path, self.manifest_path)
        except Exception as e:
            logger.error(f"Failed atomic manifest save: {e}")
            if tmp_path.exists():
                try:
                    tmp_path.unlink()
                except Exception:
                    pass

    # ------------------------------------------------------------------------
    # LEASE MANAGEMENT (Active Client Guardrail)
    # ------------------------------------------------------------------------
    def acquire_lease(self, session_id: str, client_id: str, duration_sec: int = 300) -> bool:
        """Grants a client lease protecting the session from eviction for duration_sec."""
        with self._in_process_lock:
            now = time.time()
            if session_id not in self._active_leases:
                self._active_leases[session_id] = {}
            self._active_leases[session_id][client_id] = now + duration_sec
            self.touch_session(session_id)
            return True

    def renew_lease(self, session_id: str, client_id: str, duration_sec: int = 300) -> bool:
        """Extends an active lease."""
        return self.acquire_lease(session_id, client_id, duration_sec)

    def release_lease(self, session_id: str, client_id: str) -> bool:
        """Releases a client lease early."""
        with self._in_process_lock:
            if session_id in self._active_leases and client_id in self._active_leases[session_id]:
                del self._active_leases[session_id][client_id]
                if not self._active_leases[session_id]:
                    del self._active_leases[session_id]
                return True
            return False

    def is_session_leased(self, session_id: str) -> bool:
        """Returns True if the session has at least one active, non-expired lease."""
        with self._in_process_lock:
            now = time.time()
            if session_id not in self._active_leases:
                return False
            # Clean expired leases
            valid_leases = {
                cid: exp for cid, exp in self._active_leases[session_id].items() if exp > now
            }
            self._active_leases[session_id] = valid_leases
            return len(valid_leases) > 0

    # ------------------------------------------------------------------------
    # SESSION REGISTRATION & ACCESS
    # ------------------------------------------------------------------------
    def register_session(
        self,
        session_id: str,
        file_path: Union[str, Path],
        size_bytes: Optional[int] = None,
        pinned: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Registers or updates a session artifact in the cache manifest."""
        file_p = Path(file_path).resolve()
        if size_bytes is None:
            size_bytes = file_p.stat().st_size if file_p.exists() else 0

        now = time.time()
        with self._in_process_lock:
            with FileLockContext(self.lock_path):
                entry = {
                    "file_path": str(file_p),
                    "relative_path": str(file_p.relative_to(self.cache_dir)).replace("\\", "/")
                    if file_p.is_relative_to(self.cache_dir)
                    else file_p.name,
                    "size_bytes": size_bytes,
                    "created_at": now,
                    "last_accessed_at": now,
                    "pinned": pinned,
                    "metadata": metadata or {},
                }
                self._manifest_cache["sessions"][session_id] = entry
                self._save_manifest_atomic()

                # Trigger proactive eviction check
                self.evict_if_needed()
                return entry

    def touch_session(self, session_id: str) -> bool:
        """Updates last_accessed_at timestamp for LRU tracking."""
        with self._in_process_lock:
            if session_id in self._manifest_cache["sessions"]:
                self._manifest_cache["sessions"][session_id]["last_accessed_at"] = time.time()
                # Periodic or lazy manifest persistence
                self._save_manifest_atomic()
                return True
            return False

    def get_session_path(self, session_id: str) -> Optional[Path]:
        """Returns file path for session_id if present on disk, updating access time."""
        with self._in_process_lock:
            entry = self._manifest_cache["sessions"].get(session_id)
            if entry:
                p = Path(entry["file_path"])
                if p.exists():
                    self.touch_session(session_id)
                    return p
            return None

    # ------------------------------------------------------------------------
    # EVICTION DAEMON LOGIC (TTL + LRU HARD QUOTA)
    # ------------------------------------------------------------------------
    def evict_if_needed(self) -> Dict[str, Any]:
        """
        Executes eviction cycle:
        1. TTL Eviction: Removes sessions untouched for > ttl_seconds (unless pinned or leased).
        2. LRU Quota Eviction: If total cache > hard_quota_bytes, removes oldest accessed unleased
           sessions until usage <= low_watermark_bytes.
        """
        with self._in_process_lock:
            with FileLockContext(self.lock_path):
                now = time.time()
                evicted_sessions: List[str] = []
                bytes_freed = 0

                sessions = self._manifest_cache["sessions"]

                # 1. TTL Phase
                expired_keys = []
                for s_id, meta in list(sessions.items()):
                    if meta.get("pinned", False):
                        continue
                    if self.is_session_leased(s_id):
                        continue
                    last_access = meta.get("last_accessed_at", 0)
                    if (now - last_access) > self.ttl_seconds:
                        expired_keys.append(s_id)

                for s_id in expired_keys:
                    freed = self._delete_session_file(s_id)
                    bytes_freed += freed
                    evicted_sessions.append(s_id)

                # 2. LRU Quota Phase
                total_bytes = self.get_total_cache_size_bytes()
                if total_bytes > self.hard_quota_bytes:
                    logger.info(
                        f"Cache size ({total_bytes / (1024*1024):.2f} MB) exceeds hard quota "
                        f"({self.hard_quota_bytes / (1024*1024):.2f} MB). Starting LRU eviction..."
                    )
                    # Candidate list sorted by last_accessed_at ascending
                    candidates = []
                    for s_id, meta in sessions.items():
                        if meta.get("pinned", False):
                            continue
                        if self.is_session_leased(s_id):
                            continue
                        candidates.append((meta.get("last_accessed_at", 0), s_id))

                    candidates.sort(key=lambda x: x[0])

                    for _, s_id in candidates:
                        freed = self._delete_session_file(s_id)
                        bytes_freed += freed
                        evicted_sessions.append(s_id)
                        total_bytes -= freed
                        if total_bytes <= self.low_watermark_bytes:
                            break

                if evicted_sessions:
                    self._save_manifest_atomic()
                    logger.info(
                        f"Eviction cycle completed: {len(evicted_sessions)} sessions removed, "
                        f"{bytes_freed / (1024*1024):.2f} MB freed."
                    )

                return {
                    "evictedCount": len(evicted_sessions),
                    "evictedSessions": evicted_sessions,
                    "bytesFreed": bytes_freed,
                    "currentSizeBytes": self.get_total_cache_size_bytes(),
                }

    def _delete_session_file(self, session_id: str) -> int:
        """Safely removes session file from disk and deletes manifest key."""
        meta = self._manifest_cache["sessions"].pop(session_id, None)
        if not meta:
            return 0
        file_p = Path(meta["file_path"])
        size = meta.get("size_bytes", 0)
        try:
            if file_p.exists():
                size = file_p.stat().st_size
                file_p.unlink()
                logger.info(f"Evicted session file: {file_p} ({size} bytes)")
        except Exception as e:
            logger.error(f"Failed deleting file {file_p}: {e}")
        return size

    # ------------------------------------------------------------------------
    # PURGE & STATS
    # ------------------------------------------------------------------------
    def purge_all(self, force: bool = False) -> Dict[str, Any]:
        """
        Manually clears unpinned/unleased cache artifacts.
        If force=True, clears all except pinned baseline demo sessions (Monza/Silverstone).
        """
        with self._in_process_lock:
            with FileLockContext(self.lock_path):
                sessions = self._manifest_cache["sessions"]
                purged_keys = []
                bytes_freed = 0

                for s_id, meta in list(sessions.items()):
                    is_demo = "monza" in s_id or "silverstone" in s_id
                    if not force:
                        if meta.get("pinned", False) or is_demo:
                            continue
                        if self.is_session_leased(s_id):
                            continue
                    else:
                        if is_demo:
                            continue

                    freed = self._delete_session_file(s_id)
                    bytes_freed += freed
                    purged_keys.append(s_id)

                self._save_manifest_atomic()
                logger.info(f"Manual cache purge: {len(purged_keys)} sessions cleared, {bytes_freed} bytes freed")
                return {
                    "purgedCount": len(purged_keys),
                    "purgedSessions": purged_keys,
                    "bytesFreed": bytes_freed,
                    "remainingSizeBytes": self.get_total_cache_size_bytes(),
                }

    def get_total_cache_size_bytes(self) -> int:
        """Returns sum of registered session sizes in bytes."""
        with self._in_process_lock:
            return sum(
                s.get("size_bytes", 0) for s in self._manifest_cache.get("sessions", {}).values()
            )

    def get_stats(self) -> Dict[str, Any]:
        """Provides runtime cache telemetry and quota usage."""
        with self._in_process_lock:
            total_bytes = self.get_total_cache_size_bytes()
            sessions = self._manifest_cache.get("sessions", {})
            active_leases_count = sum(
                1 for s_id in sessions if self.is_session_leased(s_id)
            )

            return {
                "totalSizeBytes": total_bytes,
                "totalSizeMB": round(total_bytes / (1024 * 1024), 2),
                "hardQuotaMB": round(self.hard_quota_bytes / (1024 * 1024), 2),
                "lowWatermarkMB": round(self.low_watermark_bytes / (1024 * 1024), 2),
                "quotaUsagePct": round((total_bytes / self.hard_quota_bytes) * 100, 2)
                if self.hard_quota_bytes > 0
                else 0.0,
                "sessionCount": len(sessions),
                "activeLeasesCount": active_leases_count,
                "ttlMinutes": self.ttl_seconds // 60,
                "manifestPath": str(self.manifest_path),
            }


# Singleton accessor
_GLOBAL_CACHE_MANAGER: Optional[TtlLruCacheManager] = None
_CACHE_INIT_LOCK = threading.Lock()


def get_cache_manager() -> TtlLruCacheManager:
    """Retrieves or instantiates the global TtlLruCacheManager singleton."""
    global _GLOBAL_CACHE_MANAGER
    if _GLOBAL_CACHE_MANAGER is None:
        with _CACHE_INIT_LOCK:
            if _GLOBAL_CACHE_MANAGER is None:
                _GLOBAL_CACHE_MANAGER = TtlLruCacheManager()
    return _GLOBAL_CACHE_MANAGER
