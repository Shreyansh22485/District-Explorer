"""
Train All Composite Index Models and Compare Performance

Trains 6 different models on different composite indices:
1. composite_index_equal (Baseline - equal weights)
2. composite_index_sdg (SDG-aligned weights)
3. composite_index_expert (Haryana-specific weights)
4. composite_index_shap (ML-derived SHAP weights)
5. composite_index_lasso (Lasso-regularized weights)
6. composite_index_ensemble (Average of all methods)

Authors: Riya Gupta & Shreyansh Srivastav
Date: February 22, 2026
"""

import pandas as pd
import numpy as np
import pickle
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')
import time
from datetime import datetime

# Import the trainer class
from train_policy_prediction_model import PolicyPredictionModelTrainer


def train_single_model(target_index, verbose=False):
    """
    Train a single model on specified target index
    
    Args:
        target_index: Name of composite index to use as target
        verbose: Whether to print detailed training logs
    
    Returns:
        dict: Model performance metrics
    """
    print(f"\n{'='*80}")
    print(f"TRAINING MODEL: {target_index}")
    print(f"{'='*80}")
    
    start_time = time.time()
    
    try:
        # Initialize trainer
        trainer = PolicyPredictionModelTrainer(
            data_path='results/ml_training_data.csv',
            target_index=target_index
        )
        
        # Train pipeline
        trainer.load_data()
        trainer.prepare_features()
        trainer.train_model()
        trainer.evaluate_model()
        
        # Save model with unique name
        model_dir = Path('models') / target_index
        model_dir.mkdir(parents=True, exist_ok=True)
        
        model_path = model_dir / 'model.pkl'
        with open(model_path, 'wb') as f:
            pickle.dump({
                'model': trainer.model,
                'metadata': trainer.model_metadata,
                'feature_cols': trainer.feature_cols,
                'target_col': trainer.target_col,
                'trained_at': datetime.now().isoformat(),
                'target_index': target_index
            }, f)
        
        # Save feature importance (LightGBM Booster uses feature_importance not feature_importances_)
        importance_df = pd.DataFrame({
            'feature': trainer.feature_cols,
            'importance': trainer.model.feature_importance()
        }).sort_values('importance', ascending=False)
        
        importance_path = model_dir / 'feature_importance.csv'
        importance_df.to_csv(importance_path, index=False)
        
        # Extract metrics
        training_time = time.time() - start_time
        
        # Handle cv_scores if available
        cv_r2_mean = trainer.model_metadata.get('cv_scores', {}).get('mean', None)
        cv_r2_std = trainer.model_metadata.get('cv_scores', {}).get('std', None)
        
        target_mean = trainer.df[target_index].mean() if target_index in trainer.df.columns else None
        target_std = trainer.df[target_index].std() if target_index in trainer.df.columns else None
        
        metrics = {
            'target_index': target_index,
            'r2_score': trainer.model_metadata['test_r2'],
            'mae': trainer.model_metadata['test_mae'],
            'rmse': trainer.model_metadata['test_rmse'],
            'train_r2': trainer.model_metadata['train_r2'],
            'cv_r2_mean': cv_r2_mean,
            'cv_r2_std': cv_r2_std,
            'n_train': len(trainer.X_train),
            'n_test': len(trainer.X_test),
            'n_features': len(trainer.feature_cols),
            'training_time_seconds': training_time,
            'model_path': str(model_path),
            'target_mean': target_mean,
            'target_std': target_std,
            'top_5_features': importance_df.head(5)['feature'].tolist()
        }
        
        print(f"\n✅ SUCCESS: {target_index}")
        print(f"   R² Score: {metrics['r2_score']:.4f}")
        print(f"   MAE: {metrics['mae']:.4f}")
        print(f"   RMSE: {metrics['rmse']:.4f}")
        print(f"   Training time: {training_time:.1f}s")
        
        return metrics
        
    except Exception as e:
        print(f"\n❌ FAILED: {target_index}")
        print(f"   Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'target_index': target_index,
            'r2_score': None,
            'mae': None,
            'rmse': None,
            'error': str(e)
        }


def compare_models(results):
    """
    Generate comprehensive comparison report
    
    Args:
        results: List of metric dictionaries from each model
    """
    print("\n" + "="*80)
    print("MODEL COMPARISON REPORT")
    print("="*80)
    print(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total Models Trained: {len(results)}")
    
    # Filter successful models
    successful = [r for r in results if r['r2_score'] is not None]
    failed = [r for r in results if r['r2_score'] is None]
    
    if failed:
        print(f"\n⚠️  Failed Models: {len(failed)}")
        for f in failed:
            print(f"   - {f['target_index']}: {f.get('error', 'Unknown error')}")
    
    if not successful:
        print("\n❌ No successful models to compare!")
        return
    
    # Create comparison DataFrame
    df_compare = pd.DataFrame(successful)
    
    # Sort by R² score (descending)
    df_compare = df_compare.sort_values('r2_score', ascending=False)
    
    print("\n" + "="*80)
    print("PERFORMANCE RANKING (by R² Score)")
    print("="*80)
    
    print(f"\n{'Rank':<6} {'Target Index':<30} {'R²':<10} {'MAE':<10} {'RMSE':<10} {'Time(s)':<10}")
    print("-" * 86)
    
    for i, row in df_compare.iterrows():
        rank = df_compare.index.tolist().index(i) + 1
        print(f"{rank:<6} {row['target_index']:<30} {row['r2_score']:<10.4f} "
              f"{row['mae']:<10.4f} {row['rmse']:<10.4f} {row['training_time_seconds']:<10.1f}")
    
    # Best model analysis
    best_model = df_compare.iloc[0]
    print(f"\n{'='*80}")
    print("🏆 BEST MODEL")
    print("="*80)
    print(f"Target Index: {best_model['target_index']}")
    print(f"R² Score: {best_model['r2_score']:.4f} (explains {best_model['r2_score']*100:.2f}% of variance)")
    print(f"MAE: {best_model['mae']:.4f} index points")
    print(f"RMSE: {best_model['rmse']:.4f} index points")
    if best_model.get('cv_r2_mean') is not None:
        print(f"Cross-validation R²: {best_model['cv_r2_mean']:.4f} ± {best_model['cv_r2_std']:.4f}")
    print(f"\nTop 5 Important Features:")
    for i, feat in enumerate(best_model['top_5_features'], 1):
        print(f"  {i}. {feat}")
    
    # Model comparison insights
    print(f"\n{'='*80}")
    print("INSIGHTS")
    print("="*80)
    
    # Best vs baseline
    baseline = df_compare[df_compare['target_index'] == 'composite_index_equal']
    if len(baseline) > 0:
        baseline_r2 = baseline.iloc[0]['r2_score']
        best_r2 = best_model['r2_score']
        improvement = ((best_r2 - baseline_r2) / baseline_r2) * 100
        
        print(f"\n1. Baseline vs Best Model:")
        print(f"   - Baseline (Equal Weights) R²: {baseline_r2:.4f}")
        print(f"   - Best Model ({best_model['target_index']}) R²: {best_r2:.4f}")
        
        if improvement > 1:
            print(f"   - Improvement: +{improvement:.2f}% over baseline")
            print(f"   ✅ Expert/ML weighting improves predictions!")
        elif improvement < -1:
            print(f"   - Change: {improvement:.2f}% vs baseline")
            print(f"   ⚠️  Baseline performs better - keep it simple!")
        else:
            print(f"   - Change: {improvement:.2f}% vs baseline")
            print(f"   ℹ️  Negligible difference - equal weights sufficient!")
    
    # Variance in performance
    r2_scores = df_compare['r2_score'].values
    print(f"\n2. Model Consistency:")
    print(f"   - R² Range: [{r2_scores.min():.4f}, {r2_scores.max():.4f}]")
    print(f"   - R² Std Dev: {r2_scores.std():.4f}")
    
    if r2_scores.std() < 0.02:
        print(f"   ✅ All models perform similarly - target choice matters less for prediction")
    else:
        print(f"   ⚠️  Significant variation - target choice impacts model quality")
    
    # Speed analysis
    print(f"\n3. Training Efficiency:")
    fastest = df_compare.loc[df_compare['training_time_seconds'].idxmin()]
    print(f"   - Fastest: {fastest['target_index']} ({fastest['training_time_seconds']:.1f}s)")
    print(f"   - Average: {df_compare['training_time_seconds'].mean():.1f}s")
    
    # Recommendation
    print(f"\n{'='*80}")
    print("RECOMMENDATION")
    print("="*80)
    
    if best_model['target_index'] == 'composite_index_equal':
        print("\n✅ Use BASELINE (composite_index_equal):")
        print("   - Best or near-best performance")
        print("   - Most interpretable for stakeholders")
        print("   - No expert bias - pure data-driven")
        print("   - Easy to explain and replicate")
    elif best_model['target_index'] == 'composite_index_ensemble':
        print("\n✅ Use ENSEMBLE (composite_index_ensemble):")
        print("   - Best predictive performance")
        print("   - Combines multiple expert perspectives")
        print("   - Robust to individual weighting biases")
        print("   - Good for production deployment")
    elif best_model['target_index'] == 'composite_index_sdg':
        print("\n✅ Use SDG-ALIGNED (composite_index_sdg):")
        print("   - Best predictive performance")
        print("   - Internationally recognized framework")
        print("   - Aligned with NITI Aayog priorities")
        print("   - Good for policy communication")
    else:
        print(f"\n✅ Use {best_model['target_index'].upper()}:")
        print(f"   - Best R² score: {best_model['r2_score']:.4f}")
        print(f"   - Consider interpretability vs accuracy trade-off")
    
    # Save comparison report
    report_dir = Path('models/comparison')
    report_dir.mkdir(parents=True, exist_ok=True)
    
    # Save CSV
    csv_path = report_dir / 'model_comparison.csv'
    df_compare.to_csv(csv_path, index=False)
    print(f"\n📊 Comparison saved: {csv_path}")
    
    # Save detailed report
    report_path = report_dir / 'comparison_report.txt'
    with open(report_path, 'w') as f:
        f.write("MODEL COMPARISON REPORT\n")
        f.write("="*80 + "\n\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total Models: {len(successful)}\n\n")
        
        f.write("PERFORMANCE RANKING\n")
        f.write("-"*80 + "\n")
        f.write(f"{'Rank':<6} {'Target Index':<30} {'R²':<10} {'MAE':<10} {'RMSE':<10}\n")
        f.write("-"*80 + "\n")
        
        for idx, (i, row) in enumerate(df_compare.iterrows(), 1):
            f.write(f"{idx:<6} {row['target_index']:<30} {row['r2_score']:<10.4f} "
                   f"{row['mae']:<10.4f} {row['rmse']:<10.4f}\n")
        
        f.write(f"\n\nBEST MODEL: {best_model['target_index']}\n")
        f.write(f"R² Score: {best_model['r2_score']:.4f}\n")
        f.write(f"MAE: {best_model['mae']:.4f}\n")
        f.write(f"RMSE: {best_model['rmse']:.4f}\n")
        f.write(f"CV R²: {best_model['cv_r2_mean']:.4f} ± {best_model['cv_r2_std']:.4f}\n")
        
        f.write(f"\nTop 5 Features:\n")
        for i, feat in enumerate(best_model['top_5_features'], 1):
            f.write(f"  {i}. {feat}\n")
    
    print(f"📄 Detailed report: {report_path}")


def main():
    """Train all models and compare"""
    print("="*80)
    print("COMPREHENSIVE MODEL COMPARISON")
    print("="*80)
    print("Training 6 composite index models and comparing performance\n")
    
    # Define all target indices
    target_indices = [
        'composite_index_equal',      # Baseline: Equal weights
        'composite_index_sdg',        # SDG-aligned
        'composite_index_expert',     # Haryana-specific
        'composite_index_shap',       # ML-derived SHAP
        'composite_index_lasso',      # Lasso-regularized
        'composite_index_ensemble'    # Ensemble average
    ]
    
    print("Models to train:")
    for i, idx in enumerate(target_indices, 1):
        print(f"  {i}. {idx}")
    
    print(f"\nEstimated time: ~{len(target_indices) * 2}-{len(target_indices) * 5} minutes\n")
    
    # Train all models
    results = []
    for target_idx in target_indices:
        metrics = train_single_model(target_idx, verbose=False)
        results.append(metrics)
    
    # Compare results
    compare_models(results)
    
    print("\n" + "="*80)
    print("✅ ALL MODELS TRAINED AND COMPARED!")
    print("="*80)
    print("\n📂 Results Location:")
    print("  - Models: models/<target_index>/model.pkl")
    print("  - Feature importance: models/<target_index>/feature_importance.csv")
    print("  - Comparison: models/comparison/model_comparison.csv")
    print("  - Report: models/comparison/comparison_report.txt")


if __name__ == "__main__":
    main()
