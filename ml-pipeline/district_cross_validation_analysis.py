"""
Advanced Index Analysis
Deliverables:
1. Linear Regression & Random Forest with R values (not just R²)
2. Impact analysis of all factors on Infrastructure Index
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.model_selection import KFold
import warnings
warnings.filterwarnings('ignore')


class DistrictCrossValidationAnalyzer:
    """Analyze indices with district-based cross-validation"""
    
    def __init__(self, data_path='results/village_indices_complete.csv'):
        print("="*80)
        print("DISTRICT-BASED CROSS-VALIDATION ANALYSIS")
        print("="*80)
        
        self.df = pd.read_csv(data_path)
        self.sector_cols = [
            'agriculture_index', 'education_index', 'health_index',
            'infrastructure_index', 'irrigation_index', 'social_index'
        ]
        
        # Clean data
        print(f"\nLoaded {len(self.df)} villages from {self.df['District.Name'].nunique()} districts")
        self.df = self.df.dropna(subset=self.sector_cols)
        print(f"After cleaning: {len(self.df)} villages")
        
        # Get unique districts
        self.districts = sorted(self.df['District.Name'].unique())
        print(f"Districts: {len(self.districts)}")
        for i, district in enumerate(self.districts, 1):
            n_villages = len(self.df[self.df['District.Name'] == district])
            print(f"  {i:2d}. {district:20s} - {n_villages:4d} villages")
    
    def deliverable_1_r_values(self):
        """
        DELIVERABLE 1: Linear Regression & Random Forest with R values
        Calculate both R and R² for all sector predictions
        """
        print("\n" + "="*80)
        print("DELIVERABLE 1: PREDICTION WITH R VALUES (NOT JUST R²)")
        print("="*80)
        
        results = []
        
        for target_idx in self.sector_cols:
            print(f"\n{'='*80}")
            print(f"PREDICTING: {target_idx.replace('_index', '').upper()}")
            print(f"{'='*80}")
            
            # Prepare data
            predictor_cols = [col for col in self.sector_cols if col != target_idx]
            X = self.df[predictor_cols].values
            y = self.df[target_idx].values
            
            # Linear Regression
            lr_model = LinearRegression()
            lr_model.fit(X, y)
            lr_pred = lr_model.predict(X)
            
            lr_r2 = r2_score(y, lr_pred)
            lr_r = np.sqrt(lr_r2) if lr_r2 >= 0 else -np.sqrt(abs(lr_r2))
            lr_mae = mean_absolute_error(y, lr_pred)
            lr_rmse = np.sqrt(mean_squared_error(y, lr_pred))
            
            print(f"\n  LINEAR REGRESSION:")
            print(f"  {'─'*76}")
            print(f"    R  (Correlation):       {lr_r:+.4f}")
            print(f"    R² (Variance Explained): {lr_r2:.4f} ({lr_r2*100:.2f}%)")
            print(f"    MAE:                     {lr_mae:.2f}")
            print(f"    RMSE:                    {lr_rmse:.2f}")
            
            # Random Forest
            rf_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
            rf_model.fit(X, y)
            rf_pred = rf_model.predict(X)
            
            rf_r2 = r2_score(y, rf_pred)
            rf_r = np.sqrt(rf_r2) if rf_r2 >= 0 else -np.sqrt(abs(rf_r2))
            rf_mae = mean_absolute_error(y, rf_pred)
            rf_rmse = np.sqrt(mean_squared_error(y, rf_pred))
            
            print(f"\n  RANDOM FOREST:")
            print(f"  {'─'*76}")
            print(f"    R  (Correlation):       {rf_r:+.4f}")
            print(f"    R² (Variance Explained): {rf_r2:.4f} ({rf_r2*100:.2f}%)")
            print(f"    MAE:                     {rf_mae:.2f}")
            print(f"    RMSE:                    {rf_rmse:.2f}")
            
            # Feature importance for Random Forest
            print(f"\n  FEATURE IMPORTANCE (Random Forest):")
            print(f"  {'─'*76}")
            importance_df = pd.DataFrame({
                'Feature': [p.replace('_index', '').title() for p in predictor_cols],
                'Importance': rf_model.feature_importances_
            }).sort_values('Importance', ascending=False)
            
            for _, row in importance_df.iterrows():
                bar_length = int(row['Importance'] * 50)
                bar = '█' * bar_length
                print(f"    {row['Feature']:20s}: {bar} {row['Importance']:.4f}")
            
            results.append({
                'target': target_idx.replace('_index', '').title(),
                'lr_r': lr_r,
                'lr_r2': lr_r2,
                'lr_mae': lr_mae,
                'lr_rmse': lr_rmse,
                'rf_r': rf_r,
                'rf_r2': rf_r2,
                'rf_mae': rf_mae,
                'rf_rmse': rf_rmse,
                'feature_importance': importance_df.to_dict('records')
            })
        
        # Summary table
        self._print_r_values_summary(results)
        
        return results

    
    def deliverable_2_infrastructure_impact(self):
        """
        DELIVERABLE 2: Impact of All Factors on Infrastructure Index
        Detailed analysis of what drives infrastructure development
        """
        print("\n" + "="*80)
        print("DELIVERABLE 2: IMPACT ANALYSIS - ALL FACTORS → INFRASTRUCTURE")
        print("="*80)
        print("\nGoal: Understand which development sectors most impact infrastructure")
        
        target = 'infrastructure_index'
        predictors = [col for col in self.sector_cols if col != target]
        
        X = self.df[predictors].values
        y = self.df[target].values
        
        # ===== LINEAR REGRESSION ANALYSIS =====
        print(f"\n{'─'*80}")
        print("LINEAR REGRESSION: Infrastructure = f(Agriculture, Education, Health, Irrigation, Social)")
        print(f"{'─'*80}")
        
        lr_model = LinearRegression()
        lr_model.fit(X, y)
        lr_pred = lr_model.predict(X)
        
        lr_r2 = r2_score(y, lr_pred)
        lr_r = np.sqrt(lr_r2) if lr_r2 >= 0 else -np.sqrt(abs(lr_r2))
        lr_mae = mean_absolute_error(y, lr_pred)
        lr_rmse = np.sqrt(mean_squared_error(y, lr_pred))
        
        print(f"\nModel Performance:")
        print(f"  R  (Correlation):        {lr_r:+.4f}")
        print(f"  R² (Variance Explained):  {lr_r2:.4f} ({lr_r2*100:.2f}%)")
        print(f"  MAE:                      {lr_mae:.2f} points")
        print(f"  RMSE:                     {lr_rmse:.2f} points")
        
        print(f"\nRegression Equation:")
        print(f"  Infrastructure Index = {lr_model.intercept_:.2f}")
        for pred, coef in zip(predictors, lr_model.coef_):
            sign = '+' if coef >= 0 else ''
            print(f"                       {sign} {coef:.4f} × {pred.replace('_index', '').title()}")
        
        print(f"\nCoefficient Interpretation:")
        print(f"{'─'*80}")
        coef_df = pd.DataFrame({
            'Factor': [p.replace('_index', '').title() for p in predictors],
            'Coefficient': lr_model.coef_,
            'Abs_Coef': np.abs(lr_model.coef_)
        }).sort_values('Abs_Coef', ascending=False)
        
        for idx, row in coef_df.iterrows():
            impact = 'POSITIVE ↑' if row['Coefficient'] > 0 else 'NEGATIVE ↓'
            bar_length = int(row['Abs_Coef'] * 100)
            bar = '█' * bar_length
            print(f"  {row['Factor']:15s}: {row['Coefficient']:+.4f} {impact:12s} {bar}")
            print(f"                     → 1-point increase → {row['Coefficient']:+.4f} points in Infrastructure")
        
        # ===== RANDOM FOREST ANALYSIS =====
        print(f"\n{'─'*80}")
        print("RANDOM FOREST: Non-linear Relationships & Feature Importance")
        print(f"{'─'*80}")
        
        rf_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
        rf_model.fit(X, y)
        rf_pred = rf_model.predict(X)
        
        rf_r2 = r2_score(y, rf_pred)
        rf_r = np.sqrt(rf_r2) if rf_r2 >= 0 else -np.sqrt(abs(rf_r2))
        rf_mae = mean_absolute_error(y, rf_pred)
        rf_rmse = np.sqrt(mean_squared_error(y, rf_pred))
        
        print(f"\nModel Performance:")
        print(f"  R  (Correlation):        {rf_r:+.4f}")
        print(f"  R² (Variance Explained):  {rf_r2:.4f} ({rf_r2*100:.2f}%)")
        print(f"  MAE:                      {rf_mae:.2f} points")
        print(f"  RMSE:                     {rf_rmse:.2f} points")
        
        print(f"\nFeature Importance Ranking:")
        print(f"{'─'*80}")
        importance_df = pd.DataFrame({
            'Factor': [p.replace('_index', '').title() for p in predictors],
            'Importance': rf_model.feature_importances_
        }).sort_values('Importance', ascending=False)
        
        for rank, (_, row) in enumerate(importance_df.iterrows(), 1):
            bar_length = int(row['Importance'] * 60)
            bar = '█' * bar_length
            print(f"  {rank}. {row['Factor']:15s}: {bar} {row['Importance']:.4f} ({row['Importance']*100:.1f}%)")
        
        # ===== DISTRICT-BASED CROSS-VALIDATION FOR INFRASTRUCTURE =====
        print(f"\n{'─'*80}")
        print("GENERALIZATION TEST: District-Based 5-Fold Cross-Validation")
        print(f"{'─'*80}")
        
        # Create folds
        districts_shuffled = np.random.RandomState(42).permutation(self.districts)
        fold_size = len(districts_shuffled) // 5
        district_folds = []
        for i in range(5):
            start_idx = i * fold_size
            end_idx = start_idx + fold_size if i < 4 else len(districts_shuffled)
            district_folds.append(districts_shuffled[start_idx:end_idx])
        
        lr_cv_scores = []
        rf_cv_scores = []
        
        for fold_idx, test_districts in enumerate(district_folds, 1):
            test_mask = self.df['District.Name'].isin(test_districts)
            train_mask = ~test_mask
            
            X_train = self.df[train_mask][predictors].values
            y_train = self.df[train_mask][target].values
            X_test = self.df[test_mask][predictors].values
            y_test = self.df[test_mask][target].values
            
            # Linear Regression
            lr_fold_model = LinearRegression()
            lr_fold_model.fit(X_train, y_train)
            lr_fold_pred = lr_fold_model.predict(X_test)
            lr_fold_r2 = r2_score(y_test, lr_fold_pred)
            lr_fold_r = np.sqrt(lr_fold_r2) if lr_fold_r2 >= 0 else -np.sqrt(abs(lr_fold_r2))
            
            # Random Forest
            rf_fold_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
            rf_fold_model.fit(X_train, y_train)
            rf_fold_pred = rf_fold_model.predict(X_test)
            rf_fold_r2 = r2_score(y_test, rf_fold_pred)
            rf_fold_r = np.sqrt(rf_fold_r2) if rf_fold_r2 >= 0 else -np.sqrt(abs(rf_fold_r2))
            
            print(f"\n  Fold {fold_idx} (Testing: {', '.join(test_districts)}):")
            print(f"    Linear Regression:  R={lr_fold_r:+.4f}, R²={lr_fold_r2:.4f}")
            print(f"    Random Forest:      R={rf_fold_r:+.4f}, R²={rf_fold_r2:.4f}")
            
            lr_cv_scores.append({'r': lr_fold_r, 'r2': lr_fold_r2})
            rf_cv_scores.append({'r': rf_fold_r, 'r2': rf_fold_r2})
        
        print(f"\n  Cross-Validation Summary:")
        print(f"    Linear Regression:  R={np.mean([s['r'] for s in lr_cv_scores]):+.4f}±{np.std([s['r'] for s in lr_cv_scores]):.4f}")
        print(f"                        R²={np.mean([s['r2'] for s in lr_cv_scores]):.4f}±{np.std([s['r2'] for s in lr_cv_scores]):.4f}")
        print(f"    Random Forest:      R={np.mean([s['r'] for s in rf_cv_scores]):+.4f}±{np.std([s['r'] for s in rf_cv_scores]):.4f}")
        print(f"                        R²={np.mean([s['r2'] for s in rf_cv_scores]):.4f}±{np.std([s['r2'] for s in rf_cv_scores]):.4f}")
        
        # ===== KEY INSIGHTS =====
        print(f"\n{'='*80}")
        print("KEY INSIGHTS: What Drives Infrastructure Development?")
        print(f"{'='*80}")
        
        top_factor_rf = importance_df.iloc[0]
        top_factor_lr = coef_df.iloc[0]
        
        print(f"\n1. MOST IMPORTANT FACTOR (Random Forest):")
        print(f"   → {top_factor_rf['Factor']} explains {top_factor_rf['Importance']*100:.1f}% of infrastructure variance")
        
        print(f"\n2. STRONGEST LINEAR RELATIONSHIP:")
        print(f"   → {top_factor_lr['Factor']} (coefficient: {top_factor_lr['Coefficient']:+.4f})")
        print(f"   → 10-point increase in {top_factor_lr['Factor']} → {top_factor_lr['Coefficient']*10:+.2f} points in Infrastructure")
        
        print(f"\n3. MODEL GENERALIZATION:")
        lr_cv_avg_r2 = np.mean([s['r2'] for s in lr_cv_scores])
        rf_cv_avg_r2 = np.mean([s['r2'] for s in rf_cv_scores])
        if rf_cv_avg_r2 > lr_cv_avg_r2:
            print(f"   → Random Forest generalizes better (R²={rf_cv_avg_r2:.4f} vs {lr_cv_avg_r2:.4f})")
            print(f"   → Non-linear relationships are important!")
        else:
            print(f"   → Linear model is sufficient (R²={lr_cv_avg_r2:.4f} vs {rf_cv_avg_r2:.4f})")
        
        print(f"\n4. OVERALL PREDICTABILITY:")
        if rf_r2 > 0.7:
            print(f"   → Infrastructure is HIGHLY PREDICTABLE from other sectors (R²={rf_r2:.4f})")
        elif rf_r2 > 0.5:
            print(f"   → Infrastructure is MODERATELY PREDICTABLE from other sectors (R²={rf_r2:.4f})")
        else:
            print(f"   → Infrastructure has UNIQUE drivers beyond measured sectors (R²={rf_r2:.4f})")
        
        return {
            'lr_model': lr_model,
            'rf_model': rf_model,
            'lr_r': lr_r,
            'lr_r2': lr_r2,
            'rf_r': rf_r,
            'rf_r2': rf_r2,
            'coefficients': coef_df.to_dict('records'),
            'feature_importance': importance_df.to_dict('records'),
            'cv_lr_scores': lr_cv_scores,
            'cv_rf_scores': rf_cv_scores
        }
    
    def _print_r_values_summary(self, results):
        """Print summary table with R values"""
        print("\n" + "="*80)
        print("SUMMARY: R AND R² VALUES FOR ALL PREDICTIONS")
        print("="*80)
        
        print(f"\n{'Target':<20} {'LR R':<10} {'LR R²':<10} {'RF R':<10} {'RF R²':<10} {'Better Model'}")
        print("─"*80)
        for r in results:
            better = 'Random Forest' if r['rf_r2'] > r['lr_r2'] else 'Linear Reg.'
            print(f"{r['target']:<20} {r['lr_r']:+.4f}    {r['lr_r2']:.4f}    {r['rf_r']:+.4f}    {r['rf_r2']:.4f}    {better}")
    
    def export_results(self, d1_results, d2_results):
        """Export all results"""
        print("\n" + "="*80)
        print("EXPORTING RESULTS")
        print("="*80)
        
        # Deliverable 1
        d1_df = pd.DataFrame(d1_results)
        d1_df.to_csv('results/deliverable1_r_values.csv', index=False)
        print("Saved: results/deliverable1_r_values.csv")
        
        # Deliverable 2
        d2_coef_df = pd.DataFrame(d2_results['coefficients'])
        d2_coef_df.to_csv('results/deliverable2_infrastructure_coefficients.csv', index=False)
        print("Saved: results/deliverable2_infrastructure_coefficients.csv")
        
        d2_imp_df = pd.DataFrame(d2_results['feature_importance'])
        d2_imp_df.to_csv('results/deliverable2_infrastructure_importance.csv', index=False)
        print("Saved: results/deliverable2_infrastructure_importance.csv")


def main():
    """Run all deliverables"""
    analyzer = DistrictCrossValidationAnalyzer()
    
    # Deliverable 1: R values (not just R²)
    d1_results = analyzer.deliverable_1_r_values()
    
    # Deliverable 2: Impact on infrastructure
    d2_results = analyzer.deliverable_2_infrastructure_impact()
    
    # Export
    analyzer.export_results(d1_results, d2_results)
    
    print("\n" + "="*80)
    print("ALL DELIVERABLES COMPLETE!")
    print("="*80)
    print("\nOutput files:")
    print("  1. results/deliverable1_r_values.csv")
    print("  2. results/deliverable2_infrastructure_coefficients.csv")
    print("  3. results/deliverable2_infrastructure_importance.csv")
    print("="*80)


if __name__ == "__main__":
    main()
