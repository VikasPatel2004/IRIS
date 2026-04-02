from ultralytics import YOLO
import cv2
import numpy as np
import requests
from flask import Flask, Response
from flask_cors import CORS
from threading import Thread
import time
import os
from gps_simulator import get_gps
from alert_system import send_alert

import torch
torch.set_num_threads(1) # CRITICAL: Limit memory overhead on Render

# ================== CONFIG ==================
MODEL_PATH = os.environ.get("MODEL_PATH", "yolov8n.pt") # Use 'n' (Nano) for memory efficiency
VIDEO = "simulated_drone_fire_video.mp4"
SOURCE = VIDEO

CONF_THRESH = 0.29
MIN_AREA_RATIO = 0.002 
TEMPORAL_FRAMES = 5
MIN_SATURATION = 60
DISPLAY_SCALE = 0.5

DASHBOARD_API = os.environ.get("DASHBOARD_API", "http://localhost:3000/api/local-fires")
STREAM_PORT = int(os.environ.get("PORT", 10000))
# ============================================

app = Flask(__name__)
CORS(app) # Enable CORS for external access

DEVICE = "cpu"
model = YOLO(MODEL_PATH)
cap = cv2.VideoCapture(SOURCE)

fire_counter = 0
alert_sent = False
latest_frame = None

print(f"🔥 Fire Detection + Drone Stream Running on port {STREAM_PORT}")

# ------------- FLASK STREAM -------------
def generate_stream():
    global latest_frame
    while True:
        if latest_frame is None:
            time.sleep(0.1)
            continue
        _, buffer = cv2.imencode(".jpg", latest_frame)
        frame = buffer.tobytes()
        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")

@app.route("/video")
def video():
    return Response(generate_stream(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/health")
def health():
    return {"status": "ok"}

@app.route("/")
def index():
    return "AI Brain is running"

def run_flask():
    app.run(host="0.0.0.0", port=STREAM_PORT, debug=False)

Thread(target=run_flask, daemon=True).start()

# ------------- MAIN LOOP -------------
while True:
    ret, frame = cap.read()
    if not ret:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        continue

    # Small delay to prevent CPU 100% on cloud servers
    time.sleep(0.01)

    results = model(frame, conf=CONF_THRESH, imgsz=640, device=DEVICE)
    fire_detected_this_frame = False
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    best_conf = 0
    best_box = None

    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            area = (x2 - x1) * (y2 - y1)
            frame_area = frame.shape[0] * frame.shape[1]
            if area < MIN_AREA_RATIO * frame_area: continue
            roi = hsv[y1:y2, x1:x2]
            if roi.size == 0 or np.mean(roi[:, :, 1]) < MIN_SATURATION: continue
            fire_detected_this_frame = True
            if conf > best_conf:
                best_conf = conf
                best_box = (x1, y1, x2, y2)

    if best_box:
        x1, y1, x2, y2 = best_box
        cv2.rectangle(frame, (x1,y1), (x2,y2), (0,0,255), 2)
        cv2.putText(frame, f"FIRE {best_conf:.2f}", (x1,y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)

    if fire_detected_this_frame:
        fire_counter += 1
    else:
        fire_counter = max(0, fire_counter - 1)
        alert_sent = False

    if fire_counter >= TEMPORAL_FRAMES:
        cv2.putText(frame, "🔥 REAL FIRE CONFIRMED", (20,40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,0,255), 3)
        if not alert_sent:
            lat, lon = get_gps()
            send_alert(lat, lon)
            try:
                requests.post(DASHBOARD_API, json={"lat": lat, "lon": lon, "confidence": round(best_conf, 3)})
                print(f"📡 Sent to dashboard: {lat}, {lon}")
            except:
                print("❌ Dashboard not reachable")
            alert_sent = True

    latest_frame = cv2.resize(frame, None, fx=DISPLAY_SCALE, fy=DISPLAY_SCALE)
    if cv2.waitKey(1) & 0xFF == ord("q"): break

cap.release()
