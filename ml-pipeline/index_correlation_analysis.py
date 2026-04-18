

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score, KFold
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import warnings
warnings.filterwarnings('ignore')


class IndexCorrelationAnalyzer:
    """Analyze correlations and build predictive models for indices"""
    
    def __init__(self, data_path='results/village_indices_complete.csv'):
        """Load village indices data"""
        print("="*80)
        print("INDEX CORRELATION AND PREDICTION ANALYSIS")
        print("="*80)
        
        self.df = pd.read_csv(data_path)
        self.sector_cols = [
            'agriculture_index', 'education_index', 'health_index',
            'infrastructure_index', 'irrigation_index', 'social_index'
        ]
        
        # Handle missing values
        print(f"\nLoaded {len(self.df)} villages")
        missing_before = self.df[self.sector_cols].isnull().sum().sum()
        if missing_before > 0:
            print(f"Found {missing_before} missing values - removing affected rows")
            self.df = self.df.dropna(subset=self.sector_cols)
            print(f"After cleaning: {len(self.df)} villages")
        
        print(f"Analyzing {len(self.sector_cols)} sector indices")
        
    def calculate_correlations(self):
        """Deliverable 1: Calculate correlation matrix"""
        print("\n" + "="*80)
        print("  DELIVERABLE 1: CORRELATION ANALYSIS")
        print("="*80)
        
        # Extract sector indices
        sector_data = self.df[self.sector_cols]
        
        # Calculate Pearson correlation
        self.corr_matrix = sector_data.corr()
        
        print("\n  CORRELATION MATRIX (Pearson)")
        print("-"*80)
        print(self.corr_matrix.round(3))
        
        # Find strongest correlations
        print("\n  STRONGEST POSITIVE CORRELATIONS:")
        print("-"*80)
        corr_pairs = []
        for i in range(len(self.sector_cols)):
            for j in range(i+1, len(self.sector_cols)):
                corr_val = self.corr_matrix.iloc[i, j]
                corr_pairs.append({
                    'Index 1': self.sector_cols[i].replace('_index', '').title(),
                    'Index 2': self.sector_cols[j].replace('_index', '').title(),
                    'Correlation': corr_val,
                    'Strength': self._interpret_correlation(corr_val)
                })
        
        corr_df = pd.DataFrame(corr_pairs).sort_values('Correlation', ascending=False)
        print(corr_df.head(10).to_string(index=False))
        
        print("\n  STRONGEST NEGATIVE CORRELATIONS:")
        print("-"*80)
        print(corr_df.tail(5).to_string(index=False))
        
        # Statistical interpretation
        print("\n  STATISTICAL INTERPRETATION:")
        print("-"*80)
        for _, row in corr_df.head(5).iterrows():
            r = row['Correlation']
            r_squared = r ** 2
            print(f"\n{row['Index 1']} ↔ {row['Index 2']}:")
            print(f"  • Correlation (r): {r:.3f}")
            print(f"  • R-squared: {r_squared:.3f} ({r_squared*100:.1f}% variance explained)")
            print(f"  • Strength: {row['Strength']}")
        
        return self.corr_matrix
    
    def _interpret_correlation(self, r):
        """Interpret correlation coefficient"""
        abs_r = abs(r)
        if abs_r >= 0.7:
            return "Very Strong"
        elif abs_r >= 0.5:
            return "Strong"
        elif abs_r >= 0.3:
            return "Moderate"
        elif abs_r >= 0.1:
            return "Weak"
        else:
            return "Very Weak/None"
    
    def predict_all_indices(self):
        """Deliverable 2: Predict each index using other 5"""
        print("\n" + "="*80)
        print("  DELIVERABLE 2: PREDICTIVE MODELING")
        print("="*80)
        
        results = []
        
        for target_idx in self.sector_cols:
            print(f"\n{'='*80}")
            print(f"  PREDICTING: {target_idx.replace('_index', '').upper()}")
            print(f"{'='*80}")
            
            # Prepare data
            predictor_cols = [col for col in self.sector_cols if col != target_idx]
            X = self.df[predictor_cols].values
            y = self.df[target_idx].values
            
            # Model 1: Linear Regression
            lr_metrics = self._train_and_evaluate_linear(X, y, predictor_cols, target_idx)
            
            # Model 2: Random Forest (non-linear)
            rf_metrics = self._train_and_evaluate_rf(X, y, predictor_cols, target_idx)
            
            # Store results
            results.append({
                'target': target_idx.replace('_index', '').title(),
                'lr_r2': lr_metrics['r2'],
                'lr_mae': lr_metrics['mae'],
                'lr_rmse': lr_metrics['rmse'],
                'rf_r2': rf_metrics['r2'],
                'rf_mae': rf_metrics['mae'],
                'rf_rmse': rf_metrics['rmse'],
                'feature_importance': rf_metrics['importance']
            })
        
        # Summary comparison
        self._print_prediction_summary(results)
        
        return results
    
    def _train_and_evaluate_linear(self, X, y, predictors, target):
        """Train Linear Regression model"""
        print("\n  LINEAR REGRESSION MODEL")
        print("-"*80)
        
        # Train model
        model = LinearRegression()
        model.fit(X, y)
        
        # Predictions
        y_pred = model.predict(X)
        
        # Metrics
        r2 = r2_score(y, y_pred)
        mae = mean_absolute_error(y, y_pred)
        rmse = np.sqrt(mean_squared_error(y, y_pred))
        
        # Cross-validation
        cv_scores = cross_val_score(model, X, y, cv=5, scoring='r2')
        
        print(f"R² Score: {r2:.4f} (explains {r2*100:.2f}% of variance)")
        print(f"Mean Absolute Error: {mae:.2f}")
        print(f"Root Mean Squared Error: {rmse:.2f}")
        print(f"Cross-Validation R² (5-fold): {cv_scores.mean():.4f} (±{cv_scores.std():.4f})")
        
        # Coefficients
        print("\n🔢 MODEL COEFFICIENTS:")
        for pred, coef in zip(predictors, model.coef_):
            print(f"  {pred.replace('_index', '').title():20s}: {coef:+.4f}")
        print(f"  {'Intercept':20s}: {model.intercept_:+.4f}")
        
        return {
            'r2': r2,
            'mae': mae,
            'rmse': rmse,
            'cv_r2': cv_scores.mean(),
            'coefficients': dict(zip(predictors, model.coef_))
        }
    
    def _train_and_evaluate_rf(self, X, y, predictors, target):
        """Train Random Forest model"""
        print("\n  RANDOM FOREST MODEL (Non-linear)")
        print("-"*80)
        
        # Train model
        model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
        model.fit(X, y)
        
        # Predictions
        y_pred = model.predict(X)
        
        # Metrics
        r2 = r2_score(y, y_pred)
        mae = mean_absolute_error(y, y_pred)
        rmse = np.sqrt(mean_squared_error(y, y_pred))
        
        # Cross-validation
        cv_scores = cross_val_score(model, X, y, cv=5, scoring='r2')
        
        print(f"R² Score: {r2:.4f} (explains {r2*100:.2f}% of variance)")
        print(f"Mean Absolute Error: {mae:.2f}")
        print(f"Root Mean Squared Error: {rmse:.2f}")
        print(f"Cross-Validation R² (5-fold): {cv_scores.mean():.4f} (±{cv_scores.std():.4f})")
        
        # Feature importance
        print("\n  FEATURE IMPORTANCE (Top predictors):")
        importance_df = pd.DataFrame({
            'Feature': [p.replace('_index', '').title() for p in predictors],
            'Importance': model.feature_importances_
        }).sort_values('Importance', ascending=False)
        
        for _, row in importance_df.iterrows():
            print(f"  {row['Feature']:20s}: {row['Importance']:.4f} ({row['Importance']*100:.1f}%)")
        
        return {
            'r2': r2,
            'mae': mae,
            'rmse': rmse,
            'cv_r2': cv_scores.mean(),
            'importance': importance_df.to_dict('records')
        }
    
    def _print_prediction_summary(self, results):
    
        print("\n" + "="*80)
        print("PREDICTION SUMMARY - MODEL COMPARISON")
        print("="*80)
        
        print("\n  LINEAR REGRESSION PERFORMANCE:")
        print("-"*80)
        print(f"{'Target Index':<20} {'R²':<10} {'MAE':<10} {'RMSE':<10} {'Predictability'}")
        print("-"*80)
        for r in results:
            predictability = self._interpret_r2(r['lr_r2'])
            print(f"{r['target']:<20} {r['lr_r2']:<10.4f} {r['lr_mae']:<10.2f} {r['lr_rmse']:<10.2f} {predictability}")
        
        print("\n RANDOM FOREST PERFORMANCE:")
        print("-"*80)
        print(f"{'Target Index':<20} {'R²':<10} {'MAE':<10} {'RMSE':<10} {'Predictability'}")
        print("-"*80)
        for r in results:
            predictability = self._interpret_r2(r['rf_r2'])
            print(f"{r['target']:<20} {r['rf_r2']:<10.4f} {r['rf_mae']:<10.2f} {r['rf_rmse']:<10.2f} {predictability}")
        
        # Best and worst predictions
        lr_sorted = sorted(results, key=lambda x: x['lr_r2'], reverse=True)
        rf_sorted = sorted(results, key=lambda x: x['rf_r2'], reverse=True)
        
        print("\n MOST PREDICTABLE INDICES:")
        print("-"*80)
        print(f"Linear Regression: {lr_sorted[0]['target']} (R²={lr_sorted[0]['lr_r2']:.4f})")
        print(f"Random Forest:     {rf_sorted[0]['target']} (R²={rf_sorted[0]['rf_r2']:.4f})")
        
        print("\n LEAST PREDICTABLE INDICES:")
        print("-"*80)
        print(f"Linear Regression: {lr_sorted[-1]['target']} (R²={lr_sorted[-1]['lr_r2']:.4f})")
        print(f"Random Forest:     {rf_sorted[-1]['target']} (R²={rf_sorted[-1]['rf_r2']:.4f})")
    
    def _interpret_r2(self, r2):
        
        if r2 >= 0.9:
            return "Excellent"
        elif r2 >= 0.7:
            return "Good"
        elif r2 >= 0.5:
            return "Moderate"
        elif r2 >= 0.3:
            return "Weak"
        else:
            return "Poor"
    
    def generate_visualizations(self):
        
        print("\n" + "="*80)
        print("GENERATING VISUALIZATIONS")
        print("="*80)
        
        # Create figure with subplots
        fig = plt.figure(figsize=(20, 12))
        
        # 1. Correlation Heatmap
        ax1 = plt.subplot(2, 3, 1)
        labels = [col.replace('_index', '').replace('_', ' ').title() for col in self.sector_cols]
        sns.heatmap(self.corr_matrix, annot=True, fmt='.3f', cmap='RdYlGn', 
                   xticklabels=labels, yticklabels=labels, center=0,
                   cbar_kws={'label': 'Correlation Coefficient'})
        ax1.set_title('Sector Index Correlation Matrix', fontsize=14, fontweight='bold')
        
        # 2-6. Scatter plots for top 5 correlations
        sector_data = self.df[self.sector_cols]
        corr_pairs = []
        for i in range(len(self.sector_cols)):
            for j in range(i+1, len(self.sector_cols)):
                corr_pairs.append({
                    'idx1': i,
                    'idx2': j,
                    'corr': abs(self.corr_matrix.iloc[i, j])
                })
        corr_pairs.sort(key=lambda x: x['corr'], reverse=True)
        
        for plot_idx, pair in enumerate(corr_pairs[:5], start=2):
            ax = plt.subplot(2, 3, plot_idx)
            idx1, idx2 = pair['idx1'], pair['idx2']
            col1, col2 = self.sector_cols[idx1], self.sector_cols[idx2]
            
            ax.scatter(sector_data[col1], sector_data[col2], alpha=0.3, s=10)
            
            # Add regression line
            z = np.polyfit(sector_data[col1], sector_data[col2], 1)
            p = np.poly1d(z)
            ax.plot(sector_data[col1], p(sector_data[col1]), "r-", linewidth=2)
            
            label1 = col1.replace('_index', '').title()
            label2 = col2.replace('_index', '').title()
            ax.set_xlabel(label1, fontsize=11)
            ax.set_ylabel(label2, fontsize=11)
            ax.set_title(f'{label1} vs {label2}\n(r={self.corr_matrix.iloc[idx1, idx2]:.3f})', 
                        fontsize=12, fontweight='bold')
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('results/correlation_analysis.png', dpi=300, bbox_inches='tight')
        print(" Saved: results/correlation_analysis.png")
        
        # Close figure
        plt.close()
        
        print("\n Visualization generation complete!")
    
    def export_results(self):
        
        print("\n" + "="*80)
        print("EXPORTING RESULTS")
        print("="*80)
        
        # Export correlation matrix
        corr_output = self.corr_matrix.copy()
        corr_output.index = [col.replace('_index', '').title() for col in self.sector_cols]
        corr_output.columns = [col.replace('_index', '').title() for col in self.sector_cols]
        corr_output.to_csv('results/index_correlation_matrix.csv')
        print(" Saved: results/index_correlation_matrix.csv")
        
        print("\n Export complete!")


def main():
    
    # Initialize analyzer
    analyzer = IndexCorrelationAnalyzer()
    
    # Deliverable 1: Correlation Analysis
    corr_matrix = analyzer.calculate_correlations()
    
    # Deliverable 2: Predictive Modeling
    prediction_results = analyzer.predict_all_indices()
    
    # Generate visualizations
    analyzer.generate_visualizations()
    
    # Export results
    analyzer.export_results()
    
    print("\n" + "="*80)
    print(" ANALYSIS COMPLETE!")
    print("="*80)
    print("\nOutput files:")
    print("  results/index_correlation_matrix.csv")
    print("  results/correlation_analysis.png")
    print("\n" + "="*80)


if __name__ == "__main__":
    main()
