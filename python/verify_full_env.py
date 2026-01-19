
import sys
import importlib.util

def check_import(module_name, display_name=None):
    if display_name is None:
        display_name = module_name
    
    try:
        if module_name == "boxmot":
            # BoxMOT usually installed as 'boxmot'
            import boxmot
            print(f"✅ {display_name:<15} : Installed (v{getattr(boxmot, '__version__', 'unknown')})")
            return True
        elif module_name == "ultralytics":
            import ultralytics
            print(f"✅ {display_name:<15} : Installed (v{ultralytics.__version__})")
            return True
        elif module_name == "cv2":
            import cv2
            print(f"✅ {display_name:<15} : Installed (v{cv2.__version__})")
            return True
        elif module_name == "numpy":
            import numpy
            print(f"✅ {display_name:<15} : Installed (v{numpy.__version__})")
            return True
        elif module_name == "mediapipe":
            import mediapipe
            print(f"✅ {display_name:<15} : Installed (v{getattr(mediapipe, '__version__', 'unknown')})")
            return True
        elif module_name == "supabase":
            import supabase
            print(f"✅ {display_name:<15} : Installed (v{getattr(supabase, '__version__', 'unknown')})")
            return True
        else:
            mod = __import__(module_name)
            version = getattr(mod, '__version__', 'unknown')
            print(f"✅ {display_name:<15} : Installed (v{version})")
            return True
    except ImportError:
        print(f"❌ {display_name:<15} : NOT INSTALLED")
        return False
    except Exception as e:
        print(f"⚠️ {display_name:<15} : Error during import - {e}")
        return False

print("========================================")
print("   Environment Dependency Check        ")
print(f"   Python: {sys.version.split(' ')[0]}")
print("========================================")

all_good = True
all_good &= check_import("numpy", "Numpy")
all_good &= check_import("ultralytics", "YOLO (Ultralytics)")
all_good &= check_import("boxmot", "BoxMOT (DeepOCSORT)")
all_good &= check_import("cv2", "OpenCV")
all_good &= check_import("mediapipe", "MediaPipe")
all_good &= check_import("supabase", "Supabase")
all_good &= check_import("flask", "Flask")
all_good &= check_import("requests", "Requests")

print("========================================")
if all_good:
    print("✨ SUCCESS: All core dependencies are present!")
else:
    print("🚨 FAILURE: Some dependencies are missing. Run:")
    print("   pip install -r requirements.txt")
print("========================================")
