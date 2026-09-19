# ScreenGuard AI

A real-time privacy monitor for your screen or camera feed. ScreenGuard combines lightweight computer vision with OCR and secret-pattern detection to flag information that should not be exposed during demos, screen sharing, recordings, or pair programming.

## What it does

- Live camera/screen-share preview
- Face detection with OpenCV
- OCR text scanning when Tesseract is installed
- Detection of email addresses, API-key-like strings, JWTs, phone numbers, and card-like numbers
- Privacy risk score and event timeline
- Local-first architecture: frames are processed by your own FastAPI server

## Stack

Python • FastAPI • OpenCV • Tesseract OCR • WebSockets • Vanilla JavaScript

## Run

1. Install Python 3.10+.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Install Tesseract OCR if you want text detection. On Windows, install it from the official Tesseract distribution and make sure `tesseract.exe` is on PATH.
4. Start:

```bash
uvicorn app.main:app --reload
```

5. Open http://127.0.0.1:8000

## Privacy

The browser camera/screen stream is sent to the local FastAPI process for analysis. Nothing in this project intentionally uploads frames to a third-party AI service.

## Notes

Screen sharing permissions are controlled by the browser. OCR is optional; face detection and pattern scanning continue without Tesseract.
