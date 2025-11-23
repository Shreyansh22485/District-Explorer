import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import os

#1. Load Data 
try:
    dhcb = pd.read_excel(r"D:\BTP\analysis\DCHB_Village_Release_0600 v1.xlsx")
    print("Excel file loaded successfully.")
    print(f"Original data shape: {dhcb.shape}")
except FileNotFoundError:
    print("Error: Excel file not found at D:\\BTP\\analysis\\DCHB_Village_Release_0600 v1.xlsx")
    raise

# Normalize column names
dhcb.columns = dhcb.columns.str.strip().str.replace(r"\s+", ".", regex=True)

#2.Select irrigation-related columns


cols_idx = list(range(1,8)) + list(range(75,81)) + list(range(152,160))

max_idx = dhcb.shape[1]
cols_idx = [i for i in cols_idx if i < max_idx]

dhcb_irrig = dhcb.iloc[:, cols_idx].copy()
print(f"Selected irrigation data shape: {dhcb_irrig.shape}")

#3.Split by population 

if 'Total.Population.of.Village' not in dhcb_irrig.columns:
    raise KeyError("Expected column 'Total.Population.of.Village' not found in selected irrigation columns")

dhcb_irrig_small = dhcb_irrig[dhcb_irrig['Total.Population.of.Village'] < 1000].copy()
dhcb_irrig_medium = dhcb_irrig[(dhcb_irrig['Total.Population.of.Village'] >= 1000) & (dhcb_irrig['Total.Population.of.Village'] <= 2500)].copy()
dhcb_irrig_high = dhcb_irrig[dhcb_irrig['Total.Population.of.Village'] > 2500].copy()

print(f"Irrig small: {dhcb_irrig_small.shape}, medium: {dhcb_irrig_medium.shape}, high: {dhcb_irrig_high.shape}")

#4.Impute Canals.Area
canals_col_candidates = [c for c in dhcb_irrig_small.columns if 'Canal' in c or 'Canals.Area' in c or 'Canals.Area.' in c]
if canals_col_candidates:
    canals_col = canals_col_candidates[0]
    dhcb_irrig_small[canals_col] = dhcb_irrig_small[canals_col].fillna(39.9)
    print(f"Imputed missing values in {canals_col} with 39.9")
else:
   
    print("No canals area column found to impute")

# 5. Scale features

def scale_subset(df, col_positions):
    
    positions = [p-1 for p in col_positions]  
    positions = [p for p in positions if 0 <= p < df.shape[1]]
    if not positions:
        return pd.DataFrame()
    cols = df.columns[positions]
    scaler = StandardScaler()
    scaled = pd.DataFrame(scaler.fit_transform(df[cols].fillna(0)), columns=cols, index=df.index)
    return scaled


small_scaled = scale_subset(dhcb_irrig_small, list(range(3,6)) + list(range(8,22)))
medium_scaled = scale_subset(dhcb_irrig_medium, list(range(3,6)) + list(range(8,22)))
high_scaled = scale_subset(dhcb_irrig_high, list(range(3,6)) + list(range(8,22)))

print(f"Scaled shapes: small {small_scaled.shape}, medium {medium_scaled.shape}, high {high_scaled.shape}")

#6.Elbow plot 
def wss_plot(data, max_clusters=5, title='Elbow Plot'):
    if data.shape[0] == 0 or data.shape[1] == 0:
        print('No data for WSS plot')
        return
    wss = []
    for k in range(1, max_clusters+1):
        kmeans = KMeans(n_clusters=k, init='k-means++', n_init=10, random_state=3110)
        kmeans.fit(data)
        wss.append(kmeans.inertia_)
    plt.figure()
    plt.plot(range(1, max_clusters+1), wss, 'bo-')
    plt.title(title)
    plt.xlabel('Number of Clusters')
    plt.ylabel('WSS')
    plt.grid(True, alpha=0.3)
    plt.show()


wss_plot(small_scaled, title='Irrig Small')
wss_plot(medium_scaled, title='Irrig Medium')
wss_plot(high_scaled, title='Irrig High')

#7. KMeans clustering (k=4)
def cluster_and_export(df_original, df_scaled, out_prefix):
    if df_scaled.shape[0] == 0 or df_scaled.shape[1] == 0:
        print(f"Skipping clustering for {out_prefix}: no scaled data")
        return
    K = 4
    kmeans = KMeans(n_clusters=K, n_init=10, random_state=42)
    clusters = kmeans.fit_predict(df_scaled)
    df_original = df_original.copy()
    df_original['Clusters'] = clusters

    # Aggregate 
    cols_to_exclude = []
    if df_original.shape[1] >= 2:
        # Exclude first two columns by position
        cols_to_exclude = list(df_original.columns[:2])

    aggr_cols = [c for c in df_original.columns if c not in cols_to_exclude and c != 'Clusters']
    aggr = df_original.groupby('Clusters')[aggr_cols].mean(numeric_only=True)

    # Export to script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, f"{out_prefix}.csv")
    out_path1 = os.path.join(script_dir, f"{out_prefix}1.csv")
    
    df_original.to_csv(out_path, index=False)
    aggr.to_csv(out_path1)
    print(f"Exported {out_path} and {out_path1}")

# Run clustering & export for three tiers 
cluster_and_export(dhcb_irrig_small, small_scaled, "dhcb_irrig_small_rmd")
cluster_and_export(dhcb_irrig_medium, medium_scaled, "dhcb_irrig_medium_rmd")
cluster_and_export(dhcb_irrig_high, high_scaled, "dhcb_irrig_high_rmd")

print("Irrigation processing complete.")
