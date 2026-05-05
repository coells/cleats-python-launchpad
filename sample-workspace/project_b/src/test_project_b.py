import subprocess
import sys
from pathlib import Path

SAMPLES_DIR = Path(__file__).parent


def test_args_in_b() -> None:
    result = subprocess.run(
        [sys.executable, str(SAMPLES_DIR / "print_argv.py"), "cleats-B"],
        check=True,
        capture_output=True,
        text=True,
    )
    assert "cleats-B" in result.stdout


class TestB:
    def test_cwd_in_b(self, tmp_path: Path) -> None:
        result = subprocess.run(
            [sys.executable, str(SAMPLES_DIR / "succ.py")],
            check=True,
            capture_output=True,
            text=True,
            cwd=tmp_path,
        )
        assert str(tmp_path) in result.stdout
