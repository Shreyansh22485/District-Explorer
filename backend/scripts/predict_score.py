import os
import json
import argparse
import pickle
import sys
import warnings
import pandas as pd
import numpy as np

# Suppress sklearn/lightgbm warnings for cleaner stdout
warnings.filterwarnings("ignore")

def get_village_baseline(data_path, feature_cols, district="", village=""):
    if not os.path.exists(data_path):
        return pd.DataFrame([np.zeros(len(feature_cols))], columns=feature_cols)

    df = pd.read_csv(data_path, low_memory=False)
    available_cols = [c for c in feature_cols if c in df.columns]

    target_row = None
    if district and village:
        d_match = df['district_name'].str.lower().str.contains(district.lower(), na=False)
        v_match = df['village_name'].str.lower().str.contains(village.lower(), na=False)
        matched_df = df[d_match & v_match]
        if not matched_df.empty:
            target_row = matched_df.iloc[0]

    baseline = {}
    for col in feature_cols:
        if col in available_cols:
            if target_row is not None:
                try:
                    val = pd.to_numeric(target_row[col], errors='coerce')
                    baseline[col] = val if not pd.isna(val) else 0
                except:
                    baseline[col] = 0
            else:
                try:
                    median_val = pd.to_numeric(df[col], errors='coerce').median()
                    baseline[col] = median_val if not np.isnan(median_val) else 0
                except:
                    baseline[col] = 0
        else:
            baseline[col] = 0

    return pd.DataFrame([baseline], columns=feature_cols)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--deltas", type=str, required=True, help="JSON string of feature modifications")
    parser.add_argument("--model", type=str, default="composite_index_expert")
    parser.add_argument("--models-dir", type=str, default=os.path.join(os.path.dirname(__file__), "..", "..", "models"))
    parser.add_argument("--data-path", type=str, default=os.path.join(os.path.dirname(__file__), "..", "..", "results", "ml_training_data.csv"))
    parser.add_argument("--district", type=str, default="")
    parser.add_argument("--village", type=str, default="")
    args = parser.parse_args()

    try:
        deltas = json.loads(args.deltas)
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON format for deltas"}))
        sys.exit(1)

    model_path = os.path.join(args.models_dir, args.model, "model.pkl")
    metadata_path = os.path.join(args.models_dir, "policy_prediction_model_metadata.json")
    
    if not os.path.exists(model_path) or not os.path.exists(metadata_path):
        print(json.dumps({"error": f"Model or metadata not found at {args.models_dir}"}))
        sys.exit(1)

    # Load Model
    try:
        with open(model_path, "rb") as f:
            ml_model_data = pickle.load(f)
            ml_model = ml_model_data['model'] if isinstance(ml_model_data, dict) else ml_model_data
        
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
            
        feature_cols = metadata["feature_cols"]
    except Exception as e:
        print(json.dumps({"error": f"Failed to load model: {str(e)}"}))
        sys.exit(1)

    # Predict original
    baseline_df = get_village_baseline(args.data_path, feature_cols, district=args.district, village=args.village)
    original_score = float(ml_model.predict(baseline_df)[0])

    # Predict new
    modified_df = baseline_df.copy()
    for col, delta in deltas.items():
        if col in modified_df.columns:
            modified_df[col] = modified_df[col] + float(delta)
            if modified_df[col].iloc[0] < 0:
                modified_df[col] = 0

    new_score = float(ml_model.predict(modified_df)[0])

    # Output results
    result = {
        "original_score": original_score,
        "new_score": new_score,
        "change": new_score - original_score,
        "percent_change": ((new_score - original_score) / original_score) * 100 if original_score != 0 else 0
    }

    print(json.dumps(result))

if __name__ == "__main__":
    main()
