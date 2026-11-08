"""Write the publishable source inventory, respecting Git ignore rules."""

from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
output = root / "docs/project-tree.txt"
output.touch(exist_ok=True)
result = subprocess.run(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    cwd=root,
    check=True,
    capture_output=True,
)
paths = sorted(set(filter(None, result.stdout.decode("utf-8").split("\0"))))
output.write_text(
    "SentinelML publishable source and model artifact inventory\n\n"
    + "\n".join(paths)
    + "\n",
    encoding="utf-8",
)
print(f"{len(paths)} publishable files")
