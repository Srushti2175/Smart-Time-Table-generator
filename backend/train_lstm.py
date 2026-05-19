import os
import pickle
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.ensemble import RandomForestRegressor

# 1. SETUP PATHS
OUTPUT_DIR = os.path.join("..", "Final_Outputs")
CSV_PATH = os.path.join(os.path.dirname(__file__), "training_data.csv")
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# Map string slots to numbers for the model
SLOT_MAP = {
    "9-10 AM": 1, "10-11 AM": 2, "11-12 PM": 3, 
    "1-2 PM": 4, "2-3 PM": 5, "3-4 PM": 6, "4-5 PM": 7
}

HARD_LIST = ["DS", "COA", "AI", "ML", "TOC", "CD", "BDA", "DBMS", "CN", "OS", "MATHEMATICS"]

# 2. LOAD DATA
if os.path.exists(CSV_PATH):
    print("✅ Training on REAL generated data...")
    df = pd.read_csv(CSV_PATH)
    df.columns = [c.lower() for c in df.columns]
    # FIX: Convert string slots to integers to prevent comparison error
    df['slot'] = df['slot'].apply(lambda x: SLOT_MAP.get(str(x).strip(), 1))
    
    def calculate_quality(row):
        score = 0.5
        subj = str(row['subject']).upper()
        if any(h in subj for h in HARD_LIST) and row['slot'] <= 4:
            score += 0.4
        return score
    df['score'] = df.apply(calculate_quality, axis=1)
else:
    print("⚠️ Synthetic training for baseline...")
    data = []
    for _ in range(3000):
        slot = np.random.randint(1, 8)
        score = 0.9 if slot <= 3 else 0.4
        data.append(["Mon", slot, "AI", "Dr. Jain", "Room 101", "Div A", score])
    df = pd.DataFrame(data, columns=["day", "slot", "subject", "teacher", "room", "division", "score"])

# 3. ENCODING & FEATURES
encoders = {}
for col in ["subject", "teacher", "room", "division", "day"]:
    le = LabelEncoder()
    df[col] = df[col].astype(str).str.upper()
    df[col + "_enc"] = le.fit_transform(df[col])
    encoders[col.capitalize()] = le

with open(os.path.join(OUTPUT_DIR, "lstm_encoders.pkl"), "wb") as f:
    pickle.dump(encoders, f)

df['is_morning'] = df['slot'].apply(lambda x: 1 if x <= 4 else 0)
for c in ["is_afternoon","is_evening","is_lab","is_theory","is_consec","is_hard","fac_daily","fac_weekly","class_enc","sem_enc","fac_clash","room_clash"]:
    df[c] = 0

feature_cols = [
    "day_enc", "slot", "is_morning", "is_afternoon", "is_evening",
    "is_lab", "is_theory", "is_consec", "subject_enc", "is_hard",
    "teacher_enc", "fac_daily", "fac_weekly", "room_enc",
    "class_enc", "sem_enc", "division_enc", "fac_clash", "room_clash"
]

X = df[feature_cols].values
scaler = MinMaxScaler()
scaled_X = scaler.fit_transform(X)
with open(os.path.join(OUTPUT_DIR, "lstm_scaler.pkl"), "wb") as f:
    pickle.dump(scaler, f)

# 4. TRAIN MODEL
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(scaled_X, df["score"].values)
with open(os.path.join(OUTPUT_DIR, "lstm_model.pkl"), "wb") as f:
    pickle.dump(model, f)
print("✅ LSTM Model Saved Successfully.")