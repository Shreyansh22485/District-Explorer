import os
import json
import argparse
import pickle
import pandas as pd
import numpy as np
import google.generativeai as genai
from dotenv import load_dotenv

def load_environment():
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), 'district-explorer', 'backend', '.env'))
    except ImportError:
        pass
    
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("ERROR: GOOGLE_API_KEY environment variable not found.")
        print("Please ensure it is set in district-explorer/backend/.env")
        exit(1)
    
    genai.configure(api_key=api_key)
    return api_key

def get_gemini_model():
    # Use flash model to avoid quota limits
    return genai.GenerativeModel(' ')

def parse_user_intent_to_features(user_text, feature_cols):
    """
    Uses Gemini to map a natural language policy text into specific feature numeric changes.
    """
    model = get_gemini_model()
    
    prompt = f"""
    You are an expert data mapping assistant for a rural development ML model.
    The user is proposing a policy change or scenario in natural language.
    Your task is to map their text into precise numerical modifications (deltas) for corresponding dataset columns.
    
    User Query: "{user_text}"
    
    Available Features in the Dataset (select ONLY from these):
    {json.dumps(feature_cols, indent=2)}
    
    Instructions:
    1. Identify the features that match the user's intent.
    2. Determine the numerical change (e.g., "add 2 schools" -> +2). If they say "reduce", it's negative.
    3. Return ONLY a valid JSON object where keys are exact feature names from the list above, and values are the numerical deltas.
    4. Do not include markdown formatting or commentary. Just raw JSON.
    5. Be careful with boolean columns vs count columns. 
    
    Example output format:
    {{
        "edu_total_pre_primary_school": 2,
        "health_hospital_allopathic__numbers_": 1
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.replace('```json', '').replace('```', '').strip()
        modifications = json.loads(text)
        
        # Verify columns exist
        valid_mods = {}
        for k, v in modifications.items():
            if k in feature_cols:
                valid_mods[k] = float(v)
            else:
                print(f"Warning: Gemini suggested invalid column '{k}'. Discarding.")
                
        return valid_mods
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        return {}

def analyze_prediction_with_gemini(user_text, modifications, original_score, new_score, target_model_name):
    """
    Uses Gemini to explain the predicted change in human-readable terms.
    """
    model = get_gemini_model()
    
    delta = new_score - original_score
    percent_change = (delta / original_score) * 100 if original_score != 0 else 0
    
    prompt = f"""
    You are an AI policy advisor for rural development.
    The user proposed this scenario: "{user_text}"
    
    We mapped this to the following data changes: {json.dumps(modifications)}
    
    Our Machine Learning model (configured to target "{target_model_name}") evaluated this on a median village profile.
    Original Development Index Score: {original_score:.4f}
    New Predicted Score: {new_score:.4f}
    Difference: {delta:+.4f} ({percent_change:+.2f}%)
    
    Task:
    Write a clear, professional, yet understandable 1-2 paragraph summary interpreting these results.
    - Explain if the policy change leads to a positive or negative impact on the overall development index.
    - Contextualize the size of the impact (is it marginal or significant?).
    - Provide a brief recommendation based on whether this seems like an effective intervention.
    
    Do not use complex ML jargon, focus on the real-world implications of the index shift.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error generating analysis: {e}"

def get_median_village_baseline(data_path, feature_cols):
    """
    Loads data and returns a median baseline vector.
    """
    if not os.path.exists(data_path):
        print(f"Warning: Data path {data_path} not found. Falling back to zeros baseline.")
        return pd.DataFrame([np.zeros(len(feature_cols))], columns=feature_cols)
        
    df = pd.read_csv(data_path, low_memory=False)
    # Filter available columns
    available_cols = [c for c in feature_cols if c in df.columns]
    
    # Fill remaining with 0
    baseline = {}
    for col in feature_cols:
        if col in available_cols:
            # Get median of numeric column
            try:
                median_val = pd.to_numeric(df[col], errors='coerce').median()
                baseline[col] = median_val if not np.isnan(median_val) else 0
            except:
                baseline[col] = 0
        else:
            baseline[col] = 0
            
    return pd.DataFrame([baseline])

def main():
    parser = argparse.ArgumentParser(description="Gemini-based Policy Simulator")
    parser.add_argument("--query", type=str, required=True, help="Natural language policy text")
    parser.add_argument("--model", type=str, default="composite_index_expert", 
                        help="Which trained model to use")
    parser.add_argument("--json", action="store_true", help="Output only JSON")
    parser.add_argument("--models-dir", type=str, default=os.path.join(os.path.dirname(__file__), "..", "..", "..", "models"), help="Path to models directory")
    parser.add_argument("--results-dir", type=str, default=os.path.join(os.path.dirname(__file__), "..", "..", "..", "results"), help="Path to results directory")
    
    args = parser.parse_args()
    query = args.query
    model_dir = args.model
    use_json = args.json
    
    load_environment()
    
    model_path = os.path.join(args.models_dir, model_dir, "model.pkl")
    metadata_path = os.path.join(args.models_dir, "policy_prediction_model_metadata.json")
    data_path = os.path.join(args.results_dir, "ml_training_data.csv")
    
    if not os.path.exists(model_path):
        print(f"Model path {model_path} does not exist.")
        exit(1)
        
    if not os.path.exists(metadata_path):
        print(f"Metadata path {metadata_path} does not exist.")
        exit(1)
        
    # Load ML Model
    if not use_json:
        print(f"\n[1] Loading ML model: {model_dir}")
    with open(model_path, "rb") as f:
        ml_model_data = pickle.load(f)
        ml_model = ml_model_data['model'] if isinstance(ml_model_data, dict) else ml_model_data
        
    # Load feature metadata
    with open(metadata_path, "r") as f:
        metadata = json.load(f)
    feature_cols = metadata["feature_cols"]
    
    # Phase 1: Gemini parses text to data modifications
    if not use_json:
        print(f"\n[2] Asking Gemini to map intent: '{query}'")
    modifications = parse_user_intent_to_features(query, feature_cols)
    
    if not modifications:
        if use_json:
            print(json.dumps({"error": "Failed to map any valid features."}))
        else:
            print("Failed to map any valid features. Exiting.")
            print("Try ensuring your query refers to known facilities (e.g. schools, roads, water, hospitals).")
        exit(1)
        
    if not use_json:
        print(f"✅ Gemini translated text to metrics:\n{json.dumps(modifications, indent=2)}")
    
    # Phase 2: Predict with ML model
    if not use_json:
        print("\n[3] Simulating policy impact using ML model...")
    baseline_df = get_median_village_baseline(data_path, feature_cols)
    
    # Predict original
    original_score = ml_model.predict(baseline_df)[0]
    
    # Apply modifications
    modified_df = baseline_df.copy()
    for col, delta in modifications.items():
        modified_df[col] = modified_df[col] + delta
        # Prevent negative counts
        if modified_df[col].iloc[0] < 0:
             modified_df[col] = 0
             
    # Predict new
    new_score = ml_model.predict(modified_df)[0]
    
    if not use_json:
        print(f"Original Index Score: {original_score:.4f}")
        print(f"New Index Score:      {new_score:.4f}")
        print(f"Score Change:         {new_score - original_score:+.4f}")
    
    # Phase 3: Gemini interprets the results
    if not use_json:
        print("\n[4] Asking Gemini to analyze the results...")
    analysis = analyze_prediction_with_gemini(query, modifications, original_score, new_score, model_dir)
    
    if use_json:
        result_payload = {
            "query": query,
            "mapped_modifications": modifications,
            "original_score": float(original_score),
            "new_score": float(new_score),
            "change": float(new_score - original_score),
            "percent_change": float(((new_score - original_score) / original_score) * 100) if original_score != 0 else 0,
            "analysis": analysis,
            "model_used": model_dir
        }
        print(json.dumps(result_payload))
    else:
        print("\n" + "="*50)
        print("📊 AI POLICY ANALYSIS REPORT")
        print("="*50)
        print(analysis)
        print("="*50)

if __name__ == "__main__":
    main()
