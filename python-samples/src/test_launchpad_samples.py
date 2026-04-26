from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SAMPLES_DIR = Path(__file__).parent


def test_print_argv_includes_custom_argument() -> None:
    result = subprocess.run(
        [sys.executable, str(SAMPLES_DIR / "print_argv.py"), "cleats-arg"],
        check=True,
        capture_output=True,
        text=True,
    )

    assert "cleats-arg" in result.stdout


class TestCwdSensitive:
    def test_cwd_sensitive_reports_process_cwd(self, tmp_path: Path) -> None:
        result = subprocess.run(
            [sys.executable, str(SAMPLES_DIR / "cwd_sensitive.py")],
            check=True,
            capture_output=True,
            text=True,
            cwd=tmp_path,
        )

        assert str(tmp_path) in result.stdout
