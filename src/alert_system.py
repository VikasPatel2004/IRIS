import time
import threading
import sys

def _beep_alarm():
    if sys.platform == "win32":
        try:
            import winsound
            for _ in range(3):
                winsound.Beep(1500, 500)
                time.sleep(0.2)
        except ImportError:
            pass
    else:
        print("🔊 (Beep suppressed on non-Windows system)")

def send_alert(lat, lon):
    print("🚨 FIRE ALERT!")
    print(f"Location: {lat}, {lon}")

    # Run beep in background thread
    threading.Thread(target=_beep_alarm, daemon=True).start()

    # Log to file
    with open("fire_log.txt", "a") as f:
        f.write(f"{time.ctime()} - FIRE at {lat}, {lon}\n")
