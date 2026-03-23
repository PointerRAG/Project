import subprocess
import os

def check():
    with open("large_files_report.txt", "w") as f:
        # Check files in HEAD
        result = subprocess.run(["git", "ls-tree", "-r", "-l", "HEAD"], capture_output=True, text=True)
        lines = result.stdout.split('\n')
        large_files = []
        for line in lines:
            if not line: continue
            parts = line.split()
            if len(parts) >= 4 and parts[3].isdigit():
                size = int(parts[3])
                if size > 50 * 1024 * 1024:
                    large_files.append((parts[-1], size // (1024*1024)))
        f.write("Files > 50MB in HEAD:\n")
        for name, size in large_files:
            f.write(f"{name}: {size} MB\n")
            
        # Check LFS status
        result = subprocess.run(["git", "lfs", "status"], capture_output=True, text=True)
        f.write("\nGit LFS Status:\n")
        f.write(result.stdout)

        # Check .gitattributes
        if os.path.exists(".gitattributes"):
            with open(".gitattributes", "r") as ga:
                f.write("\n.gitattributes:\n")
                f.write(ga.read())

if __name__ == "__main__":
    check()
