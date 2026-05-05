import subprocess
import sys
from pathlib import Path

SAMPLES_DIR = Path(__file__).parent


def test_args_in_a() -> None:
    result = subprocess.run(
        [sys.executable, str(SAMPLES_DIR / "print_argv.py"), "cleats-A"],
        check=True,
        capture_output=True,
        text=True,
    )
    assert "cleats-A" in result.stdout


class TestA:
    def test_cwd_in_a(self, tmp_path: Path) -> None:
        result = subprocess.run(
            [sys.executable, str(SAMPLES_DIR / "succ.py")],
            check=True,
            capture_output=True,
            text=True,
            cwd=tmp_path,
        )
        assert str(tmp_path) in result.stdout
