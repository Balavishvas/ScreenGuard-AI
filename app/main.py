from pathlib import Path
import base64
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .detector import ScreenDetector

ROOT = Path(__file__).resolve().parent.parent
app = FastAPI(title="ScreenGuard AI")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
detector = ScreenDetector()

@app.get("/")
async def home():
    return FileResponse(ROOT / "static" / "index.html")

@app.get("/health")
async def health():
    return {"ok": True, "service": "ScreenGuard AI"}

@app.websocket("/ws/analyze")
async def analyze(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_text()
            if "," in payload:
                payload = payload.split(",", 1)[1]
            raw = base64.b64decode(payload)
            arr = np.frombuffer(raw, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            result = detector.analyze(frame)
            await websocket.send_json(result)
    except (WebSocketDisconnect, ValueError):
        pass
