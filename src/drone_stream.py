from ultralytics import YOLO
import cv2
import numpy as np
import requests
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from threading import Thread, Lock
import time
import sys
import os


print("=== BACKEND STARTING ===")
print("RUNNING FILE:", __file__)

# Add src to path if gps_simulator and alert_system are there
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from gps_simulator import get_gps
    from alert_system import send_alert
except ImportError:
    # Fallback GPS simulator if import fails
    print("⚠️ Warning: Using fallback GPS simulator")
    import random
    
    lat = 12.9716
    lon = 77.5946
    
    def get_gps():
        global lat, lon
        lat += random.uniform(-0.0001, 0.0001)
        lon += random.uniform(-0.0001, 0.0001)
        return round(lat, 6), round(lon, 6)
    
    def send_alert(lat, lon):
        print(f"🚨 FIRE ALERT at {lat}, {lon}")

# ================== CONFIG ==================
# Update this path to match your model location
MODEL_PATH = "runs/detect/fire_stage113/weights/best.pt"

WEBCAM = 0
VIDEO = "simulated_drone_fire_video.mp4"
PHONE = "http://192.0.0.4:8080/video"

# Source configuration
SOURCE_MAP = {
    "video": VIDEO,
    "camera": WEBCAM,
    "phone": PHONE
}

SOURCE = VIDEO   # Initial default source
current_source_name = "video"  # Track current source name

CONF_THRESH = 0.25
MIN_AREA_RATIO = 0.002
TEMPORAL_FRAMES = 5
MIN_SATURATION = 60
DISPLAY_SCALE = 0.5

DASHBOARD_API = "http://localhost:3000/api/local-fires"
STREAM_PORT = 5000
# ============================================

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

print("🔥 Loading YOLO model...")

if not os.path.exists(MODEL_PATH):
    print("❌ Model not found:", MODEL_PATH)
    sys.exit(1)

model = YOLO(MODEL_PATH)
print("✅ Model loaded successfully")

# ============ VIDEO CAPTURE WITH LOCK ============
cap = None
cap_lock = Lock()  # Protects VideoCapture operations

def open_source(source):
    """
    Safely opens a video source with proper error handling.
    Returns: (VideoCapture object, success boolean)
    """
    try:
        new_cap = cv2.VideoCapture(source)
        if not new_cap.isOpened():
            print(f"❌ Could not open source: {source}")
            return None, False
        print(f"✅ Successfully opened source: {source}")
        return new_cap, True
    except Exception as e:
        print(f"❌ Error opening source {source}: {e}")
        return None, False

print("📹 Opening initial video source...")
cap, success = open_source(SOURCE)
if not success:
    print(f"❌ Error: Could not open initial video source: {SOURCE}")
    sys.exit(1)
print("✅ Video source opened")

fire_counter = 0
alert_sent = False
latest_frame = None

# ============ REAL-TIME STATUS ============
detection_status = {
    "fire_detected": False,
    "location": {"lat": 0.0, "lon": 0.0},
    "confidence": 0.0,
    "timestamp": time.time(),
    "alert_status": "No Fire"
}
status_lock = Lock()

print("🔥 Fire Detection + Drone Stream Running with Real-Time API")

# ------------- FLASK ENDPOINTS -------------

@app.route("/video")
def video():
    """Stream video frames to browser"""
    def generate_stream():
        global latest_frame
        while True:
            if latest_frame is None:
                time.sleep(0.01)
                continue
            _, buffer = cv2.imencode(".jpg", latest_frame)
            frame = buffer.tobytes()
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")
    
    return Response(generate_stream(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/api/detection-status")
def get_detection_status():
    """Return current detection status as JSON"""
    with status_lock:
        return jsonify(detection_status)

@app.route("/api/health")
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "running", 
        "model": "YOLOv8", 
        "port": STREAM_PORT,
        "video_source": SOURCE,
        "current_source": current_source_name
    })

@app.route("/api/set-source", methods=["POST"])
def set_source():
    """
    Safely switch video source at runtime.
    Expects JSON: { "source": "camera" | "video" | "phone" }
    """
    global cap, SOURCE, current_source_name
    
    try:
        data = request.get_json()
        if not data or "source" not in data:
            return jsonify({
                "success": False, 
                "error": "Missing 'source' parameter"
            }), 400
        
        requested_source = data["source"]
        
        if requested_source not in SOURCE_MAP:
            return jsonify({
                "success": False,
                "error": f"Invalid source. Must be one of: {list(SOURCE_MAP.keys())}"
            }), 400
        
        new_source = SOURCE_MAP[requested_source]
        
        # Thread-safe source switching
        with cap_lock:
            # Try to open new source first
            new_cap, success = open_source(new_source)
            
            if not success:
                return jsonify({
                    "success": False,
                    "error": f"Could not open {requested_source} source"
                }), 500
            
            # Close old capture
            if cap is not None:
                cap.release()
                print(f"🔄 Released previous source: {current_source_name}")
            
            # Switch to new capture
            cap = new_cap
            SOURCE = new_source
            current_source_name = requested_source
            
            print(f"✅ Source switched to: {requested_source}")
        
        return jsonify({
            "success": True,
            "current_source": current_source_name,
            "message": f"Source switched to {requested_source}"
        })
        
    except Exception as e:
        print(f"❌ Error in set_source: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def run_flask():
    print(f"🌐 Starting Flask server on http://0.0.0.0:{STREAM_PORT}")
    app.run(host="0.0.0.0", port=STREAM_PORT, debug=False, threaded=True)

# Start Flask in background thread
Thread(target=run_flask, daemon=True).start()
time.sleep(1)

# ------------- MAIN DETECTION LOOP -------------
def update_status(fire_detected, lat, lon, confidence):
    """Thread-safe status update"""
    with status_lock:
        detection_status["fire_detected"] = fire_detected
        detection_status["location"]["lat"] = lat
        detection_status["location"]["lon"] = lon
        detection_status["confidence"] = confidence
        detection_status["timestamp"] = time.time()
        detection_status["alert_status"] = "🔥 Fire Detected!" if fire_detected else "✓ Monitoring"

print("🚀 Starting detection loop...")
print("📊 Access dashboard at: http://localhost:3000")
print("📹 Video stream at: http://localhost:5000/video")
print("🔌 API status at: http://localhost:5000/api/detection-status")
print("🔄 Switch source at: POST http://localhost:5000/api/set-source")
print("\nPress 'q' in the video window to quit\n")

frame_count = 0

while True:
    # Thread-safe frame reading
    with cap_lock:
        if cap is None:
            print("⚠️ Capture is None, waiting...")
            time.sleep(0.1)
            continue
        
        ret, frame = cap.read()
        
        # Handle video loop
        if not ret:
            if current_source_name == "video":
                print("🔄 Video ended, restarting...")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            else:
                print("⚠️ Failed to read frame, retrying...")
                time.sleep(0.1)
                continue

    frame_count += 1
    results = model(frame, conf=CONF_THRESH, imgsz=640)

    fire_detected_this_frame = False

    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    best_conf = 0
    best_box = None

    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])

            # AREA FILTER
            area = (x2 - x1) * (y2 - y1)
            frame_area = frame.shape[0] * frame.shape[1]
            if area < MIN_AREA_RATIO * frame_area:
                continue

            # SATURATION FILTER
            roi = hsv[y1:y2, x1:x2]
            if roi.size == 0:
                continue
            if np.mean(roi[:, :, 1]) < MIN_SATURATION:
                continue

            fire_detected_this_frame = True

            if conf > best_conf:
                best_conf = conf
                best_box = (x1, y1, x2, y2)

    # Draw detection
    if best_box:
        x1, y1, x2, y2 = best_box
        label = f"FIRE {best_conf:.2f}"
        cv2.rectangle(frame, (x1,y1), (x2,y2), (0,0,255), 2)
        cv2.putText(frame, label, (x1,y1-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)

    # TEMPORAL CONFIRMATION
    if fire_detected_this_frame:
        fire_counter += 1
    else:
        fire_counter = max(0, fire_counter - 1)
        alert_sent = False

    lat, lon = get_gps()
    
    if fire_counter >= TEMPORAL_FRAMES:
        cv2.putText(frame, "REAL FIRE CONFIRMED", (20,40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,0,255), 3)

        update_status(True, lat, lon, best_conf)

        if not alert_sent:
            send_alert(lat, lon)

            try:
                requests.post(DASHBOARD_API, json={
                    "lat": lat,
                    "lon": lon,
                    "confidence": round(best_conf, 3)
                }, timeout=2)
                print(f"📡 Fire detected: {lat}, {lon}, conf: {best_conf:.2%}")
            except Exception as e:
                print(f"⚠️  Dashboard unreachable: {e}")

            alert_sent = True
    else:
        update_status(False, lat, lon, 0.0)

    if frame_count % 100 == 0:
        print(f"📊 Frames: {frame_count} | Fire counter: {fire_counter}/{TEMPORAL_FRAMES} | Source: {current_source_name}")

    # Add source indicator on frame
    cv2.putText(frame, f"Source: {current_source_name.upper()}", (20, frame.shape[0] - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

    display_frame = cv2.resize(frame, None, fx=DISPLAY_SCALE, fy=DISPLAY_SCALE)
    cv2.imshow("Fire Detection System", display_frame)

    latest_frame = display_frame.copy()

    if cv2.waitKey(1) & 0xFF == ord("q"):
        print("\n👋 Shutting down...")
        break

with cap_lock:
    if cap is not None:
        cap.release()
cv2.destroyAllWindows()
print("✅ Detection system stopped")