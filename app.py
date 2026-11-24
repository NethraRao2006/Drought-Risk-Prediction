import datetime
import joblib
import numpy as np
import pandas as pd
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="India Drought Prediction API",
    description="API for predicting multi-horizon drought risks using Random Forest models.",
    version="2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load all 5 models
MODELS = {}
horizons = ["current", "7_days", "15_days", "30_days", "60_days"]

print("Loading saved models into memory...")
for h in horizons:
    try:
        MODELS[h] = joblib.load(f"models/drought_model_{h}.joblib")
        print(f"Loaded: drought_model_{h}.joblib")
    except Exception as e:
        print(f"Error loading model {h}: {e}")

# Exact study regions with coordinates
LOCATION_COORDS = {
    "Latur_Marathwada_High": {"lat": 18.40, "lon": 76.57},
    "Anantapur_Rayalaseema_High": {"lat": 14.68, "lon": 77.60},
    "Varanasi_UP_Moderate": {"lat": 25.33, "lon": 83.00},
    "Bengaluru_KA_Moderate": {"lat": 12.97, "lon": 77.59},
    "Dakshina_Kannada_Low": {"lat": 12.87, "lon": 74.88}
}

class PredictionRequest(BaseModel):
    location_name: str
    latitude: float | None = None
    longitude: float | None = None

risk_mapping = {
    0: {"level": "Low Risk", "description": "Normal moisture and rainfall levels."},
    1: {"level": "Moderate Risk", "description": "Mild soil dryness or low rainfall observed."},
    2: {"level": "High Risk", "description": "Severe drought conditions and depleted root-zone soil."}
}

@app.post("/predict")
def predict_drought(request: PredictionRequest):
    loc_key = request.location_name.strip()
    
    if loc_key not in LOCATION_COORDS:
        raise HTTPException(
            status_code=400, 
            detail=f"Location '{request.location_name}' not found."
        )
    
    lat = LOCATION_COORDS[loc_key]["lat"]
    lon = LOCATION_COORDS[loc_key]["lon"]
    
    # Fetch last 35 days of weather data
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=35)
    
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}"
        f"&start_date={start_date}&end_date={end_date}"
        "&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,temperature_2m_mean,soil_moisture_0_to_7cm_mean"
    )
    
    try:
        response = requests.get(url)
        data = response.json()
        
        daily = data.get("daily", {})
        df = pd.DataFrame({
            "PRECTOTCORR": daily.get("precipitation_sum", []),
            "T2M": daily.get("temperature_2m_mean", []),
            "T2M_MAX": daily.get("temperature_2m_max", []),
            "T2M_MIN": daily.get("temperature_2m_min", []),
            "GWETROOT": daily.get("soil_moisture_0_to_7cm_mean", [])
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch weather data: {str(e)}")
    
    if df.empty or len(df) < 30:
        raise HTTPException(status_code=500, detail="Insufficient weather data retrieved.")
    
    # Compute rolling features
    df["rain_7d_sum"] = df["PRECTOTCORR"].rolling(7, min_periods=1).sum()
    df["rain_30d_sum"] = df["PRECTOTCORR"].rolling(30, min_periods=1).sum()
    df["temp_7d_avg"] = df["T2M"].rolling(7, min_periods=1).mean()
    df["soil_7d_avg"] = df["GWETROOT"].rolling(7, min_periods=1).mean()
    
    feature_cols = [
        "PRECTOTCORR", "T2M", "T2M_MAX", "T2M_MIN", "GWETROOT",
        "rain_7d_sum", "rain_30d_sum", "temp_7d_avg", "soil_7d_avg"
    ]
    latest_row = df.iloc[[-1]]
    latest_features = latest_row[feature_cols]
    
    # Predictions across horizons
    results = {}
    for h_key, model in MODELS.items():
        pred_label = int(model.predict(latest_features)[0])
        results[h_key] = risk_mapping[pred_label]
        
    return {
        "location": request.location_name,
        "latitude": lat,
        "longitude": lon,
        "current_parameters": {
            "precipitation": round(float(latest_row["PRECTOTCORR"].values[0]), 2),
            "temperature_mean": round(float(latest_row["T2M"].values[0]), 2),
            "temperature_max": round(float(latest_row["T2M_MAX"].values[0]), 2),
            "temperature_min": round(float(latest_row["T2M_MIN"].values[0]), 2),
            "soil_moisture": round(float(latest_row["GWETROOT"].values[0]), 3),
            "rain_7d_sum": round(float(latest_row["rain_7d_sum"].values[0]), 2),
            "rain_30d_sum": round(float(latest_row["rain_30d_sum"].values[0]), 2)
        },
        "predictions": results
    }

@app.get("/")
def home():
    return {"message": "Drought Prediction API is running!"}