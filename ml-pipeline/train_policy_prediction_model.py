"""
ML Prediction Engine Training Script
For District Explorer Policy Simulation

Based on the POLICY_SIMULATION_ENGINE_PLAN.md:
- Trains LightGBM regressor on 177 features
- Predicts composite development index
- Enables policy intervention simulation
- Exports model for backend API usage

Authors: Riya Gupta & Shreyansh Srivastav
Date: February 15, 2026
"""

import pandas as pd
import numpy as np
import pickle
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# ML libraries
try:
    import lightgbm as lgb
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
    import matplotlib.pyplot as plt
    import seaborn as sns
    ML_AVAILABLE = True
except ImportError as e:
    print(f"ERROR: Required ML libraries not installed: {e}")
    print("\nInstall with:")
    print("  pip install lightgbm scikit-learn matplotlib seaborn")
    ML_AVAILABLE = False
    exit(1)


class PolicyPredictionModelTrainer:
    """
    Train ML model to predict composite development index from raw features
    
    Purpose:
    - Enable policy simulation: "What if we add 10 schools to Mewat?"
    - Predict index change based on feature modifications
    - Support ROI analysis and impact assessment
    """
    
    def __init__(self, data_path='results/ml_training_data.csv', target_index='composite_index_equal'):
        """Initialize trainer
        
        Args:
            data_path: Path to ML training data CSV
            target_index: Which composite index to predict
                - 'composite_index_equal' (DEFAULT): Equal weights - RECOMMENDED BASELINE
                    * Removes expert bias
                    * Highly interpretable (simple average)
                    * Benchmark to measure if expert weighting helps
                    * Replicable and transparent
                - 'composite_index_sdg': SDG-aligned weights (Health 25%, Education 20%)
                - 'composite_index_expert': Haryana-specific (Agriculture 25%, Irrigation 20%)
                - 'composite_index_shap': ML-derived SHAP weights
                - 'composite_index_lasso': Lasso-regularized weights
                - 'composite_index_ensemble': Average of all methods
        """
        self.data_path = data_path
        self.target_index = target_index
        self.df = None
        self.feature_cols = []
        self.target_col = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.model = None
        self.model_metadata = {}
        
    def load_data(self):
        """Load ML training data (6,841 villages × 177 features)"""
        print("="*80)
        print("LOADING ML TRAINING DATA")
        print("="*80)
        
        self.df = pd.read_csv(self.data_path)
        print(f"✅ Loaded {len(self.df)} villages with {len(self.df.columns)} columns")
        
        # Identify feature columns (exclude metadata and target indices)
        metadata_cols = [
            'district_name', 'village_name', 
            'total_population_of_village', 'total_households',
            'total_male_population_of_village', 'total_female_population_of_village',
            'population_stratum'
        ]
        
        target_cols = [col for col in self.df.columns if 'index' in col.lower()]
        
        self.feature_cols = [
            col for col in self.df.columns 
            if col not in metadata_cols 
            and col not in target_cols
            and 'rank' not in col.lower()
        ]
        
        print(f"\n📊 Data Structure:")
        print(f"  - Metadata columns: {len(metadata_cols)}")
        print(f"  - Feature columns: {len(self.feature_cols)}")
        print(f"  - Target columns: {len(target_cols)}")
        
        # Use user-specified target (default: composite_index_equal for baseline)
        if self.target_index in self.df.columns:
            self.target_col = self.target_index
            target_descriptions = {
                'composite_index_equal': 'Equal weights (BASELINE - unbiased, interpretable)',
                'composite_index_sdg': 'SDG-aligned (Health 25%, Education 20%)',
                'composite_index_expert': 'Haryana-specific (Agriculture 25%, Irrigation 20%)',
                'composite_index_shap': 'ML-derived SHAP weights',
                'composite_index_lasso': 'Lasso-regularized weights',
                'composite_index_ensemble': 'Average of all weighting methods'
            }
            description = target_descriptions.get(self.target_index, 'Custom weights')
            print(f"\n🎯 Target: {self.target_index}")
            print(f"   Description: {description}")
        else:
            # Fallback: Try to calculate equal weights if possible
            sector_indices = [
                'agriculture_index', 'education_index', 'health_index',
                'infrastructure_index', 'irrigation_index', 'social_index'
            ]
            available_sectors = [col for col in sector_indices if col in self.df.columns]
            if available_sectors:
                self.df['composite_index_equal'] = self.df[available_sectors].mean(axis=1)
                self.target_col = 'composite_index_equal'
                print(f"\n🎯 Target: composite_index_equal (calculated from {len(available_sectors)} sectors)")
                print(f"   ⚠️  Specified target '{self.target_index}' not found - using equal weights fallback")
            else:
                raise ValueError(f"Target '{self.target_index}' not found and cannot calculate fallback!")
        
        print(f"\n📈 Target Statistics:")
        print(f"  - Mean: {self.df[self.target_col].mean():.2f}")
        print(f"  - Std: {self.df[self.target_col].std():.2f}")
        print(f"  - Min: {self.df[self.target_col].min():.2f}")
        print(f"  - Max: {self.df[self.target_col].max():.2f}")
        
        return self
    
    def prepare_features(self):
        """Prepare X (features) and y (target)"""
        print("\n" + "="*80)
        print("FEATURE ENGINEERING")
        print("="*80)
        
        # Extract features and target
        X = self.df[self.feature_cols].copy()
        y = self.df[self.target_col].copy()
        
        # Handle missing values in features
        print(f"\n🔍 Missing Value Analysis:")
        missing_count = X.isnull().sum().sum()
        if missing_count > 0:
            print(f"  - Total missing values in features: {missing_count:,}")
            print(f"  - Imputation strategy: Fill with 0 (absence of facility/feature)")
            X = X.fillna(0)
        else:
            print(f"  - No missing values in features detected")
        
        # Handle missing values in target (critical!)
        target_missing = y.isnull().sum()
        if target_missing > 0:
            print(f"  - Missing values in target: {target_missing}")
            print(f"  - Removing rows with missing target values...")
            valid_mask = ~y.isnull()
            X = X[valid_mask]
            y = y[valid_mask]
            print(f"  - Remaining samples: {len(y)}")
        
        # Check for infinite values
        inf_count = np.isinf(X.values).sum()
        if inf_count > 0:
            print(f"  - Infinite values found: {inf_count}")
            X = X.replace([np.inf, -np.inf], 0)
        
        # Feature statistics
        print(f"\n📊 Feature Statistics:")
        print(f"  - Total features: {len(self.feature_cols)}")
        print(f"  - Numeric features: {X.select_dtypes(include=[np.number]).shape[1]}")
        print(f"  - Feature value range: [{X.values.min():.2f}, {X.values.max():.2f}]")
        
        # Display sample features
        print(f"\n📋 Sample Features (first 15):")
        for i, col in enumerate(self.feature_cols[:15], 1):
            print(f"  {i:2d}. {col}")
        if len(self.feature_cols) > 15:
            print(f"  ... and {len(self.feature_cols) - 15} more")
        
        # Split data using spatial cross-validation (district-based)
        print(f"\n✂️  Train-Test Split Strategy:")
        print(f"  - Method: Spatial Cross-Validation (district-based)")
        print(f"  - Prevents data leakage from same district")
        
        districts = self.df['district_name'].unique()
        np.random.seed(42)
        np.random.shuffle(districts)
        
        # 80-20 split
        n_train = int(0.8 * len(districts))
        train_districts = districts[:n_train]
        test_districts = districts[n_train:]
        
        train_mask = self.df['district_name'].isin(train_districts)
        test_mask = self.df['district_name'].isin(test_districts)
        
        self.X_train = X[train_mask]
        self.X_test = X[test_mask]
        self.y_train = y[train_mask]
        self.y_test = y[test_mask]
        
        print(f"  - Training districts: {len(train_districts)} ({n_train/len(districts)*100:.1f}%)")
        print(f"  - Testing districts: {len(test_districts)} ({100-n_train/len(districts)*100:.1f}%)")
        print(f"  - Training villages: {len(self.X_train):,}")
        print(f"  - Testing villages: {len(self.X_test):,}")
        
        # Store metadata
        self.model_metadata['train_districts'] = train_districts.tolist()
        self.model_metadata['test_districts'] = test_districts.tolist()
        self.model_metadata['feature_cols'] = self.feature_cols
        self.model_metadata['target_col'] = self.target_col
        self.model_metadata['n_features'] = len(self.feature_cols)
        
        return self
    
    def train_model(self):
        """Train LightGBM model (Kenya KNBS 2022 methodology)"""
        print("\n" + "="*80)
        print("MODEL TRAINING - LightGBM Regressor")
        print("="*80)
        print("Based on Kenya KNBS 2022 Living Standards Index methodology")
        print("Expected R² > 0.85 (Kenya achieved 0.89 on 6,612 villages)")
        
        # LightGBM parameters (optimized for tabular data with many features)
        params = {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'max_depth': -1,
            'min_child_samples': 20,
            'reg_alpha': 0.1,
            'reg_lambda': 0.1,
            'verbose': -1,
            'random_state': 42,
        }
        
        print(f"\n⚙️  Hyperparameters:")
        for key, value in params.items():
            if key != 'verbose':
                print(f"  - {key}: {value}")
        
        # Create LightGBM datasets
        train_data = lgb.Dataset(
            self.X_train, 
            label=self.y_train,
            feature_name=self.feature_cols,
            categorical_feature='auto'
        )
        
        test_data = lgb.Dataset(
            self.X_test, 
            label=self.y_test,
            reference=train_data,
            feature_name=self.feature_cols
        )
        
        # Train with early stopping
        print(f"\n🚀 Training LightGBM model...")
        print(f"  - Early stopping: 50 rounds")
        print(f"  - Evaluation metric: RMSE")
        
        callbacks = [
            lgb.early_stopping(stopping_rounds=50, verbose=False),
            lgb.log_evaluation(period=100)
        ]
        
        self.model = lgb.train(
            params,
            train_data,
            num_boost_round=1000,
            valid_sets=[train_data, test_data],
            valid_names=['train', 'test'],
            callbacks=callbacks
        )
        
        # Store training metadata
        self.model_metadata['best_iteration'] = self.model.best_iteration
        self.model_metadata['params'] = params
        
        print(f"\n✅ Training completed!")
        print(f"  - Best iteration: {self.model.best_iteration}")
        print(f"  - Total boosting rounds: {self.model.current_iteration()}")
        
        return self
    
    def evaluate_model(self):
        """Evaluate model performance"""
        print("\n" + "="*80)
        print("MODEL EVALUATION")
        print("="*80)
        
        # Predictions
        y_train_pred = self.model.predict(self.X_train, num_iteration=self.model.best_iteration)
        y_test_pred = self.model.predict(self.X_test, num_iteration=self.model.best_iteration)
        
        # Metrics
        train_r2 = r2_score(self.y_train, y_train_pred)
        test_r2 = r2_score(self.y_test, y_test_pred)
        
        train_mae = mean_absolute_error(self.y_train, y_train_pred)
        test_mae = mean_absolute_error(self.y_test, y_test_pred)
        
        train_rmse = np.sqrt(mean_squared_error(self.y_train, y_train_pred))
        test_rmse = np.sqrt(mean_squared_error(self.y_test, y_test_pred))
        
        print(f"\n📊 Performance Metrics:")
        print(f"\n  Training Set:")
        print(f"    R² Score:  {train_r2:.4f}")
        print(f"    MAE:       {train_mae:.4f}")
        print(f"    RMSE:      {train_rmse:.4f}")
        
        print(f"\n  Test Set (Unseen Districts):")
        print(f"    R² Score:  {test_r2:.4f} {'✅ Excellent!' if test_r2 >= 0.85 else '⚠️ Below Kenya benchmark (0.89)'}")
        print(f"    MAE:       {test_mae:.4f}")
        print(f"    RMSE:      {test_rmse:.4f}")
        
        # Store metrics
        self.model_metadata['train_r2'] = float(train_r2)
        self.model_metadata['test_r2'] = float(test_r2)
        self.model_metadata['train_mae'] = float(train_mae)
        self.model_metadata['test_mae'] = float(test_mae)
        self.model_metadata['train_rmse'] = float(train_rmse)
        self.model_metadata['test_rmse'] = float(test_rmse)
        
        # Overfitting check
        overfit_gap = train_r2 - test_r2
        if overfit_gap < 0.05:
            print(f"\n  ✅ Generalization: Excellent (gap = {overfit_gap:.4f})")
        elif overfit_gap < 0.10:
            print(f"\n  ⚠️  Generalization: Good (gap = {overfit_gap:.4f})")
        else:
            print(f"\n  ❌ Generalization: Poor - overfitting detected (gap = {overfit_gap:.4f})")
        
        # Feature importance
        print(f"\n🔍 Top 20 Most Important Features:")
        importance_df = pd.DataFrame({
            'feature': self.feature_cols,
            'importance': self.model.feature_importance(importance_type='gain')
        }).sort_values('importance', ascending=False)
        
        for i, row in importance_df.head(20).iterrows():
            print(f"  {row.name+1:2d}. {row['feature']:50s} {row['importance']:>10.0f}")
        
        self.model_metadata['feature_importance'] = importance_df.to_dict('records')
        
        return self
    
    def save_model(self, output_dir='models'):
        """Save trained model and metadata"""
        print("\n" + "="*80)
        print("SAVING MODEL")
        print("="*80)
        
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        # Save LightGBM model
        model_path = f"{output_dir}/policy_prediction_model.pkl"
        with open(model_path, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'metadata': self.model_metadata
            }, f)
        print(f"✅ Model saved: {model_path}")
        
        # Save metadata as JSON for easy inspection
        import json
        metadata_path = f"{output_dir}/policy_prediction_model_metadata.json"
        # Remove large arrays from JSON
        json_metadata = {k: v for k, v in self.model_metadata.items() 
                        if k not in ['feature_importance', 'train_districts', 'test_districts']}
        json_metadata['feature_count'] = len(self.model_metadata['feature_cols'])
        json_metadata['train_district_count'] = len(self.model_metadata['train_districts'])
        json_metadata['test_district_count'] = len(self.model_metadata['test_districts'])
        
        with open(metadata_path, 'w') as f:
            json.dump(json_metadata, f, indent=2)
        print(f"✅ Metadata saved: {metadata_path}")
        
        # Save feature importance
        importance_path = f"{output_dir}/feature_importance.csv"
        importance_df = pd.DataFrame(self.model_metadata['feature_importance'])
        importance_df.to_csv(importance_path, index=False)
        print(f"✅ Feature importance saved: {importance_path}")
        
        # Create human-readable report
        report_path = f"{output_dir}/model_training_report.txt"
        with open(report_path, 'w') as f:
            f.write("POLICY PREDICTION MODEL - TRAINING REPORT\n")
            f.write("="*80 + "\n\n")
            f.write(f"Date: {pd.Timestamp.now()}\n")
            f.write(f"Model Type: LightGBM Regressor\n")
            f.write(f"Purpose: Policy intervention impact prediction\n\n")
            
            f.write("DATA SUMMARY:\n")
            f.write("-"*80 + "\n")
            f.write(f"Total villages: {len(self.df):,}\n")
            f.write(f"Training villages: {len(self.X_train):,}\n")
            f.write(f"Test villages: {len(self.X_test):,}\n")
            f.write(f"Features: {len(self.feature_cols)}\n")
            f.write(f"Target: {self.target_col}\n\n")
            
            f.write("MODEL PERFORMANCE:\n")
            f.write("-"*80 + "\n")
            f.write(f"Training R²:  {self.model_metadata['train_r2']:.4f}\n")
            f.write(f"Test R²:      {self.model_metadata['test_r2']:.4f}\n")
            f.write(f"Test MAE:     {self.model_metadata['test_mae']:.4f}\n")
            f.write(f"Test RMSE:    {self.model_metadata['test_rmse']:.4f}\n\n")
            
            f.write("USAGE EXAMPLE (Python):\n")
            f.write("-"*80 + "\n")
            f.write("""
import pickle
import pandas as pd

# Load model
with open('models/policy_prediction_model.pkl', 'rb') as f:
    model_data = pickle.load(f)
    model = model_data['model']
    metadata = model_data['metadata']

# Prepare features (must match training features)
features = metadata['feature_cols']

# Example: Predict current index
current_village_data = {...}  # Dict with all feature values
current_features = pd.DataFrame([current_village_data])[features].fillna(0)
baseline_index = model.predict(current_features)[0]

# Example: Predict after adding 5 schools
modified_data = current_village_data.copy()
modified_data['edu_total_pre_primary_school'] += 5
modified_features = pd.DataFrame([modified_data])[features].fillna(0)
new_index = model.predict(modified_features)[0]

# Calculate impact
delta = new_index - baseline_index
print(f"Impact: +{delta:.2f} index points")
""")
        
        print(f"✅ Training report saved: {report_path}")
        
        print(f"\n" + "="*80)
        print("✅ MODEL TRAINING COMPLETE!")
        print("="*80)
        print(f"\n📦 Saved Files:")
        print(f"  - Model: {model_path}")
        print(f"  - Metadata: {metadata_path}")
        print(f"  - Feature Importance: {importance_path}")
        print(f"  - Training Report: {report_path}")
        
        return self


def main():
    """Main training pipeline"""
    print("🚀 Policy Prediction Model Training")
    print("For District Explorer Policy Simulation Engine")
    print("\n💡 BASELINE MODEL: Using equal weights (unbiased, interpretable)")
    print("   To train on expert weights, change target_index to 'composite_index_sdg'\n")
    
    # BASELINE: Equal weights (no expert bias)
    trainer = PolicyPredictionModelTrainer(
        data_path='results/ml_training_data.csv',
        target_index='composite_index_equal'  # Recommended baseline
    )
    
    trainer.load_data()
    trainer.prepare_features()
    trainer.train_model()
    trainer.evaluate_model()
    trainer.save_model()
    
    print("\n📚 Next Steps:")
    print("  1. Review model performance in models/model_training_report.txt")
    print("  2. Integrate model into District Explorer backend (predict-index.py)")
    print("  3. Create policy simulation API endpoints")
    print("  4. Build frontend chatbot UI (PolicyChatbot.jsx)")
    print("\n  See: plan-policySimulationEngine.prompt.md for full implementation guide")


if __name__ == "__main__":
    main()
