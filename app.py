import datetime
import joblib
import numpy as np
import pandas as pd
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI(
    title="India Drought Prediction API",
    description="API for predicting multi-horizon drought risks with nearby locations and trend analysis.",
    version="2.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. LOAD MODELS AT STARTUP
# ==========================================
MODELS = {}
horizons = ["current", "7_days", "15_days", "30_days", "60_days"]

print("Loading saved models into memory...")
for h in horizons:
    try:
        MODELS[h] = joblib.load(f"models/drought_model_{h}.joblib")
        print(f"Loaded: drought_model_{h}.joblib")
    except Exception as e:
        print(f"Error loading model {h}: {e}")

# Locations with predefined nearby monitoring stations
LOCATIONS_DATA = {
    "bengaluru": {
        "lat": 12.9716, "lon": 77.5946,
        "nearby": [
            {"name": "Tumakuru", "lat": 13.3423, "lon": 77.1013},
            {"name": "Mysuru", "lat": 12.2958, "lon": 76.6394},
            {"name": "Hosur", "lat": 12.7409, "lon": 77.8251}
        ]
    },
    "delhi": {
        "lat": 28.6139, "lon": 77.2090,
        "nearby": [
            {"name": "Gurugram", "lat": 28.4595, "lon": 77.0266},
            {"name": "Noida", "lat": 28.5355, "lon": 77.3910},
            {"name": "Faridabad", "lat": 28.4089, "lon": 77.3178}
        ]
    },
    "mumbai": {
        "lat": 18.9750, "lon": 72.8258,
        "nearby": [
            {"name": "Thane", "lat": 19.2183, "lon": 72.9781},
            {"name": "Pune", "lat": 18.5204, "lon": 73.8567},
            {"name": "Nashik", "lat": 20.0059, "lon": 73.7898}
        ]
    },
    "chennai": {
        "lat": 13.0827, "lon": 80.2707,
        "nearby": [
            {"name": "Kanchipuram", "lat": 12.8342, "lon": 79.7036},
            {"name": "Vellore", "lat": 12.9165, "lon": 79.1325},
            {"name": "Chengalpattu", "lat": 12.6819, "lon": 79.9717}
        ]
    },
    "jaipur": {
        "lat": 26.9124, "lon": 75.7873,
        "nearby": [
            {"name": "Ajmer", "lat": 26.4499, "lon": 74.6399},
            {"name": "Alwar", "lat": 27.5530, "lon": 76.6346},
            {"name": "Sikar", "lat": 27.6094, "lon": 75.1398}
        ]
    }
}

risk_mapping = {
    0: {"level": "Low Risk", "description": "Normal moisture and rainfall levels.", "color": "#10b981"},
    1: {"level": "Moderate Risk", "description": "Mild soil dryness or low rainfall observed.", "color": "#f59e0b"},
    2: {"level": "High Risk", "description": "Severe drought conditions and depleted root-zone soil.", "color": "#ef4444"}
}

class PredictionRequest(BaseModel):
    location_name: str

def fetch_and_predict(lat, lon):
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=35)
    
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}"
        f"&start_date={start_date}&end_date={end_date}"
        "&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,temperature_2m_mean,soil_moisture_0_to_7cm_mean"
    )
    
    response = requests.get(url)
    data = response.json()
    daily = data.get("daily", {})
    
    dates = daily.get("time", [])
    precip = daily.get("precipitation_sum", [])
    soil = daily.get("soil_moisture_0_to_7cm_mean", [])
    temp = daily.get("temperature_2m_mean", [])
    
    df = pd.DataFrame({
        "PRECTOTCORR": precip,
        "T2M": temp,
        "T2M_MAX": daily.get("temperature_2m_max", []),
        "T2M_MIN": daily.get("temperature_2m_min", []),
        "GWETROOT": soil
    })
    
    if df.empty or len(df) < 30:
        raise HTTPException(status_code=500, detail="Insufficient weather data retrieved from API.")
        
    df["rain_7d_sum"] = df["PRECTOTCORR"].rolling(7, min_periods=1).sum()
    df["rain_30d_sum"] = df["PRECTOTCORR"].rolling(30, min_periods=1).sum()
    df["temp_7d_avg"] = df["T2M"].rolling(7, min_periods=1).mean()
    df["soil_7d_avg"] = df["GWETROOT"].rolling(7, min_periods=1).mean()
    
    feature_cols = [
        "PRECTOTCORR", "T2M", "T2M_MAX", "T2M_MIN", "GWETROOT",
        "rain_7d_sum", "rain_30d_sum", "temp_7d_avg", "soil_7d_avg"
    ]
    latest_features = df[feature_cols].iloc[[-1]]
    
    results = {}
    for h_key, model in MODELS.items():
        pred_label = int(model.predict(latest_features)[0])
        results[h_key] = risk_mapping[pred_label]
        
    return {
        "predictions": results,
        "trend_data": {
            "dates": dates[-30:],
            "soil_moisture": soil[-30:],
            "precipitation": precip[-30:]
        }
    }

# ==========================================
# 2. API ENDPOINTS
# ==========================================
@app.post("/predict")
def predict_drought(request: PredictionRequest):
    loc_key = request.location_name.strip().lower()
    if loc_key not in LOCATIONS_DATA:
        raise HTTPException(status_code=400, detail=f"Location not found. Choose from: {list(LOCATIONS_DATA.keys())}")
    
    loc_info = LOCATIONS_DATA[loc_key]
    
    # Main prediction & historical trend
    main_res = fetch_and_predict(loc_info["lat"], loc_info["lon"])
    
    # Nearby locations predictions
    nearby_results = []
    for nb in loc_info["nearby"]:
        try:
            nb_res = fetch_and_predict(nb["lat"], nb["lon"])
            nearby_results.append({
                "name": nb["name"],
                "latitude": nb["lat"],
                "longitude": nb["lon"],
                "predictions": nb_res["predictions"]
            })
        except Exception:
            pass
            
    return {
        "location": request.location_name.capitalize(),
        "latitude": loc_info["lat"],
        "longitude": loc_info["lon"],
        "predictions": main_res["predictions"],
        "trend_data": main_res["trend_data"],
        "nearby_predictions": nearby_results
    }

@app.get("/locations")
def get_locations():
    return list(LOCATIONS_DATA.keys())

@app.get("/")
def home():
    return {"message": "Drought Prediction API v2.0 is running!"}