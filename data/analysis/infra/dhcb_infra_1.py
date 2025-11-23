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

#Normalize column names
dhcb.columns = dhcb.columns.str.strip().str.replace(r"\s+", ".", regex=True)

#2. Select infra-related columns
cols_idx = list(range(1,8)) + [74] + list(range(81,113))
max_idx = dhcb.shape[1]
cols_idx = [i for i in cols_idx if i < max_idx]

dhcb_infra = dhcb.iloc[:, cols_idx].copy()
print(f"Selected infra data shape: {dhcb_infra.shape}")

#3. Invert distance columns (Distance .. Distance.10)
distance_cols = [c for c in dhcb_infra.columns if 'Distance' in c]
print(f"Found distance columns: {distance_cols}")
for col in distance_cols:
    try:
        dhcb_infra[col] = 15 - pd.to_numeric(dhcb_infra[col], errors='coerce')
    except Exception:
        # if conversion fails, fill with NaN
        dhcb_infra[col] = 15 - pd.to_numeric(dhcb_infra[col], errors='coerce')

#4. Split by population
if 'Total.Population.of.Village' not in dhcb_infra.columns:
    raise KeyError("Expected column 'Total.Population.of.Village' not found in selected infra columns")

dhcb_infra_small = dhcb_infra[dhcb_infra['Total.Population.of.Village'] < 1000].copy()
dhcb_infra_medium = dhcb_infra[(dhcb_infra['Total.Population.of.Village'] >= 1000) & (dhcb_infra['Total.Population.of.Village'] <= 2500)].copy()
dhcb_infra_high = dhcb_infra[dhcb_infra['Total.Population.of.Village'] > 2500].copy()

print(f"Infra small: {dhcb_infra_small.shape}, medium: {dhcb_infra_medium.shape}, high: {dhcb_infra_high.shape}")

#5. Scale features

def scale_by_positions(df, r_positions):
    
    positions = [p-1 for p in r_positions]
    positions = [p for p in positions if 0 <= p < df.shape[1]]
    if not positions:
        return pd.DataFrame()
    cols = df.columns[positions]
    scaler = StandardScaler()
    scaled = pd.DataFrame(scaler.fit_transform(df[cols].fillna(0)), columns=cols, index=df.index)
    return scaled

r_pos = list(range(3,6)) + list(range(8,41))  # 3:5 and 8:40
small_scaled = scale_by_positions(dhcb_infra_small, r_pos)
medium_scaled = scale_by_positions(dhcb_infra_medium, r_pos)
high_scaled = scale_by_positions(dhcb_infra_high, r_pos)

print(f"Scaled shapes: small {small_scaled.shape}, medium {medium_scaled.shape}, high {high_scaled.shape}")

#6. Optional elbow plots
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


wss_plot(small_scaled, title='Infra Small')
wss_plot(medium_scaled, title='Infra Medium')
wss_plot(high_scaled, title='Infra High')

#7. KMeans clustering & export 
def cluster_and_export(df_original, df_scaled, out_prefix):
    if df_scaled.shape[0] == 0 or df_scaled.shape[1] == 0:
        print(f"Skipping clustering for {out_prefix}: no scaled data")
        return
    K = 4
    kmeans = KMeans(n_clusters=K, n_init=10, random_state=42)
    clusters = kmeans.fit_predict(df_scaled)
    df_original = df_original.copy()
    df_original['Clusters'] = clusters

    
    cols_to_exclude = list(df_original.columns[:2]) if df_original.shape[1] >= 2 else []
    aggr_cols = [c for c in df_original.columns if c not in cols_to_exclude and c != 'Clusters']
    aggr = df_original.groupby('Clusters')[aggr_cols].mean(numeric_only=True)

    # Export to script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, f"{out_prefix}.csv")
    out_path1 = os.path.join(script_dir, f"{out_prefix}1.csv")
    
    df_original.to_csv(out_path, index=False)
    aggr.to_csv(out_path1)
    print(f"Exported {out_path} and {out_path1}")

cluster_and_export(dhcb_infra_small, small_scaled, "dhcb_infra_small_rmd")
cluster_and_export(dhcb_infra_medium, medium_scaled, "dhcb_infra_medium_rmd")
cluster_and_export(dhcb_infra_high, high_scaled, "dhcb_infra_high_rmd")

print("Infra processing complete.")
