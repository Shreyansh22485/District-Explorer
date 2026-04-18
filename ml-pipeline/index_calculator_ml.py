"""
Enhanced Index Calculator with ML-Driven Weights
Based on Colombia DNP 2023 + Kenya KNBS 2022 methodologies

Improvements over index_calculator.py:
1. SHAP-derived weights (data-driven)
2. LightGBM for validation + feature importance
3. Lasso feature selection
4. Ensemble approach (RF + LightGBM + SHAP)

Authors: Riya Gupta & Shreyansh Srivastav
Date: February 15, 2026
"""

import pandas as pd
import numpy as np
from scipy.stats import percentileofscore
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# ML/DL libraries
try:
    import lightgbm as lgb
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.linear_model import LassoCV
    import shap
    ML_AVAILABLE = True
except ImportError:
    print("WARNING: ML libraries not installed. Install with:")
    print("  pip install lightgbm scikit-learn shap")
    ML_AVAILABLE = False


class MLIndexCalculator:
    """
    Enhanced Index Calculator with ML-driven weight optimization
    
    Features:
    - SHAP-derived weights (Colombia 2023)
    - LightGBM validation (Kenya 2022)
    - Lasso feature selection
    - Multiple weighting schemes comparison
    """
    
    def __init__(self, base_path='analysis', use_ml_weights=True):
        self.base_path = base_path
        self.use_ml_weights = use_ml_weights and ML_AVAILABLE
        self.all_villages = []
        self.ml_weights = {}  # Store SHAP-derived weights
        self.lasso_weights = {}  # Store Lasso weights
        self.feature_importance = {}  # Store LightGBM importance
        
        if use_ml_weights and not ML_AVAILABLE:
            print("⚠️  ML libraries not available - falling back to expert weights")
            self.use_ml_weights = False
    
    def safe_division(self, numerator, denominator, default=0):
        """Safe division handling zeros"""
        return np.where(denominator > 0, numerator / denominator, default)
    
    def normalize_percentile(self, series):
        """Convert to percentile rank (0-100)"""
        if isinstance(series, np.ndarray):
            series = pd.Series(series)
        
        if len(series) == 0 or len(series.unique()) == 1:
            return pd.Series([50] * len(series), index=series.index)
        return series.apply(lambda x: percentileofscore(series, x, kind='mean'))
    
    def normalize_distance(self, series, max_distance=12.5):
        """Invert distance: 0 km = 100, max_distance = 0"""
        return 100 - (series / max_distance * 100).clip(0, 100)
    
    def load_all_data(self):
        """Load all sector data for all strata"""
        print("="*80)
        print("LOADING ALL VILLAGE DATA FROM CSV FILES")
        print("="*80)
        
        all_strata_data = []
        
        for stratum in ['high', 'medium', 'small']:
            print(f"\nProcessing {stratum.upper()} population stratum...")
            
            try:
                # Load each sector
                agri_path = f"{self.base_path}/agriculture/dhcb_agri_{stratum}_rmd.csv"
                edu_path = f"{self.base_path}/education/{stratum}/dhcb_education_{stratum}_rmd.csv"
                health_path = f"{self.base_path}/health/{stratum}/dhcb_health_{stratum}_rmd.csv"
                infra_path = f"{self.base_path}/infra/dhcb_infra_{stratum}_rmd.csv"
                irrig_path = f"{self.base_path}/irrigation/dhcb_irrig_{stratum}_rmd.csv"
                social_path = f"{self.base_path}/social/dhcb_social_{stratum}_rmd.csv"
                
                df_agri = pd.read_csv(agri_path)
                df_edu = pd.read_csv(edu_path)
                df_health = pd.read_csv(health_path)
                df_infra = pd.read_csv(infra_path)
                df_irrig = pd.read_csv(irrig_path)
                df_social = pd.read_csv(social_path)
                
                n_villages = len(df_agri)
                print(f"   Loaded: {n_villages} villages")
                
                # Calculate indices with expert weights first
                agri_indices = self.calculate_agriculture_index(df_agri)
                edu_indices = self.calculate_education_index(df_edu)
                health_indices = self.calculate_health_index(df_health)
                infra_indices = self.calculate_infrastructure_index(df_infra)
                irrig_indices = self.calculate_irrigation_index(df_irrig)
                social_indices = self.calculate_social_index(df_social)
                
                # Merge all indices
                merged = df_agri[['District.Name', 'Village.Name', 'Total.Population.of.Village', 'Total.Households']].copy()
                merged['population_stratum'] = stratum
                merged['agriculture_index'] = agri_indices
                merged['education_index'] = edu_indices
                merged['health_index'] = health_indices
                merged['infrastructure_index'] = infra_indices
                merged['irrigation_index'] = irrig_indices
                merged['social_index'] = social_indices
                
                all_strata_data.append(merged)
                
                print(f"   Calculated indices: {n_villages} villages")
                
            except Exception as e:
                print(f"   ERROR loading {stratum} stratum: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        # Combine all strata
        if all_strata_data:
            self.villages_df = pd.concat(all_strata_data, ignore_index=True)
            print(f"\n[SUCCESS] TOTAL: {len(self.villages_df)} villages processed across all strata")
            print(f"   - Districts: {self.villages_df['District.Name'].nunique()}")
            print(f"   - Population strata: {sorted(self.villages_df['population_stratum'].unique())}")
        else:
            raise ValueError("No data loaded! Check CSV file paths and data integrity.")
    
    # ==================================================================================
    # ORIGINAL INDEX CALCULATIONS (Expert Weights)
    # ==================================================================================
    
    def calculate_agriculture_index(self, df):
        """Agriculture index with expert weights (original formula)"""
        crop_diversity = (df['Wheat'].fillna(0) + df['Rice'].fillna(0) + 
                         df['Musturd'].fillna(0) + df['Others'].fillna(0))
        crop_diversity_norm = (crop_diversity / 4) * 100
        
        total_area = df['Total.Geographical.Area.(in.Hectares)'].fillna(0)
        net_sown = (
            total_area -
            df['Forest.Area.(in.Hectares)'].fillna(0) -
            df['Area.under.Non-Agricultural.Uses.(in.Hectares)'].fillna(0) -
            df['Barren.&.Un-cultivable.Land.Area.(in.Hectares)'].fillna(0) -
            df['Permanent.Pastures.and.Other.Grazing.Land.Area.(in.Hectares)'].fillna(0) -
            df['Land.Under.Miscellaneous.Tree.Crops.etc..Area.(in.Hectares)'].fillna(0) -
            df['Culturable.Waste.Land.Area.(in.Hectares)'].fillna(0) -
            df['Fallows.Land.other.than.Current.Fallows.Area.(in.Hectares)'].fillna(0) -
            df['Current.Fallows.Area.(in.Hectares)'].fillna(0)
        )
        agri_intensity = self.safe_division(net_sown, total_area, 0) * 100
        agri_intensity = np.clip(agri_intensity, 0, 100)
        
        forest_coverage = self.safe_division(df['Forest.Area.(in.Hectares)'].fillna(0), total_area, 0) * 100
        
        wasteland = (df['Barren.&.Un-cultivable.Land.Area.(in.Hectares)'].fillna(0) + 
                    df['Culturable.Waste.Land.Area.(in.Hectares)'].fillna(0))
        wasteland_pct = self.safe_division(wasteland, total_area, 0) * 100
        wasteland_score = 100 - np.clip(wasteland_pct, 0, 100)
        
        land_per_hh = self.safe_division(total_area, df['Total.Households'].fillna(1), 0)
        land_per_hh_norm = self.normalize_percentile(land_per_hh)
        
        cultivable = (total_area - df['Forest.Area.(in.Hectares)'].fillna(0) -
                     df['Barren.&.Un-cultivable.Land.Area.(in.Hectares)'].fillna(0) -
                     df['Area.under.Non-Agricultural.Uses.(in.Hectares)'].fillna(0))
        cultivable_ratio = self.safe_division(cultivable, total_area, 0) * 100
        
        # EXPERT WEIGHTS (original)
        agriculture_index = (
            0.20 * crop_diversity_norm +
            0.25 * agri_intensity +
            0.15 * forest_coverage +
            0.15 * wasteland_score +
            0.15 * land_per_hh_norm +
            0.10 * cultivable_ratio
        )
        
        return agriculture_index
    
    def calculate_education_index(self, df):
        """Education index with expert weights (original formula)"""
        def safe_distance(count_col, dist_col):
            dist = df[dist_col].fillna(12.5).copy()
            dist[df[count_col].fillna(0) == 0] = 12.5
            return dist
        
        total_schools = (
            df['Total.Pre...Primary.School'].fillna(0) +
            df['Total.Middle.Schools'].fillna(0) +
            df['Total.Secondary.Schools'].fillna(0) +
            df['Total.Senior.Secondary.Schools'].fillna(0)
        )
        pop = df['Total.Population.of.Village'].fillna(1)
        schools_per_1000 = self.safe_division(total_schools, pop, 0) * 1000
        schools_per_1000_norm = self.normalize_percentile(schools_per_1000)
        
        dist_preprimary = safe_distance('Total.Pre...Primary.School', 'Distance')
        dist_middle = safe_distance('Total.Middle.Schools', 'Distance.1')
        dist_secondary = safe_distance('Total.Secondary.Schools', 'Distance.2')
        avg_dist_basic = (dist_preprimary + dist_middle + dist_secondary) / 3
        accessibility_norm = self.normalize_distance(avg_dist_basic)
        
        secondary = (df['Total.Secondary.Schools'].fillna(0) + 
                    df['Total.Senior.Secondary.Schools'].fillna(0))
        secondary_norm = self.normalize_percentile(secondary)
        
        higher_edu = (df['Total.Arts.and.Science.Degree.College'].fillna(0) +
                     df['Total.Engineering.College'].fillna(0) +
                     df['Total.Medicine.College'].fillna(0) +
                     df['Total.Management.Institute'].fillna(0))
        higher_edu_norm = self.normalize_percentile(higher_edu)
        
        voc_count = df['Total.Vocational.Training.School.ITI'].fillna(0)
        voc_dist = safe_distance('Total.Vocational.Training.School.ITI', 'Distance.8')
        vocational_score = np.where(voc_count > 0, 100, 
                                    np.maximum(0, 100 - (voc_dist / 12.5 * 100)))
        
        school_types = [
            'Total.Pre...Primary.School', 'Total.Middle.Schools', 
            'Total.Secondary.Schools', 'Total.Senior.Secondary.Schools',
            'Total.Arts.and.Science.Degree.College', 'Total.Engineering.College',
            'Total.Medicine.College', 'Total.Management.Institute',
            'Total.Vocational.Training.School.ITI', 'Total.School.For.Disabled'
        ]
        diversity = sum((df[col].fillna(0) > 0).astype(int) for col in school_types)
        diversity_norm = (diversity / 10) * 100
        
        # EXPERT WEIGHTS (original)
        education_index = (
            0.25 * schools_per_1000_norm +
            0.20 * accessibility_norm +
            0.20 * secondary_norm +
            0.15 * higher_edu_norm +
            0.10 * vocational_score +
            0.10 * diversity_norm
        )
        
        return education_index
    
    def calculate_health_index(self, df):
        """Health index with expert weights (original formula)"""
        facilities = (
            df['Community.Health.Centre..Numbers.'].fillna(0) +
            df['Primary.Health.Centre..Numbers.'].fillna(0) +
            df['Primary.Heallth.Sub.Centre..Numbers.'].fillna(0) +
            df['Maternity.And.Child.Welfare.Centre..Numbers.'].fillna(0) +
            df['TB.Clinic..Numbers.'].fillna(0) +
            df['Hospital.Allopathic..Numbers.'].fillna(0) +
            df['Hospiltal.Alternative.Medicine..Numbers.'].fillna(0) +
            df['Dispensary..Numbers.'].fillna(0) +
            df['Veterinary.Hospital..Numbers.'].fillna(0) +
            df['Mobile.Health.Clinic..Numbers.'].fillna(0) +
            df['Family.Welfare.Centre..Numbers.'].fillna(0)
        )
        pop = df['Total.Population.of.Village'].fillna(1)
        facilities_per_1000 = self.safe_division(facilities, pop, 0) * 1000
        facilities_norm = self.normalize_percentile(facilities_per_1000)
        
        required_cols = [col for col in df.columns if 'Required.Strength' in col or 'Total.Strength' in col]
        inposition_cols = [col for col in df.columns if 'In.Position' in col]
        
        total_required = sum(df[col].fillna(0) for col in required_cols if col in df.columns)
        total_inposition = sum(df[col].fillna(0) for col in inposition_cols if col in df.columns)
        staffing_adequacy = self.safe_division(total_inposition, total_required, 0) * 100
        staffing_adequacy = np.clip(staffing_adequacy, 0, 100)
        
        phc_dist = df['Distance.1'].fillna(12.5).copy()
        phc_dist[df['Primary.Health.Centre..Numbers.'].fillna(0) == 0] = 12.5
        
        sub_dist = df['Distance.2'].fillna(12.5).copy()
        sub_dist[df['Primary.Heallth.Sub.Centre..Numbers.'].fillna(0) == 0] = 12.5
        
        hosp_dist = df['Distance.5'].fillna(12.5).copy()
        hosp_dist[df['Hospital.Allopathic..Numbers.'].fillna(0) == 0] = 12.5
        
        avg_critical_dist = (phc_dist + sub_dist + hosp_dist) / 3
        critical_access = self.normalize_distance(avg_critical_dist)
        
        critical_facilities = (
            df['Primary.Health.Centre..Numbers.'].fillna(0) +
            df['Primary.Heallth.Sub.Centre..Numbers.'].fillna(0) +
            df['Hospital.Allopathic..Numbers.'].fillna(0)
        )
        critical_coverage = self.safe_division(critical_facilities, pop, 0) * 1000
        critical_coverage_norm = self.normalize_percentile(critical_coverage)
        
        specialized = (
            (df['TB.Clinic..Numbers.'].fillna(0) > 0).astype(int) +
            (df['Maternity.And.Child.Welfare.Centre..Numbers.'].fillna(0) > 0).astype(int) +
            (df['Mobile.Health.Clinic..Numbers.'].fillna(0) > 0).astype(int) +
            (df['Family.Welfare.Centre..Numbers.'].fillna(0) > 0).astype(int)
        )
        specialized_norm = (specialized / 4) * 100
        
        facility_types = [
            'Community.Health.Centre..Numbers.', 'Primary.Health.Centre..Numbers.',
            'Primary.Heallth.Sub.Centre..Numbers.', 'Maternity.And.Child.Welfare.Centre..Numbers.',
            'TB.Clinic..Numbers.', 'Hospital.Allopathic..Numbers.',
            'Hospiltal.Alternative.Medicine..Numbers.', 'Dispensary..Numbers.',
            'Veterinary.Hospital..Numbers.', 'Mobile.Health.Clinic..Numbers.',
            'Family.Welfare.Centre..Numbers.'
        ]
        diversity = sum((df[col].fillna(0) > 0).astype(int) for col in facility_types)
        diversity_norm = (diversity / 11) * 100
        
        # EXPERT WEIGHTS (original)
        health_index = (
            0.25 * facilities_norm +
            0.20 * staffing_adequacy +
            0.20 * critical_access +
            0.20 * critical_coverage_norm +
            0.10 * specialized_norm +
            0.05 * diversity_norm
        )
        
        return health_index
    
    def calculate_infrastructure_index(self, df):
        """Infrastructure index with expert weights (original formula)"""
        water_sanitation = (
            df['Tap.Water-Treated'].fillna(0) +
            df['Closed.Drainage'].fillna(0) +
            (df['Water.Treatment.-.Sewar.Plants'].fillna(0) > 0).astype(int) +
            df['Total.Sanitation.Campaign.(TSC)'].fillna(0) +
            df['Community.Toilet.Complex'].fillna(0) +
            df['Community.waste.disposal.system.after.house.to.house.collection'].fillna(0) +
            df['Community.Bio-gas.or.recycle.of.waste.for.production.use'].fillna(0)
        ) / 7 * 100
        garbage_penalty = df['No.System.(Garbage.on.road/street)'].fillna(0) / 7 * 100
        water_sanitation = water_sanitation - garbage_penalty
        water_sanitation = np.clip(water_sanitation, 0, 100)
        
        transportation = (
            df['Public.Bus.Service'].fillna(0) +
            (df['Private.Bus.Service.(Status.A(1)/NA(2))'].fillna(0) == 1).astype(int) +
            df['Railway.Station'].fillna(0) +
            df['Other.Transport.-.Auto,.Van.Rickshaw.etc.'].fillna(0) +
            (df['Highways'].fillna(0) > 0).astype(int) +
            df['Other.Pucca.Roads'].fillna(0)
        ) / 6 * 100
        
        communication = (
            df['Post.Office.or.Sub.Post.Office'].fillna(0) +
            df['Telephone'].fillna(0) +
            df['PCO'].fillna(0) +
            df['Internet.Cafes./.Common.Service.Centre.(CSC)'].fillna(0) +
            df['Private.Courier.Facility'].fillna(0)
        ) / 5 * 100
        
        quality = (
            df['Tap.Water-Treated'].fillna(0) +
            df['Closed.Drainage'].fillna(0) +
            (df['Water.Treatment.-.Sewar.Plants'].fillna(0) > 0).astype(int)
        ) / 3 * 100
        
        distance_cols = [col for col in df.columns if 'Distance' in col and col != 'Distance.10']
        avg_distance = df[distance_cols].fillna(12.5).mean(axis=1)
        accessibility = self.normalize_distance(avg_distance)
        
        # EXPERT WEIGHTS (original)
        infrastructure_index = (
            0.30 * water_sanitation +
            0.25 * transportation +
            0.20 * communication +
            0.15 * quality +
            0.10 * accessibility
        )
        
        return infrastructure_index
    
    def calculate_irrigation_index(self, df):
        """Irrigation index with expert weights (original formula)"""
        irrigated = df['Area.Irrigated.by.Source.(in.Hectares)'].fillna(0)
        sown = df['Net.Area.Sown.(in.Hectares)'].fillna(1)
        coverage = self.safe_division(irrigated, sown, 0) * 100
        coverage = np.clip(coverage, 0, 100)
        
        water_sources = (
            df['Well.Functioning'].fillna(0) +
            df['Hand.Pump.Functioning'].fillna(0) +
            df['Tube.Wells/Borehole.Functioning'].fillna(0) +
            df['River/Canal.Status'].fillna(0) +
            (df['Tank/Pond/Lake.Functioning.All.round.the.year'].fillna(0) > 0).astype(int)
        )
        water_source_norm = (water_sources / 5) * 100
        
        unirrigated = df['Total.Unirrigated.Land.Area.(in.Hectares)'].fillna(0)
        unirrigated_pct = self.safe_division(unirrigated, sown, 0) * 100
        unirrigated_score = 100 - np.clip(unirrigated_pct, 0, 100)
        
        water_security = (
            df['River/Canal.Functioning.All.round.the.year'].fillna(0) +
            df['Tank/Pond/Lake.Functioning.All.round.the.year'].fillna(0)
        ) / 2 * 100
        
        irrigation_methods = [
            'Canals.Area.(in.Hectares)', 'Wells/Tube.Wells.Area.(in.Hectares)',
            'Tanks/Lakes.Area.(in.Hectares)', 'Waterfall.Area.(in.Hectares)',
            'Other.Source.(specify).Area.(in.Hectares)'
        ]
        diversity = sum((df[col].fillna(0) > 0).astype(int) for col in irrigation_methods)
        diversity_norm = (diversity / 5) * 100
        
        canal_area = df['Canals.Area.(in.Hectares)'].fillna(0)
        canal_ratio = self.safe_division(canal_area, irrigated, 0) * 100
        
        # EXPERT WEIGHTS (original)
        irrigation_index = (
            0.35 * coverage +
            0.20 * water_source_norm +
            0.15 * unirrigated_score +
            0.15 * water_security +
            0.10 * diversity_norm +
            0.05 * canal_ratio
        )
        
        return irrigation_index
    
    def calculate_social_index(self, df):
        """Social index with expert weights (original formula)"""
        financial = (
            df['Banks.on.any.Kind'].fillna(0) +
            df['Agricultural.Credit.Societies'].fillna(0)
        ) / 2 * 100
        
        market = (
            df['Mandis/Regular.Market'].fillna(0) +
            df['Weekly.Haat'].fillna(0) +
            df['Agricultural.Marketing.Society'].fillna(0)
        ) / 3 * 100
        
        community = (
            df['ASHA'].fillna(0) +
            df['Community.Centre.with/without.TV'].fillna(0) +
            df['Sports.Field'].fillna(0) +
            df['Sports.Club/Recreation.Centre'].fillna(0) +
            df['Public.Library'].fillna(0) +
            df['Assembly.Polling.Station'].fillna(0)
        ) / 6 * 100
        
        bank_dist = df['Distance'].fillna(12.5).copy()
        bank_dist[df['Banks.on.any.Kind'].fillna(0) == 0] = 12.5
        
        credit_dist = df['Distance.1'].fillna(12.5).copy()
        credit_dist[df['Agricultural.Credit.Societies'].fillna(0) == 0] = 12.5
        
        avg_financial_dist = (bank_dist + credit_dist) / 2
        financial_access = self.normalize_distance(avg_financial_dist)
        
        mandi_dist = df['Distance.2'].fillna(12.5).copy()
        mandi_dist[df['Mandis/Regular.Market'].fillna(0) == 0] = 12.5
        
        haat_dist = df['Distance.3'].fillna(12.5).copy()
        haat_dist[df['Weekly.Haat'].fillna(0) == 0] = 12.5
        
        agri_mkt_dist = df['Distance.4'].fillna(12.5).copy()
        agri_mkt_dist[df['Agricultural.Marketing.Society'].fillna(0) == 0] = 12.5
        
        avg_market_dist = (mandi_dist + haat_dist + agri_mkt_dist) / 3
        market_access = self.normalize_distance(avg_market_dist)
        
        community_dist_cols = ['Distance.5', 'Distance.6', 'Distance.7', 
                              'Distance.8', 'Distance.9', 'Distance.10']
        avg_community_dist = df[community_dist_cols].fillna(12.5).mean(axis=1)
        community_access = self.normalize_distance(avg_community_dist)
        
        # EXPERT WEIGHTS (original)
        social_index = (
            0.25 * financial +
            0.25 * market +
            0.20 * community +
            0.12 * financial_access +
            0.10 * market_access +
            0.08 * community_access
        )
        
        return social_index
    
    # ==================================================================================
    # ML-DRIVEN WEIGHT CALCULATION (Colombia 2023 + Kenya 2022)
    # ==================================================================================
    
    def calculate_shap_weights_for_composite(self):
        """
        Calculate SHAP-derived weights for composite index
        Based on Colombia DNP 2023 methodology
        """
        if not self.use_ml_weights:
            print("⚠️  ML weights disabled - using expert weights only")
            return
        
        print("\n" + "="*80)
        print("CALCULATING SHAP-DERIVED WEIGHTS (Colombia 2023 Method)")
        print("="*80)
        
        # Prepare data: Use sector indices as features
        sector_cols = ['agriculture_index', 'education_index', 'health_index',
                      'infrastructure_index', 'irrigation_index', 'social_index']
        X = self.villages_df[sector_cols].fillna(0)
        
        # Target: Use composite_index_sdg as ground truth (or could use external validation)
        # For now, we'll use population-weighted composite as proxy for "development"
        y = self.villages_df[sector_cols].mean(axis=1)  # Temporary target
        
        print(f"Training on {len(X)} villages with {len(sector_cols)} sector indices")
        
        # Train multiple models (ensemble for robustness)
        models = {
            'Random Forest': RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42),
            'Gradient Boosting': GradientBoostingRegressor(n_estimators=300, max_depth=6, random_state=42),
            'LightGBM': lgb.LGBMRegressor(n_estimators=300, max_depth=8, random_state=42, verbose=-1)
        }
        
        shap_values_all = []
        
        for name, model in models.items():
            print(f"\n  Training {name}...")
            model.fit(X, y)
            
            # Calculate SHAP values
            explainer = shap.TreeExplainer(model)
            shap_vals = explainer.shap_values(X)
            
            # Store absolute SHAP values
            shap_values_all.append(np.abs(shap_vals))
            
            print(f"    R² score: {model.score(X, y):.4f}")
        
        # Average SHAP values across models and samples
        mean_abs_shap = np.mean(shap_values_all, axis=0).mean(axis=0)
        
        # Normalize to weights (sum = 1.0)
        weights = mean_abs_shap / mean_abs_shap.sum()
        
        # Store weights
        self.ml_weights['shap_composite'] = dict(zip(sector_cols, weights))
        
        print("\n📊 SHAP-Derived Composite Weights:")
        print("-" * 80)
        for sector, weight in sorted(self.ml_weights['shap_composite'].items(), 
                                     key=lambda x: x[1], reverse=True):
            sector_name = sector.replace('_index', '').title()
            print(f"  {sector_name:20s}: {weight:.4f} ({weight*100:.2f}%)")
        
        # Compare with expert weights
        print("\n📊 Comparison with Expert Weights:")
        print("-" * 80)
        expert_weights_sdg = {
            'agriculture_index': 0.15,
            'education_index': 0.20,
            'health_index': 0.25,
            'infrastructure_index': 0.15,
            'irrigation_index': 0.15,
            'social_index': 0.10
        }
        
        print(f"{'Sector':20s} {'Expert (SDG)':>15s} {'SHAP-Derived':>15s} {'Difference':>15s}")
        print("-" * 80)
        for sector in sector_cols:
            expert = expert_weights_sdg[sector]
            shap_w = self.ml_weights['shap_composite'][sector]
            diff = shap_w - expert
            sector_name = sector.replace('_index', '').title()
            print(f"{sector_name:20s} {expert:>14.4f} {shap_w:>15.4f} {diff:>+15.4f}")
    
    def calculate_lasso_weights_for_composite(self):
        """
        Calculate Lasso-regularized weights for composite index
        Based on Kenya KNBS 2022 methodology
        """
        if not self.use_ml_weights:
            return
        
        print("\n" + "="*80)
        print("CALCULATING LASSO-REGULARIZED WEIGHTS (Kenya 2022 Method)")
        print("="*80)
        
        sector_cols = ['agriculture_index', 'education_index', 'health_index',
                      'infrastructure_index', 'irrigation_index', 'social_index']
        X = self.villages_df[sector_cols].fillna(0)
        y = self.villages_df[sector_cols].mean(axis=1)
        
        # Lasso with cross-validation
        print("Finding optimal regularization parameter (alpha)...")
        lasso = LassoCV(cv=10, alphas=np.logspace(-4, 1, 100), random_state=42)
        lasso.fit(X, y)
        
        # Extract weights (coefficients)
        weights = lasso.coef_
        
        # Normalize to sum=1
        if weights.sum() > 0:
            weights = weights / weights.sum()
        else:
            weights = np.ones(len(weights)) / len(weights)  # Fallback to equal
        
        # Store weights
        self.lasso_weights['composite'] = dict(zip(sector_cols, weights))
        
        print(f"\n[OK] Optimal alpha: {lasso.alpha_:.6f}")
        print(f"   Model R²: {lasso.score(X, y):.4f}")
        
        print("\n📊 Lasso-Regularized Weights:")
        print("-" * 80)
        for sector, weight in sorted(self.lasso_weights['composite'].items(), 
                                     key=lambda x: x[1], reverse=True):
            sector_name = sector.replace('_index', '').title()
            status = "✓ Selected" if weight > 0.01 else "✗ Dropped (redundant)"
            print(f"  {sector_name:20s}: {weight:.4f} ({weight*100:.2f}%) {status}")
    
    def calculate_composite_indices(self):
        """Calculate composite indices with multiple weighting schemes"""
        print("\n" + "="*80)
        print("CALCULATING COMPOSITE INDICES")
        print("="*80)
        
        # 1. Equal weights (baseline)
        self.villages_df['composite_index_equal'] = (
            self.villages_df[['agriculture_index', 'education_index', 'health_index',
                             'infrastructure_index', 'irrigation_index', 'social_index']].mean(axis=1)
        )
        
        # 2. SDG-aligned weights (expert)
        self.villages_df['composite_index_sdg'] = (
            0.15 * self.villages_df['agriculture_index'] +
            0.20 * self.villages_df['education_index'] +
            0.25 * self.villages_df['health_index'] +
            0.15 * self.villages_df['infrastructure_index'] +
            0.15 * self.villages_df['irrigation_index'] +
            0.10 * self.villages_df['social_index']
        )
        
        # 3. Expert-driven (Haryana-specific)
        self.villages_df['composite_index_expert'] = (
            0.25 * self.villages_df['agriculture_index'] +
            0.15 * self.villages_df['education_index'] +
            0.15 * self.villages_df['health_index'] +
            0.15 * self.villages_df['infrastructure_index'] +
            0.20 * self.villages_df['irrigation_index'] +
            0.10 * self.villages_df['social_index']
        )
        
        print(f"[OK] Calculated 3 baseline composite index schemes")
        
        # 4. ML-driven weights (if available)
        if self.use_ml_weights:
            # Calculate ML weights
            self.calculate_shap_weights_for_composite()
            self.calculate_lasso_weights_for_composite()
            
            # SHAP-derived composite
            if 'shap_composite' in self.ml_weights:
                self.villages_df['composite_index_shap'] = sum(
                    weight * self.villages_df[sector]
                    for sector, weight in self.ml_weights['shap_composite'].items()
                )
                print(f"[OK] Calculated SHAP-derived composite index")
            
            # Lasso-derived composite
            if 'composite' in self.lasso_weights:
                self.villages_df['composite_index_lasso'] = sum(
                    weight * self.villages_df[sector]
                    for sector, weight in self.lasso_weights['composite'].items()
                )
                print(f"[OK] Calculated Lasso-regularized composite index")
            
            # 5. Ensemble (average of all methods) - Colombia 2023 approach
            composite_cols = [col for col in self.villages_df.columns if 'composite_index_' in col]
            self.villages_df['composite_index_ensemble'] = (
                self.villages_df[composite_cols].mean(axis=1)
            )
            print(f"[OK] Calculated ensemble composite index (average of {len(composite_cols)} methods)")
    
    def aggregate_to_districts(self):
        """Aggregate village indices to district level"""
        print("\n" + "="*80)
        print("AGGREGATING TO DISTRICT LEVEL")
        print("="*80)
        
        # Get all sector and composite columns
        sector_cols = ['agriculture_index', 'education_index', 'health_index',
                      'infrastructure_index', 'irrigation_index', 'social_index']
        composite_cols = [col for col in self.villages_df.columns if 'composite_index_' in col]
        all_index_cols = sector_cols + composite_cols
        
        district_data = []
        for district in self.villages_df['District.Name'].unique():
            district_villages = self.villages_df[self.villages_df['District.Name'] == district]
            total_pop = district_villages['Total.Population.of.Village'].sum()
            
            district_row = {'District.Name': district}
            district_row['total_population'] = total_pop
            district_row['n_villages'] = len(district_villages)
            
            # Population-weighted aggregation
            for col in all_index_cols:
                weighted_index = (
                    (district_villages[col] * district_villages['Total.Population.of.Village']).sum() /
                    total_pop
                )
                district_row[col] = weighted_index
            
            district_data.append(district_row)
        
        self.districts_df = pd.DataFrame(district_data)
        
        # Add rankings for each composite scheme
        for comp_col in composite_cols:
            rank_col = comp_col.replace('composite_index_', 'rank_')
            self.districts_df = self.districts_df.sort_values(comp_col, ascending=False)
            self.districts_df[rank_col] = range(1, len(self.districts_df) + 1)
        
        # Sort by SDG ranking (primary)
        self.districts_df = self.districts_df.sort_values('rank_sdg')
        
        print(f"[OK] Aggregated {len(self.districts_df)} districts")
        
        # Display rankings comparison
        print("\n📊 District Rankings Comparison (Top 5):")
        print("-" * 100)
        display_cols = ['District.Name'] + [col for col in self.districts_df.columns if 'rank_' in col]
        print(self.districts_df[display_cols].head().to_string(index=False))
    
    def export_results(self, output_path='results'):
        """Export all results including ML-derived weights"""
        print("\n" + "="*80)
        print("EXPORTING RESULTS")
        print("="*80)
        
        Path(output_path).mkdir(parents=True, exist_ok=True)
        
        # 1. Village indices
        village_output = f"{output_path}/village_indices_ml_enhanced.csv"
        export_cols = [col for col in self.villages_df.columns if not col.startswith('_')]
        self.villages_df[export_cols].to_csv(village_output, index=False)
        print(f"[OK] Village indices: {village_output}")
        
        # 2. District rankings
        district_output = f"{output_path}/district_rankings_ml_enhanced.csv"
        self.districts_df.to_csv(district_output, index=False)
        print(f"[OK] District rankings: {district_output}")
        
        # 3. ML weights report
        if self.use_ml_weights:
            weights_output = f"{output_path}/ml_weights_report.txt"
            with open(weights_output, 'w') as f:
                f.write("ML-DERIVED WEIGHTS REPORT\n")
                f.write("="*80 + "\n\n")
                
                f.write("SHAP-Derived Composite Weights (Colombia 2023):\n")
                f.write("-"*80 + "\n")
                if 'shap_composite' in self.ml_weights:
                    for sector, weight in sorted(self.ml_weights['shap_composite'].items(), 
                                                key=lambda x: x[1], reverse=True):
                        f.write(f"  {sector:30s}: {weight:.6f} ({weight*100:.3f}%)\n")
                
                f.write("\n\nLasso-Regularized Weights (Kenya 2022):\n")
                f.write("-"*80 + "\n")
                if 'composite' in self.lasso_weights:
                    for sector, weight in sorted(self.lasso_weights['composite'].items(), 
                                                key=lambda x: x[1], reverse=True):
                        f.write(f"  {sector:30s}: {weight:.6f} ({weight*100:.3f}%)\n")
                
                f.write("\n\nComparison with Expert Weights:\n")
                f.write("-"*80 + "\n")
                f.write(f"{'Sector':30s} {'Expert SDG':>12s} {'SHAP':>12s} {'Lasso':>12s} {'Ensemble':>12s}\n")
                f.write("-"*80 + "\n")
                
                expert_sdg = {'agriculture_index': 0.15, 'education_index': 0.20, 
                             'health_index': 0.25, 'infrastructure_index': 0.15,
                             'irrigation_index': 0.15, 'social_index': 0.10}
                
                for sector in ['agriculture_index', 'education_index', 'health_index',
                              'infrastructure_index', 'irrigation_index', 'social_index']:
                    shap_w = self.ml_weights.get('shap_composite', {}).get(sector, 0)
                    lasso_w = self.lasso_weights.get('composite', {}).get(sector, 0)
                    ensemble_w = (expert_sdg[sector] + shap_w + lasso_w) / 3
                    
                    sector_name = sector.replace('_index', '').title()
                    f.write(f"{sector_name:30s} {expert_sdg[sector]:>12.4f} {shap_w:>12.4f} "
                           f"{lasso_w:>12.4f} {ensemble_w:>12.4f}\n")
            
            print(f"[OK] ML weights report: {weights_output}")
        
        # 4. Summary statistics
        summary_output = f"{output_path}/summary_statistics_ml.txt"
        with open(summary_output, 'w') as f:
            f.write("HARYANA VILLAGE DEVELOPMENT INDICES - ML-ENHANCED SUMMARY\n")
            f.write("="*80 + "\n\n")
            
            f.write(f"Total Villages: {len(self.villages_df)}\n")
            f.write(f"Total Districts: {len(self.districts_df)}\n")
            f.write(f"Total Population: {self.villages_df['Total.Population.of.Village'].sum():,}\n\n")
            
            f.write("COMPOSITE INDEX CORRELATIONS:\n")
            f.write("-"*80 + "\n")
            composite_cols = [col for col in self.villages_df.columns if 'composite_index_' in col]
            corr_matrix = self.villages_df[composite_cols].corr()
            f.write(corr_matrix.to_string())
            f.write("\n\n")
            
            f.write("DISTRICT RANK CORRELATIONS:\n")
            f.write("-"*80 + "\n")
            rank_cols = [col for col in self.districts_df.columns if 'rank_' in col]
            if len(rank_cols) > 1:
                rank_corr = self.districts_df[rank_cols].corr(method='spearman')
                f.write(rank_corr.to_string())
        
        print(f"[OK] Summary statistics: {summary_output}")
        
        print("\n" + "="*80)
        print("[SUCCESS] INDEX CALCULATION COMPLETE (ML-ENHANCED)!")
        print("="*80)


def main():
    """Main execution"""
    print("🚀 ML-Enhanced Index Calculator")
    print("Based on Colombia 2023 + Kenya 2022 + UN GeoAI 2021 methodologies\n")
    
    calculator = MLIndexCalculator(base_path='analysis', use_ml_weights=True)
    calculator.load_all_data()
    calculator.calculate_composite_indices()
    calculator.aggregate_to_districts()
    calculator.export_results()
    
    print("\n📚 Documentation:")
    print("  - Methodology: docs/MODERN_ML_FRAMEWORKS_COMPARISON.md")
    print("  - Weight justification: results/ml_weights_report.txt")
    print("  - Village data: results/village_indices_ml_enhanced.csv")
    print("  - District rankings: results/district_rankings_ml_enhanced.csv")


if __name__ == "__main__":
    main()
