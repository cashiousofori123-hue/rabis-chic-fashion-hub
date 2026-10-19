from pathlib import Path

import uvicorn


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        app_dir=str(Path(__file__).parent / "server"),
        host="0.0.0.0",
        port=8000,
    )