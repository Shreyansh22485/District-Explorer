"""
ML Training Data Generator - District Explorer Phase 2
Creates cleaned CSV with input features (X) and output targets (Y) for ML models

Authors: Riya Gupta & Shreyansh Srivastav
Date: January 17, 2026

This script generates a clean, consolidated dataset suitable for training ML models.
The dataset includes:
- INPUT (X): Raw/normalized features from 6 sectors
- OUTPUT (Y): Calculated sector indices + composite indices
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')


class MLDataGenerator:
    """Generate clean training data for ML models"""
    
    def __init__(self, analysis_path='analysis', results_path='results'):
        self.analysis_path = Path(analysis_path)
        self.results_path = Path(results_path)
        
    def load_and_merge_all_sectors(self):
        """Load all sector CSVs and merge into one master DataFrame"""
        
        all_data = []
        
        for stratum in ['high', 'medium', 'small']:
            print(f"\n{'='*60}")
            print(f"Processing stratum: {stratum.upper()}")
            print('='*60)
            
            # Load each sector
            try:
                # Agriculture
                agri_path = self.analysis_path / 'agriculture' / f'dhcb_agri_{stratum}_rmd.csv'
                agri_df = pd.read_csv(agri_path)
                agri_df = agri_df.drop(columns=['Unnamed: 0'], errors='ignore')
                agri_df.columns = [f'agri_{col}' if col not in ['District.Name', 'Village.Name', 
                    'Total.Population.of.Village', 'Total.Households', 
                    'Total.Male.Population.of.Village', 'Total.Female.Population.of.Village',
                    'Total.Geographical.Area.(in.Hectares)'] else col 
                    for col in agri_df.columns]
                print(f"  Agriculture: {len(agri_df)} villages")
                
                # Education
                edu_path = self.analysis_path / 'education' / stratum / f'dhcb_education_{stratum}_rmd.csv'
                edu_df = pd.read_csv(edu_path)
                edu_df = edu_df.drop(columns=['Unnamed: 0'], errors='ignore')
                # Keep only education-specific columns (not demographics)
                edu_cols = [col for col in edu_df.columns if col not in [
                    'Total.Geographical.Area..in.Hectares.', 'Total.Households',
                    'Total.Population.of.Village', 'Total.Male.Population.of.Village',
                    'Total.Female.Population.of.Village'
                ] or col in ['District.Name', 'Village.Name']]
                edu_df = edu_df[edu_cols]
                edu_df.columns = [f'edu_{col}' if col not in ['District.Name', 'Village.Name'] else col 
                    for col in edu_df.columns]
                print(f"  Education: {len(edu_df)} villages")
                
                # Health
                health_path = self.analysis_path / 'health' / stratum / f'dhcb_health_{stratum}_rmd.csv'
                health_df = pd.read_csv(health_path)
                health_df = health_df.drop(columns=['Unnamed: 0'], errors='ignore')
                health_cols = [col for col in health_df.columns if col not in [
                    'Total.Geographical.Area..in.Hectares.', 'Total.Households',
                    'Total.Population.of.Village', 'Total.Male.Population.of.Village',
                    'Total.Female.Population.of.Village'
                ] or col in ['District.Name', 'Village.Name']]
                health_df = health_df[health_cols]
                health_df.columns = [f'health_{col}' if col not in ['District.Name', 'Village.Name'] else col 
                    for col in health_df.columns]
                print(f"  Health: {len(health_df)} villages")
                
                # Infrastructure
                infra_path = self.analysis_path / 'infra' / f'dhcb_infra_{stratum}_rmd.csv'
                infra_df = pd.read_csv(infra_path)
                infra_df = infra_df.drop(columns=['Unnamed: 0'], errors='ignore')
                infra_cols = [col for col in infra_df.columns if col not in [
                    'Total.Geographical.Area.(in.Hectares)', 'Total.Households',
                    'Total.Population.of.Village', 'Total.Male.Population.of.Village',
                    'Total.Female.Population.of.Village'
                ] or col in ['District.Name', 'Village.Name']]
                infra_df = infra_df[infra_cols]
                infra_df.columns = [f'infra_{col}' if col not in ['District.Name', 'Village.Name'] else col 
                    for col in infra_df.columns]
                print(f"  Infrastructure: {len(infra_df)} villages")
                
                # Irrigation
                irrig_path = self.analysis_path / 'irrigation' / f'dhcb_irrig_{stratum}_rmd.csv'
                irrig_df = pd.read_csv(irrig_path)
                irrig_df = irrig_df.drop(columns=['Unnamed: 0'], errors='ignore')
                irrig_cols = [col for col in irrig_df.columns if col not in [
                    'Total.Geographical.Area.(in.Hectares)', 'Total.Households',
                    'Total.Population.of.Village', 'Total.Male.Population.of.Village',
                    'Total.Female.Population.of.Village'
                ] or col in ['District.Name', 'Village.Name']]
                irrig_df = irrig_df[irrig_cols]
                irrig_df.columns = [f'irrig_{col}' if col not in ['District.Name', 'Village.Name'] else col 
                    for col in irrig_df.columns]
                print(f"  Irrigation: {len(irrig_df)} villages")
                
                # Social
                social_path = self.analysis_path / 'social' / f'dhcb_social_{stratum}_rmd.csv'
                social_df = pd.read_csv(social_path)
                social_df = social_df.drop(columns=['Unnamed: 0'], errors='ignore')
                social_cols = [col for col in social_df.columns if col not in [
                    'Total.Geographical.Area.(in.Hectares)', 'Total.Households',
                    'Total.Population.of.Village', 'Total.Male.Population.of.Village',
                    'Total.Female.Population.of.Village'
                ] or col in ['District.Name', 'Village.Name']]
                social_df = social_df[social_cols]
                social_df.columns = [f'social_{col}' if col not in ['District.Name', 'Village.Name'] else col 
                    for col in social_df.columns]
                print(f"  Social: {len(social_df)} villages")
                
                # Merge all sectors
                merged = agri_df.merge(edu_df, on=['District.Name', 'Village.Name'], how='outer')
                merged = merged.merge(health_df, on=['District.Name', 'Village.Name'], how='outer')
                merged = merged.merge(infra_df, on=['District.Name', 'Village.Name'], how='outer')
                merged = merged.merge(irrig_df, on=['District.Name', 'Village.Name'], how='outer')
                merged = merged.merge(social_df, on=['District.Name', 'Village.Name'], how='outer')
                
                merged['population_stratum'] = stratum
                all_data.append(merged)
                print(f"  Merged: {len(merged)} villages with {len(merged.columns)} columns")
                
            except Exception as e:
                print(f"  Error processing {stratum}: {e}")
        
        # Combine all strata
        full_df = pd.concat(all_data, ignore_index=True)
        print(f"\n{'='*60}")
        print(f"TOTAL: {len(full_df)} villages, {len(full_df.columns)} columns")
        print('='*60)
        
        return full_df
    
    def add_indices_from_results(self, df):
        """Merge calculated indices from results/village_indices_complete.csv"""
        
        indices_path = self.results_path / 'village_indices_complete.csv'
        if not indices_path.exists():
            print("WARNING: village_indices_complete.csv not found!")
            print("Please run index_calculator.py first.")
            return df
        
        indices_df = pd.read_csv(indices_path)
        
        # Select only the index columns
        index_cols = [
            'District.Name', 'Village.Name',
            'agriculture_index', 'education_index', 'health_index',
            'infrastructure_index', 'irrigation_index', 'social_index',
            'composite_index_equal', 'composite_index_sdg', 'composite_index_expert'
        ]
        
        indices_df = indices_df[index_cols]
        
        # Merge
        merged = df.merge(indices_df, on=['District.Name', 'Village.Name'], how='left')
        
        print(f"\nAdded {len(index_cols)-2} index columns as targets (Y)")
        
        return merged
    
    def create_derived_features(self, df):
        """Create additional derived features useful for ML"""
        
        print("\nCreating derived features...")
        
        # Population density
        if 'Total.Population.of.Village' in df.columns and 'Total.Geographical.Area.(in.Hectares)' in df.columns:
            df['derived_population_density'] = df['Total.Population.of.Village'] / df['Total.Geographical.Area.(in.Hectares)'].replace(0, np.nan)
        
        # Household size
        if 'Total.Population.of.Village' in df.columns and 'Total.Households' in df.columns:
            df['derived_avg_household_size'] = df['Total.Population.of.Village'] / df['Total.Households'].replace(0, np.nan)
        
        # Gender ratio
        if 'Total.Male.Population.of.Village' in df.columns and 'Total.Female.Population.of.Village' in df.columns:
            df['derived_gender_ratio'] = df['Total.Female.Population.of.Village'] / df['Total.Male.Population.of.Village'].replace(0, np.nan) * 1000
        
        # Land per household (from agriculture)
        if 'Total.Geographical.Area.(in.Hectares)' in df.columns and 'Total.Households' in df.columns:
            df['derived_land_per_hh'] = df['Total.Geographical.Area.(in.Hectares)'] / df['Total.Households'].replace(0, np.nan)
        
        # Total schools (from education)
        edu_school_cols = [col for col in df.columns if 'edu_Total' in col and 'School' in col and 'Distance' not in col]
        if edu_school_cols:
            df['derived_total_schools'] = df[edu_school_cols].fillna(0).sum(axis=1)
        
        # Total health facilities (from health)
        health_facility_cols = [col for col in df.columns if 'health_' in col and 'Numbers' in col]
        if health_facility_cols:
            df['derived_total_health_facilities'] = df[health_facility_cols].fillna(0).sum(axis=1)
        
        # Is urban (population > 2500)
        if 'Total.Population.of.Village' in df.columns:
            df['derived_is_urban'] = (df['Total.Population.of.Village'] > 2500).astype(int)
        
        print(f"Added 7 derived features")
        
        return df
    
    def clean_column_names(self, df):
        """Clean column names for easier use"""
        
        # Replace special characters
        df.columns = df.columns.str.replace(r'[.\(\)\-\/\&\,]', '_', regex=True)
        df.columns = df.columns.str.replace(r'__+', '_', regex=True)
        df.columns = df.columns.str.strip('_')
        df.columns = df.columns.str.lower()
        
        return df
    
    def generate_training_data(self, output_filename='ml_training_data.csv'):
        """Main method to generate the complete training dataset"""
        
        print("="*80)
        print("ML TRAINING DATA GENERATOR")
        print("="*80)
        
        # Step 1: Load and merge all sectors
        df = self.load_and_merge_all_sectors()
        
        # Step 2: Add calculated indices
        df = self.add_indices_from_results(df)
        
        # Step 3: Create derived features
        df = self.create_derived_features(df)
        
        # Step 4: Clean column names
        df = self.clean_column_names(df)
        
        # Step 5: Handle missing values
        # Fill numeric NaNs with 0 (facilities/counts) or median (continuous)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df[numeric_cols] = df[numeric_cols].fillna(0)
        
        # Step 6: Save
        output_path = self.results_path / output_filename
        df.to_csv(output_path, index=False)
        
        print(f"\n{'='*80}")
        print("TRAINING DATA SUMMARY")
        print('='*80)
        print(f"Total villages: {len(df)}")
        print(f"Total features: {len(df.columns)}")
        print(f"\nColumn categories:")
        print(f"  - Identifiers: district_name, village_name, population_stratum")
        print(f"  - Demographics: population, households, gender")
        print(f"  - Agriculture features (agri_*): {len([c for c in df.columns if 'agri_' in c])}")
        print(f"  - Education features (edu_*): {len([c for c in df.columns if 'edu_' in c])}")
        print(f"  - Health features (health_*): {len([c for c in df.columns if 'health_' in c])}")
        print(f"  - Infrastructure features (infra_*): {len([c for c in df.columns if 'infra_' in c])}")
        print(f"  - Irrigation features (irrig_*): {len([c for c in df.columns if 'irrig_' in c])}")
        print(f"  - Social features (social_*): {len([c for c in df.columns if 'social_' in c])}")
        print(f"  - Derived features (derived_*): {len([c for c in df.columns if 'derived_' in c])}")
        print(f"  - TARGET indices (*_index): {len([c for c in df.columns if '_index' in c])}")
        print(f"\nSaved to: {output_path}")
        
        return df


def main():
    """Main execution"""
    generator = MLDataGenerator(analysis_path='analysis', results_path='results')
    df = generator.generate_training_data()
    
    # Print sample
    print("\n" + "="*80)
    print("SAMPLE DATA (first 5 rows, selected columns)")
    print("="*80)
    sample_cols = ['district_name', 'village_name', 'total_population_of_village',
                   'agriculture_index', 'education_index', 'health_index',
                   'composite_index_sdg']
    available_cols = [c for c in sample_cols if c in df.columns]
    print(df[available_cols].head().to_string())


if __name__ == "__main__":
    main()
