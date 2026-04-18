import pandas as pd
import numpy as np
from scipy.stats import percentileofscore
import os
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')


class IndexCalculator:
    
    def __init__(self, base_path='analysis'):
        self.base_path = base_path
        self.all_villages = []
        
    def safe_division(self, numerator, denominator, default=0):
        return np.where(denominator > 0, numerator / denominator, default)
    
    def normalize_percentile(self, series):
        #Convert to percentile rank (0-100)
        # Convert to pandas Series if numpy array
        if isinstance(series, np.ndarray):
            series = pd.Series(series)
        
        if len(series) == 0 or len(series.unique()) == 1:
            return pd.Series([50] * len(series), index=series.index)
        return series.apply(lambda x: percentileofscore(series, x, kind='mean'))
    
    def normalize_distance(self, series, max_distance=12.5):
        #Invert distance: 0 km = 100, max_distance = 0
        return 100 - (series / max_distance * 100).clip(0, 100)
    
    def load_all_data(self):
        #Load all sector data for all strata
        print("="*80)
        print("LOADING ALL VILLAGE DATA FROM CSV FILES")
        print("="*80)
        
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
                
                # Load and merge
                df_agri = pd.read_csv(agri_path)
                df_edu = pd.read_csv(edu_path)
                df_health = pd.read_csv(health_path)
                df_infra = pd.read_csv(infra_path)
                df_irrig = pd.read_csv(irrig_path)
                df_social = pd.read_csv(social_path)
                
                # Store info
                n_villages = len(df_agri)
                print(f"   Agriculture: {n_villages} villages")
                print(f"   Education: {len(df_edu)} villages")
                print(f"   Health: {len(df_health)} villages")
                print(f"   Infrastructure: {len(df_infra)} villages")
                print(f"   Irrigation: {len(df_irrig)} villages")
                print(f"   Social: {len(df_social)} villages")
                
                # Calculate indices for this stratum
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
                
                self.all_villages.append(merged)
                
                print(f"Calculated all indices for {n_villages} villages")
                
            except Exception as e:
                print(f"Error processing {stratum}: {str(e)}")
                continue
        
        # Combine all strata
        if self.all_villages:
            self.villages_df = pd.concat(self.all_villages, ignore_index=True)
            print(f"\n TOTAL: {len(self.villages_df)} villages processed across all strata")
        else:
            raise ValueError("No data loaded!")
    
    def calculate_agriculture_index(self, df):
        # Component 1: Crop Diversity (0-4 scale)
        crop_diversity = (df['Wheat'].fillna(0) + df['Rice'].fillna(0) + 
                         df['Musturd'].fillna(0) + df['Others'].fillna(0))
        crop_diversity_norm = (crop_diversity / 4) * 100
        
        # Component 2: Agricultural Intensity
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
        
        # Component 3: Forest Coverage
        forest_coverage = self.safe_division(
            df['Forest.Area.(in.Hectares)'].fillna(0), total_area, 0
        ) * 100
        
        # Component 4: Wasteland (inverted)
        wasteland = (df['Barren.&.Un-cultivable.Land.Area.(in.Hectares)'].fillna(0) + 
                    df['Culturable.Waste.Land.Area.(in.Hectares)'].fillna(0))
        wasteland_pct = self.safe_division(wasteland, total_area, 0) * 100
        wasteland_score = 100 - np.clip(wasteland_pct, 0, 100)
        
        # Component 5: Land Per Household (percentile)
        land_per_hh = self.safe_division(total_area, df['Total.Households'].fillna(1), 0)
        land_per_hh_norm = self.normalize_percentile(land_per_hh)
        
        # Component 6: Cultivable Land Ratio
        cultivable = (total_area - df['Forest.Area.(in.Hectares)'].fillna(0) -
                     df['Barren.&.Un-cultivable.Land.Area.(in.Hectares)'].fillna(0) -
                     df['Area.under.Non-Agricultural.Uses.(in.Hectares)'].fillna(0))
        cultivable_ratio = self.safe_division(cultivable, total_area, 0) * 100
        
        # FINAL INDEX
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
        # Fix distance encoding (set to 12.5 when facility count = 0)
        def safe_distance(count_col, dist_col):
            dist = df[dist_col].fillna(12.5).copy()
            dist[df[count_col].fillna(0) == 0] = 12.5
            return dist
        
        # Component 1: Schools Per 1000 Population
        total_schools = (
            df['Total.Pre...Primary.School'].fillna(0) +
            df['Total.Middle.Schools'].fillna(0) +
            df['Total.Secondary.Schools'].fillna(0) +
            df['Total.Senior.Secondary.Schools'].fillna(0)
        )
        pop = df['Total.Population.of.Village'].fillna(1)
        schools_per_1000 = self.safe_division(total_schools, pop, 0) * 1000
        schools_per_1000_norm = self.normalize_percentile(schools_per_1000)
        
        # Component 2: Basic Education Accessibility
        dist_preprimary = safe_distance('Total.Pre...Primary.School', 'Distance')
        dist_middle = safe_distance('Total.Middle.Schools', 'Distance.1')
        dist_secondary = safe_distance('Total.Secondary.Schools', 'Distance.2')
        avg_dist_basic = (dist_preprimary + dist_middle + dist_secondary) / 3
        accessibility_norm = self.normalize_distance(avg_dist_basic)
        
        # Component 3: Secondary Availability
        secondary = (df['Total.Secondary.Schools'].fillna(0) + 
                    df['Total.Senior.Secondary.Schools'].fillna(0))
        secondary_norm = self.normalize_percentile(secondary)
        
        # Component 4: Higher Education Access
        higher_edu = (df['Total.Arts.and.Science.Degree.College'].fillna(0) +
                     df['Total.Engineering.College'].fillna(0) +
                     df['Total.Medicine.College'].fillna(0) +
                     df['Total.Management.Institute'].fillna(0))
        higher_edu_norm = self.normalize_percentile(higher_edu)
        
        # Component 5: Vocational Score
        voc_count = df['Total.Vocational.Training.School.ITI'].fillna(0)
        voc_dist = safe_distance('Total.Vocational.Training.School.ITI', 'Distance.8')
        vocational_score = np.where(voc_count > 0, 100, 
                                    np.maximum(0, 100 - (voc_dist / 12.5 * 100)))
        
        # Component 6: Education Diversity
        school_types = [
            'Total.Pre...Primary.School', 'Total.Middle.Schools', 
            'Total.Secondary.Schools', 'Total.Senior.Secondary.Schools',
            'Total.Arts.and.Science.Degree.College', 'Total.Engineering.College',
            'Total.Medicine.College', 'Total.Management.Institute',
            'Total.Vocational.Training.School.ITI', 'Total.School.For.Disabled'
        ]
        diversity = sum((df[col].fillna(0) > 0).astype(int) for col in school_types)
        diversity_norm = (diversity / 10) * 100
        
        # FINAL INDEX
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
        # Component 1: Facilities Per 1000
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
        
        # Component 2: Staffing Adequacy
        required_cols = [col for col in df.columns if 'Required.Strength' in col or 'Total.Strength' in col]
        inposition_cols = [col for col in df.columns if 'In.Position' in col]
        
        total_required = sum(df[col].fillna(0) for col in required_cols if col in df.columns)
        total_inposition = sum(df[col].fillna(0) for col in inposition_cols if col in df.columns)
        staffing_adequacy = self.safe_division(total_inposition, total_required, 0) * 100
        staffing_adequacy = np.clip(staffing_adequacy, 0, 100)
        
        # Component 3: Critical Facilities Accessibility
        phc_dist = df['Distance.1'].fillna(12.5).copy()
        phc_dist[df['Primary.Health.Centre..Numbers.'].fillna(0) == 0] = 12.5
        
        sub_dist = df['Distance.2'].fillna(12.5).copy()
        sub_dist[df['Primary.Heallth.Sub.Centre..Numbers.'].fillna(0) == 0] = 12.5
        
        hosp_dist = df['Distance.5'].fillna(12.5).copy()
        hosp_dist[df['Hospital.Allopathic..Numbers.'].fillna(0) == 0] = 12.5
        
        avg_critical_dist = (phc_dist + sub_dist + hosp_dist) / 3
        critical_access = self.normalize_distance(avg_critical_dist)
        
        # Component 4: Critical Facilities Coverage
        critical_facilities = (
            df['Primary.Health.Centre..Numbers.'].fillna(0) +
            df['Primary.Heallth.Sub.Centre..Numbers.'].fillna(0) +
            df['Hospital.Allopathic..Numbers.'].fillna(0)
        )
        critical_coverage = self.safe_division(critical_facilities, pop, 0) * 1000
        critical_coverage_norm = self.normalize_percentile(critical_coverage)
        
        # Component 5: Specialized Care
        specialized = (
            (df['TB.Clinic..Numbers.'].fillna(0) > 0).astype(int) +
            (df['Maternity.And.Child.Welfare.Centre..Numbers.'].fillna(0) > 0).astype(int) +
            (df['Mobile.Health.Clinic..Numbers.'].fillna(0) > 0).astype(int) +
            (df['Family.Welfare.Centre..Numbers.'].fillna(0) > 0).astype(int)
        )
        specialized_norm = (specialized / 4) * 100
        
        # Component 6: Facility Diversity
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
        
        # FINAL INDEX
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
        # Component 1: Water & Sanitation Score
        water_sanitation = (
            df['Tap.Water-Treated'].fillna(0) +
            df['Closed.Drainage'].fillna(0) +
            (df['Water.Treatment.-.Sewar.Plants'].fillna(0) > 0).astype(int) +
            df['Total.Sanitation.Campaign.(TSC)'].fillna(0) +
            df['Community.Toilet.Complex'].fillna(0) +
            df['Community.waste.disposal.system.after.house.to.house.collection'].fillna(0) +
            df['Community.Bio-gas.or.recycle.of.waste.for.production.use'].fillna(0)
        ) / 7 * 100
        # Subtract garbage penalty
        garbage_penalty = df['No.System.(Garbage.on.road/street)'].fillna(0) / 7 * 100
        water_sanitation = water_sanitation - garbage_penalty
        water_sanitation = np.clip(water_sanitation, 0, 100)
        
        # Component 2: Transportation Score
        transportation = (
            df['Public.Bus.Service'].fillna(0) +
            (df['Private.Bus.Service.(Status.A(1)/NA(2))'].fillna(0) == 1).astype(int) +
            df['Railway.Station'].fillna(0) +
            df['Other.Transport.-.Auto,.Van.Rickshaw.etc.'].fillna(0) +
            (df['Highways'].fillna(0) > 0).astype(int) +
            df['Other.Pucca.Roads'].fillna(0)
        ) / 6 * 100
        
        # Component 3: Communication Score
        communication = (
            df['Post.Office.or.Sub.Post.Office'].fillna(0) +
            df['Telephone'].fillna(0) +
            df['PCO'].fillna(0) +
            df['Internet.Cafes./.Common.Service.Centre.(CSC)'].fillna(0) +
            df['Private.Courier.Facility'].fillna(0)
        ) / 5 * 100
        
        # Component 4: Quality Score
        quality = (
            df['Tap.Water-Treated'].fillna(0) +
            df['Closed.Drainage'].fillna(0) +
            (df['Water.Treatment.-.Sewar.Plants'].fillna(0) > 0).astype(int)
        ) / 3 * 100
        
        # Component 5: Accessibility (average distance to services)
        distance_cols = [col for col in df.columns if 'Distance' in col and col != 'Distance.10']
        avg_distance = df[distance_cols].fillna(12.5).mean(axis=1)
        accessibility = self.normalize_distance(avg_distance)
        
        # FINAL INDEX
        infrastructure_index = (
            0.30 * water_sanitation +
            0.25 * transportation +
            0.20 * communication +
            0.15 * quality +
            0.10 * accessibility
        )
        
        return infrastructure_index
    
    def calculate_irrigation_index(self, df):
        # Component 1: Irrigation Coverage
        irrigated = df['Area.Irrigated.by.Source.(in.Hectares)'].fillna(0)
        sown = df['Net.Area.Sown.(in.Hectares)'].fillna(1)
        coverage = self.safe_division(irrigated, sown, 0) * 100
        coverage = np.clip(coverage, 0, 100)
        
        # Component 2: Water Source Availability
        water_sources = (
            df['Well.Functioning'].fillna(0) +
            df['Hand.Pump.Functioning'].fillna(0) +
            df['Tube.Wells/Borehole.Functioning'].fillna(0) +
            df['River/Canal.Status'].fillna(0) +
            (df['Tank/Pond/Lake.Functioning.All.round.the.year'].fillna(0) > 0).astype(int)
        )
        water_source_norm = (water_sources / 5) * 100
        
        # Component 3: Unirrigated Land (inverted)
        unirrigated = df['Total.Unirrigated.Land.Area.(in.Hectares)'].fillna(0)
        unirrigated_pct = self.safe_division(unirrigated, sown, 0) * 100
        unirrigated_score = 100 - np.clip(unirrigated_pct, 0, 100)
        
        # Component 4: Water Security
        water_security = (
            df['River/Canal.Functioning.All.round.the.year'].fillna(0) +
            df['Tank/Pond/Lake.Functioning.All.round.the.year'].fillna(0)
        ) / 2 * 100
        
        # Component 5: Irrigation Diversity
        irrigation_methods = [
            'Canals.Area.(in.Hectares)', 'Wells/Tube.Wells.Area.(in.Hectares)',
            'Tanks/Lakes.Area.(in.Hectares)', 'Waterfall.Area.(in.Hectares)',
            'Other.Source.(specify).Area.(in.Hectares)'
        ]
        diversity = sum((df[col].fillna(0) > 0).astype(int) for col in irrigation_methods)
        diversity_norm = (diversity / 5) * 100
        
        # Component 6: Canal Irrigation Ratio
        canal_area = df['Canals.Area.(in.Hectares)'].fillna(0)
        canal_ratio = self.safe_division(canal_area, irrigated, 0) * 100
        
        # FINAL INDEX
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
        # Component 1: Financial Inclusion
        financial = (
            df['Banks.on.any.Kind'].fillna(0) +
            df['Agricultural.Credit.Societies'].fillna(0)
        ) / 2 * 100
        
        # Component 2: Market Access
        market = (
            df['Mandis/Regular.Market'].fillna(0) +
            df['Weekly.Haat'].fillna(0) +
            df['Agricultural.Marketing.Society'].fillna(0)
        ) / 3 * 100
        
        # Component 3: Community Services
        community = (
            df['ASHA'].fillna(0) +
            df['Community.Centre.with/without.TV'].fillna(0) +
            df['Sports.Field'].fillna(0) +
            df['Sports.Club/Recreation.Centre'].fillna(0) +
            df['Public.Library'].fillna(0) +
            df['Assembly.Polling.Station'].fillna(0)
        ) / 6 * 100
        
        # Component 4: Financial Accessibility
        bank_dist = df['Distance'].fillna(12.5).copy()
        bank_dist[df['Banks.on.any.Kind'].fillna(0) == 0] = 12.5
        
        credit_dist = df['Distance.1'].fillna(12.5).copy()
        credit_dist[df['Agricultural.Credit.Societies'].fillna(0) == 0] = 12.5
        
        avg_financial_dist = (bank_dist + credit_dist) / 2
        financial_access = self.normalize_distance(avg_financial_dist)
        
        # Component 5: Market Accessibility
        mandi_dist = df['Distance.2'].fillna(12.5).copy()
        mandi_dist[df['Mandis/Regular.Market'].fillna(0) == 0] = 12.5
        
        haat_dist = df['Distance.3'].fillna(12.5).copy()
        haat_dist[df['Weekly.Haat'].fillna(0) == 0] = 12.5
        
        agri_mkt_dist = df['Distance.4'].fillna(12.5).copy()
        agri_mkt_dist[df['Agricultural.Marketing.Society'].fillna(0) == 0] = 12.5
        
        avg_market_dist = (mandi_dist + haat_dist + agri_mkt_dist) / 3
        market_access = self.normalize_distance(avg_market_dist)
        
        # Component 6: Community Accessibility
        community_dist_cols = ['Distance.5', 'Distance.6', 'Distance.7', 
                              'Distance.8', 'Distance.9', 'Distance.10']
        avg_community_dist = df[community_dist_cols].fillna(12.5).mean(axis=1)
        community_access = self.normalize_distance(avg_community_dist)
        
        # FINAL INDEX
        social_index = (
            0.25 * financial +
            0.25 * market +
            0.20 * community +
            0.12 * financial_access +
            0.10 * market_access +
            0.08 * community_access
        )
        
        return social_index
    
    def calculate_composite_indices(self):
        print("\n" + "="*80)
        print("CALCULATING COMPOSITE INDICES")
        print("="*80)
        
        # Equal weights
        self.villages_df['composite_index_equal'] = (
            self.villages_df[['agriculture_index', 'education_index', 'health_index',
                             'infrastructure_index', 'irrigation_index', 'social_index']].mean(axis=1)
        )
        
        # SDG-aligned weights
        self.villages_df['composite_index_sdg'] = (
            0.15 * self.villages_df['agriculture_index'] +
            0.20 * self.villages_df['education_index'] +
            0.25 * self.villages_df['health_index'] +
            0.15 * self.villages_df['infrastructure_index'] +
            0.15 * self.villages_df['irrigation_index'] +
            0.10 * self.villages_df['social_index']
        )
        
        # Expert-driven (Haryana-specific)
        self.villages_df['composite_index_expert'] = (
            0.25 * self.villages_df['agriculture_index'] +
            0.15 * self.villages_df['education_index'] +
            0.15 * self.villages_df['health_index'] +
            0.15 * self.villages_df['infrastructure_index'] +
            0.20 * self.villages_df['irrigation_index'] +
            0.10 * self.villages_df['social_index']
        )
        
        print(f" Calculated 3 composite index schemes for {len(self.villages_df)} villages")
        print(f"  - Equal weights")
        print(f"  - SDG-aligned weights")
        print(f"  - Expert-driven (Haryana-specific) weights")
    
    def aggregate_to_districts(self):
        print("\n" + "="*80)
        print("AGGREGATING TO DISTRICT LEVEL")
        print("="*80)
        
        # Population-weighted aggregation
        sector_cols = ['agriculture_index', 'education_index', 'health_index',
                      'infrastructure_index', 'irrigation_index', 'social_index',
                      'composite_index_equal', 'composite_index_sdg', 'composite_index_expert']
        
        district_data = []
        for district in self.villages_df['District.Name'].unique():
            district_villages = self.villages_df[self.villages_df['District.Name'] == district]
            total_pop = district_villages['Total.Population.of.Village'].sum()
            
            district_row = {'District.Name': district}
            district_row['total_population'] = total_pop
            district_row['n_villages'] = len(district_villages)
            
            for col in sector_cols:
                weighted_index = (
                    (district_villages[col] * district_villages['Total.Population.of.Village']).sum() /
                    total_pop
                )
                district_row[col] = weighted_index
            
            district_data.append(district_row)
        
        self.districts_df = pd.DataFrame(district_data)
        
        # Add rankings
        self.districts_df = self.districts_df.sort_values('composite_index_sdg', ascending=False)
        self.districts_df['rank_sdg'] = range(1, len(self.districts_df) + 1)
        
        self.districts_df = self.districts_df.sort_values('composite_index_expert', ascending=False)
        self.districts_df['rank_expert'] = range(1, len(self.districts_df) + 1)
        
        # Resort by SDG ranking
        self.districts_df = self.districts_df.sort_values('rank_sdg')
        
        print(f"Aggregated {len(self.districts_df)} districts")
        print(f"\nTop 5 Districts (SDG-weighted):")
        print(self.districts_df[['District.Name', 'composite_index_sdg', 'rank_sdg']].head())
        
        print(f"\nBottom 5 Districts (SDG-weighted):")
        print(self.districts_df[['District.Name', 'composite_index_sdg', 'rank_sdg']].tail())
    
    def export_results(self, output_path='results'):
        print("\n" + "="*80)
        print("EXPORTING RESULTS")
        print("="*80)
        
        # Create output directory
        Path(output_path).mkdir(parents=True, exist_ok=True)
        
        # Export village indices
        village_output = f"{output_path}/village_indices_complete.csv"
        self.villages_df.to_csv(village_output, index=False)
        print(f"Village indices exported to: {village_output}")
        print(f"  - {len(self.villages_df)} villages")
        print(f"  - {len(self.villages_df.columns)} columns")
        
        # Export district rankings
        district_output = f"{output_path}/district_rankings.csv"
        self.districts_df.to_csv(district_output, index=False)
        print(f"District rankings exported to: {district_output}")
        print(f"  - {len(self.districts_df)} districts")
        print(f"  - {len(self.districts_df.columns)} columns")
        
        # Summary statistics
        summary_output = f"{output_path}/summary_statistics.txt"
        with open(summary_output, 'w') as f:
            f.write("HARYANA VILLAGE DEVELOPMENT INDICES - SUMMARY STATISTICS\n")
            f.write("="*80 + "\n\n")
            
            f.write(f"Total Villages Processed: {len(self.villages_df)}\n")
            f.write(f"Total Districts: {len(self.districts_df)}\n")
            f.write(f"Total Population: {self.villages_df['Total.Population.of.Village'].sum():,}\n\n")
            
            f.write("SECTOR INDEX STATISTICS (Village-level):\n")
            f.write("-" * 80 + "\n")
            for col in ['agriculture_index', 'education_index', 'health_index',
                       'infrastructure_index', 'irrigation_index', 'social_index']:
                f.write(f"\n{col.replace('_', ' ').title()}:\n")
                f.write(f"  Mean: {self.villages_df[col].mean():.2f}\n")
                f.write(f"  Median: {self.villages_df[col].median():.2f}\n")
                f.write(f"  Min: {self.villages_df[col].min():.2f}\n")
                f.write(f"  Max: {self.villages_df[col].max():.2f}\n")
                f.write(f"  Std Dev: {self.villages_df[col].std():.2f}\n")
        
        print(f"Summary statistics exported to: {summary_output}")
        
        print("\n" + "="*80)
        print("INDEX CALCULATION COMPLETE!")
        print("="*80)


def main():
    calculator = IndexCalculator(base_path='analysis')
    calculator.load_all_data()
    calculator.calculate_composite_indices()
    calculator.aggregate_to_districts()
    calculator.export_results()


if __name__ == "__main__":
    main()
