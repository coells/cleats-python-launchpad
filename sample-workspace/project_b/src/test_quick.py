import os
import subprocess
from pathlib import Path


def test_args_in_b() -> None:
    assert "/project_b" in os.getcwd()


class TestB:
    def test_cwd_in_b(self, tmp_path: Path) -> None:
        result = subprocess.run(
            ["bash", "-c", "pwd"],
            check=True,
            capture_output=True,
            text=True,
            cwd=tmp_path,
        )
        assert str(tmp_path) in result.stdout
