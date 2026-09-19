import re
from dataclasses import dataclass, asdict
from typing import Any

import cv2
import numpy as np

try:
    import pytesseract
except Exception:
    pytesseract = None

EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
JWT = re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b")
AWS = re.compile(r"\bAKIA[0-9A-Z]{16}\b")
PHONE = re.compile(r"(?<!\d)(?:\+?\d[\d ()-]{8,}\d)(?!\d)")
CARD = re.compile(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)")
SECRET_WORD = re.compile(r"(?i)\b(api[_ -]?key|secret|access[_ -]?token|private[_ -]?key)\b.{0,80}")

PATTERNS = [
    ("API key / secret", SECRET_WORD, 34),
    ("JWT token", JWT, 45),
    ("AWS access key", AWS, 45),
    ("Email address", EMAIL, 12),
    ("Phone number", PHONE, 16),
    ("Card-like number", CARD, 30),
]

@dataclass
class Finding:
    kind: str
    confidence: int
    detail: str

class ScreenDetector:
    def __init__(self):
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face = cv2.CascadeClassifier(cascade_path)

    def _text_findings(self, text: str) -> list[Finding]:
        findings = []
        for label, pattern, score in PATTERNS:
            match = pattern.search(text or "")
            if match:
                snippet = match.group(0)
                if len(snippet) > 36:
                    snippet = snippet[:18] + "…" + snippet[-10:]
                findings.append(Finding(label, min(99, 65 + score), snippet))
        return findings

    def analyze(self, image: np.ndarray) -> dict[str, Any]:
        if image is None or image.size == 0:
            return {"risk": 0, "findings": [], "text": "", "faces": 0}

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=5, minSize=(40, 40))

        text = ""
        if pytesseract is not None:
            try:
                small = image
                if max(image.shape[:2]) > 1400:
                    scale = 1400 / max(image.shape[:2])
                    small = cv2.resize(image, None, fx=scale, fy=scale)
                text = pytesseract.image_to_string(small, config="--psm 6")
            except Exception:
                text = ""

        findings = self._text_findings(text)
        if len(faces):
            findings.append(Finding("Face visible", 78, f"{len(faces)} face(s) in frame"))

        risk = min(100, sum(x.confidence // 2 for x in findings))
        if not findings:
            status = "CLEAR"
        elif risk >= 65:
            status = "HIGH RISK"
        else:
            status = "WATCH"

        return {
            "risk": risk,
            "status": status,
            "faces": int(len(faces)),
            "findings": [asdict(x) for x in findings],
            "text": text[:1000],
        }
