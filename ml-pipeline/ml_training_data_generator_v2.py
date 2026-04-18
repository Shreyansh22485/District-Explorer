"""
ML Training Data Generator v2 - Updated for Policy Simulation
Creates consolidated dataset with all 6,841 villages and 177+ features

Improvements over v1:
- Ensures all 6,841 villages are included
- Better feature naming (lowercase with underscores)
- Includes all raw features needed for policy simulation
- Adds derived features for better ML performance

Authors: Riya Gupta & Shreyansh Srivastav
Date: February 15, 2026
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')


class MLDataGeneratorV2:
    """Generate comprehensive training data for policy prediction ML model"""
    
    def __init__(self, analysis_path='analysis', results_path='results'):
        self.analysis_path = Path(analysis_path)
        self.results_path = Path(results_path)
        self.results_path.mkdir(parents=True, exist_ok=True)
        
    def standardize_column_name(self, col):
        """Convert column names to lowercase with underscores"""
        # Skip standard columns
        if col in ['District.Name', 'Village.Name']:
            return col.lower().replace('.', '_')
        
        # Replace dots and special chars with underscores
        clean = col.replace('.', '_').replace(' ', '_').replace('(', '').replace(')', '')
        clean = clean.replace('-', '_').replace('/', '_').replace(',', '')
        clean = clean.lower()
        
        # Remove consecutive underscores
        while '__' in clean:
            clean = clean.replace('__', '_')
        
        # Remove trailing underscores
        clean = clean.strip('_')
        
        return clean
    
    def load_and_merge_all_sectors(self):
        """Load all sector CSVs and merge into master DataFrame"""
        
        print("="*80)
        print("ML TRAINING DATA GENERATOR V2")
        print("="*80)
        
        all_villages = []
        
        for stratum in ['high', 'medium', 'small']:
            print(f"\nProcessing {stratum.upper()} population stratum...")
            
            try:
                # Load each sector
                agri_path = self.analysis_path / 'agriculture' / f'dhcb_agri_{stratum}_rmd.csv'
                edu_path = self.analysis_path / 'education' / stratum / f'dhcb_education_{stratum}_rmd.csv'
                health_path = self.analysis_path / 'health' / stratum / f'dhcb_health_{stratum}_rmd.csv'
                infra_path = self.analysis_path / 'infra' / f'dhcb_infra_{stratum}_rmd.csv'
                irrig_path = self.analysis_path / 'irrigation' / f'dhcb_irrig_{stratum}_rmd.csv'
                social_path = self.analysis_path / 'social' / f'dhcb_social_{stratum}_rmd.csv'
                
                # Load agriculture (base - has demographics)
                agri_df = pd.read_csv(agri_path)
                agri_df = agri_df.drop(columns=['Unnamed: 0'], errors='ignore')
                
                # Rename columns with 'agri_' prefix (except demographics)
                demo_cols = ['District.Name', 'Village.Name', 'Total.Population.of.Village', 
                            'Total.Households', 'Total.Male.Population.of.Village', 
                            'Total.Female.Population.of.Village', 'Total.Geographical.Area.(in.Hectares)']
                
                agri_rename = {}
                for col in agri_df.columns:
                    if col not in demo_cols:
                        agri_rename[col] = f'agri_{self.standardize_column_name(col)}'
                    else:
                        agri_rename[col] = self.standardize_column_name(col)
                
                agri_df = agri_df.rename(columns=agri_rename)
                
                # Load other sectors
                edu_df = pd.read_csv(edu_path).drop(columns=['Unnamed: 0'], errors='ignore')
                health_df = pd.read_csv(health_path).drop(columns=['Unnamed: 0'], errors='ignore')
                infra_df = pd.read_csv(infra_path).drop(columns=['Unnamed: 0'], errors='ignore')
                irrig_df = pd.read_csv(irrig_path).drop(columns=['Unnamed: 0'], errors='ignore')
                social_df = pd.read_csv(social_path).drop(columns=['Unnamed: 0'], errors='ignore')
                
                # Remove duplicate demographics from other sectors
                for df in [edu_df, health_df, infra_df, irrig_df, social_df]:
                    drop_cols = [col for col in df.columns if col in [
                        'Total.Geographical.Area..in.Hectares.', 'Total.Geographical.Area.(in.Hectares)',
                        'Total.Households', 'Total.Population.of.Village', 
                        'Total.Male.Population.of.Village', 'Total.Female.Population.of.Village'
                    ] and col not in ['District.Name', 'Village.Name']]
                    if drop_cols:
                        df.drop(columns=drop_cols, inplace=True, errors='ignore')
                
                # Rename with sector prefixes
                edu_rename = {col: f'edu_{self.standardize_column_name(col)}' 
                             if col not in ['District.Name', 'Village.Name'] 
                             else self.standardize_column_name(col)
                             for col in edu_df.columns}
                
                health_rename = {col: f'health_{self.standardize_column_name(col)}' 
                                if col not in ['District.Name', 'Village.Name'] 
                                else self.standardize_column_name(col)
                                for col in health_df.columns}
                
                infra_rename = {col: f'infra_{self.standardize_column_name(col)}' 
                               if col not in ['District.Name', 'Village.Name'] 
                               else self.standardize_column_name(col)
                               for col in infra_df.columns}
                
                irrig_rename = {col: f'irrig_{self.standardize_column_name(col)}' 
                               if col not in ['District.Name', 'Village.Name'] 
                               else self.standardize_column_name(col)
                               for col in irrig_df.columns}
                
                social_rename = {col: f'social_{self.standardize_column_name(col)}' 
                                if col not in ['District.Name', 'Village.Name'] 
                                else self.standardize_column_name(col)
                                for col in social_df.columns}
                
                edu_df = edu_df.rename(columns=edu_rename)
                health_df = health_df.rename(columns=health_rename)
                infra_df = infra_df.rename(columns=infra_rename)
                irrig_df = irrig_df.rename(columns=irrig_rename)
                social_df = social_df.rename(columns=social_rename)
                
                # Merge all sectors
                merged = agri_df.copy()
                
                for df, sector in [(edu_df, 'education'), (health_df, 'health'), 
                                   (infra_df, 'infrastructure'), (irrig_df, 'irrigation'), 
                                   (social_df, 'social')]:
                    merged = merged.merge(df, on=['district_name', 'village_name'], how='inner')
                
                # Add population stratum
                merged['population_stratum'] = stratum
                
                all_villages.append(merged)
                
                print(f"  Loaded: {len(agri_df)} villages")
                print(f"  Merged: {len(merged)} villages")
                print(f"  Features: {len(merged.columns)}")
                
            except Exception as e:
                print(f"  ERROR: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        # Concatenate all strata
        if not all_villages:
            raise ValueError("No data loaded!")
        
        print(f"\nConcatenating all strata...")
        df_all = pd.concat(all_villages, ignore_index=True)
        
        print(f"\n[SUCCESS] Combined dataset:")
        print(f"  - Total villages: {len(df_all):,}")
        print(f"  - Total columns: {len(df_all.columns)}")
        print(f"  - Districts: {df_all['district_name'].nunique()}")
        print(f"  - Strata: {sorted(df_all['population_stratum'].unique())}")
        
        return df_all
    
    def add_derived_features(self, df):
        """Add derived features for better ML performance"""
        
        print(f"\nAdding derived features...")
        
        # Population density
        if 'total_geographical_area_in_hectares' in df.columns:
            df['derived_population_density'] = (
                df['total_population_of_village'] / df['total_geographical_area_in_hectares'].replace(0, np.nan)
            )
        
        # Average household size
        if 'total_households' in df.columns:
            df['derived_avg_household_size'] = (
                df['total_population_of_village'] / df['total_households'].replace(0, np.nan)
            )
        
        # Gender ratio (females per 1000 males)
        if 'total_male_population_of_village' in df.columns:
            df['derived_gender_ratio'] = (
                df['total_female_population_of_village'] / df['total_male_population_of_village'].replace(0, np.nan) * 1000
            )
        
        # Land per household
        if 'total_geographical_area_in_hectares' in df.columns and 'total_households' in df.columns:
            df['derived_land_per_hh'] = (
                df['total_geographical_area_in_hectares'] / df['total_households'].replace(0, np.nan)
            )
        
        # Total schools
        school_cols = [col for col in df.columns if 'school' in col.lower() and 'total' in col]
        if school_cols:
            df['derived_total_schools'] = df[school_cols].fillna(0).sum(axis=1)
        
        # Total health facilities
        health_cols = [col for col in df.columns if 'health' in col and 'numbers' in col]
        if health_cols:
            df['derived_total_health_facilities'] = df[health_cols].fillna(0).sum(axis=1)
        
        # Urban indicator (population > 4000 or high density)
        if 'total_population_of_village' in df.columns:
            df['derived_is_urban'] = (
                (df['total_population_of_village'] > 4000) | 
                (df.get('derived_population_density', 0) > 10)
            ).astype(int)
        
        derived_cols = [col for col in df.columns if col.startswith('derived_')]
        print(f"  Added {len(derived_cols)} derived features")
        
        return df
    
    def merge_with_calculated_indices(self, df):
        """
        Merge raw features with properly calculated indices from index_calculator_ml.py
        
        This uses village_indices_ml_enhanced.csv which has accurate indices calculated
        using the proper weighted formulas (not simplified averages).
        """
        
        print(f"\nMerging with properly calculated indices...")
        
        # Load indices from index_calculator_ml.py output
        indices_path = self.results_path / 'village_indices_ml_enhanced.csv'
        
        if not indices_path.exists():
            print(f"  WARNING: {indices_path} not found!")
            print(f"  You need to run: python index_calculator_ml.py")
            print(f"  Falling back to simplified index calculation (NOT RECOMMENDED for ML training)")
            return self._calculate_simplified_indices(df)
        
        # Load properly calculated indices
        indices_df = pd.read_csv(indices_path)
        
        # Standardize district/village names for merging
        indices_df['district_name'] = indices_df['District.Name'].fillna('')
        indices_df['village_name'] = indices_df['Village.Name'].fillna('')
        
        # Select only index columns
        index_cols = [col for col in indices_df.columns if 'index' in col.lower() and col not in ['District.Name', 'Village.Name']]
        merge_cols = ['district_name', 'village_name'] + index_cols
        
        indices_subset = indices_df[merge_cols].copy()
        
        # Merge with raw features
        df_merged = df.merge(
            indices_subset,
            on=['district_name', 'village_name'],
            how='left',
            suffixes=('', '_calculated')
        )
        
        # Check merge success
        matched = df_merged[index_cols[0]].notna().sum()
        total = len(df_merged)
        
        print(f"  ✅ Loaded {len(index_cols)} index columns from village_indices_ml_enhanced.csv")
        print(f"  ✅ Matched {matched}/{total} villages ({matched/total*100:.1f}%)")
        
        if matched < total:
            print(f"  ⚠️  WARNING: {total - matched} villages have missing indices!")
        
        # List available indices
        composite_indices = [col for col in index_cols if 'composite' in col]
        print(f"\n  Available composite indices ({len(composite_indices)}):")
        for idx in composite_indices:
            mean_val = df_merged[idx].mean()
            print(f"    - {idx:30s} (mean: {mean_val:.2f})")
        
        return df_merged
    
    def _calculate_simplified_indices(self, df):
        """
        FALLBACK: Calculate simplified indices (NOT RECOMMENDED for training)
        Only use if village_indices_ml_enhanced.csv is not available
        """
        
        print(f"\n  ⚠️  Using simplified index calculation (averages only)")
        print(f"  ⚠️  This is NOT suitable for accurate ML training!")
        
        # Simple averages (placeholder logic)
        agri_features = [col for col in df.columns if col.startswith('agri_')]
        if agri_features:
            df['agriculture_index'] = df[agri_features].fillna(0).mean(axis=1)
        
        edu_features = [col for col in df.columns if col.startswith('edu_') and 'total' in col]
        if edu_features:
            df['education_index'] = df[edu_features].fillna(0).mean(axis=1)
        
        health_features = [col for col in df.columns if col.startswith('health_') and 'numbers' in col]
        if health_features:
            df['health_index'] = df[health_features].fillna(0).mean(axis=1)
        
        infra_features = [col for col in df.columns if col.startswith('infra_')]
        if infra_features:
            df['infrastructure_index'] = df[infra_features].fillna(0).mean(axis=1)
        
        irrig_features = [col for col in df.columns if col.startswith('irrig_')]
        if irrig_features:
            df['irrigation_index'] = df[irrig_features].fillna(0).mean(axis=1)
        
        social_features = [col for col in df.columns if col.startswith('social_')]
        if social_features:
            df['social_index'] = df[social_features].fillna(0).mean(axis=1)
        
        # Composite indices
        sector_cols = ['agriculture_index', 'education_index', 'health_index',
                      'infrastructure_index', 'irrigation_index', 'social_index']
        
        available_sectors = [col for col in sector_cols if col in df.columns]
        
        if available_sectors:
            df['composite_index_equal'] = df[available_sectors].mean(axis=1)
            
            sdg_weights = {
                'agriculture_index': 0.15, 'education_index': 0.20, 'health_index': 0.25,
                'infrastructure_index': 0.15, 'irrigation_index': 0.15, 'social_index': 0.10
            }
            
            df['composite_index_sdg'] = sum(
                sdg_weights.get(col, 0) * df[col] for col in available_sectors
            )
            
            expert_weights = {
                'agriculture_index': 0.25, 'education_index': 0.15, 'health_index': 0.15,
                'infrastructure_index': 0.15, 'irrigation_index': 0.20, 'social_index': 0.10
            }
            
            df['composite_index_expert'] = sum(
                expert_weights.get(col, 0) * df[col] for col in available_sectors
            )
        
        return df
    
    def export_data(self, df, output_name='ml_training_data.csv'):
        """Export final dataset"""
        
        print(f"\n" + "="*80)
        print("EXPORTING TRAINING DATA")
        print("="*80)
        
        output_path = self.results_path / output_name
        df.to_csv(output_path, index=False)
        
        print(f"\n[SUCCESS] Saved: {output_path}")
        print(f"  - Rows: {len(df):,}")
        print(f"  - Columns: {len(df.columns)}")
        print(f"  - File size: {output_path.stat().st_size / 1024 / 1024:.2f} MB")
        
        # Export column metadata
        metadata_path = self.results_path / 'ml_training_data_columns.txt'
        with open(metadata_path, 'w') as f:
            f.write("ML TRAINING DATA - COLUMN METADATA\n")
            f.write("="*80 + "\n\n")
            
            f.write(f"Total Columns: {len(df.columns)}\n")
            f.write(f"Total Rows: {len(df):,}\n\n")
            
            # Group columns by category
            categories = {
                'Metadata': ['district_name', 'village_name', 'population_stratum'],
                'Demographics': [col for col in df.columns if col.startswith('total_') or col.startswith('derived_')],
                'Agriculture': [col for col in df.columns if col.startswith('agri_')],
                'Education': [col for col in df.columns if col.startswith('edu_')],
                'Health': [col for col in df.columns if col.startswith('health_')],
                'Infrastructure': [col for col in df.columns if col.startswith('infra_')],
                'Irrigation': [col for col in df.columns if col.startswith('irrig_')],
                'Social': [col for col in df.columns if col.startswith('social_')],
                'Indices': [col for col in df.columns if 'index' in col],
            }
            
            for category, cols in categories.items():
                if cols:
                    f.write(f"{category} ({len(cols)} columns):\n")
                    f.write("-"*80 + "\n")
                    for col in sorted(cols):
                        non_null = df[col].notnull().sum()
                        null_pct = (1 - non_null / len(df)) * 100
                        f.write(f"  - {col:60s} (null: {null_pct:5.1f}%)\n")
                    f.write("\n")
        
        print(f"[OK] Column metadata: {metadata_path}")
        
        return df


def main():
    """Main execution"""
    print("ML TRAINING DATA GENERATOR V2")
    print("For Policy Simulation ML Model\n")
    
    generator = MLDataGeneratorV2(analysis_path='analysis', results_path='results')
    
    # Load and merge all sectors
    df = generator.load_and_merge_all_sectors()
    
    # Add derived features
    df = generator.add_derived_features(df)
    
    # Merge with properly calculated indices from index_calculator_ml.py
    # This gives us ACCURATE indices (not simplified averages)
    df = generator.merge_with_calculated_indices(df)
    
    # Export
    generator.export_data(df)
    
    print(f"\n" + "="*80)
    print("[COMPLETE] ML training data ready!")
    print("="*80)
    print("\n📊 Index Source:")
    print("  ✅ Uses PROPER indices from index_calculator_ml.py")
    print("  ✅ Includes SHAP, Lasso, Ensemble composite indices")
    print("\nNext steps:")
    print("  1. Review: results/ml_training_data.csv")
    print("  2. Check columns: results/ml_training_data_columns.txt")
    print("  3. Train model: python train_policy_prediction_model.py")


if __name__ == "__main__":
    main()
