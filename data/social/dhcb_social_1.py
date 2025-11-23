import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import os

# --- 1. Load Data ---
try:
    dhcb = pd.read_excel(r"D:\BTP\analysis\DCHB_Village_Release_0600 v1.xlsx")
    print("Excel file loaded successfully.")
    print(f"Original data shape: {dhcb.shape}")
except FileNotFoundError:
    print("Error: Excel file not found at D:\\BTP\\analysis\\DCHB_Village_Release_0600 v1.xlsx")
    raise

# Normalize column names
dhcb.columns = dhcb.columns.str.strip().str.replace(r"\s+", ".", regex=True)

# --- 2. Select social-related columns ---
# R: dhcb_social<-dhcb[,c(2:8,114:135)]
# Convert to 0-based indices: 1:8, 113:135
cols_idx = list(range(1,8)) + list(range(113,135))
max_idx = dhcb.shape[1]
cols_idx = [i for i in cols_idx if i < max_idx]

dhcb_social = dhcb.iloc[:, cols_idx].copy()
print(f"Selected social data shape: {dhcb_social.shape}")

# --- 3. Invert distance columns (Distance .. Distance.10) ---
distance_cols = [c for c in dhcb_social.columns if 'Distance' in c]
print(f"Found distance columns: {distance_cols}")
for col in distance_cols:
    dhcb_social[col] = 15 - pd.to_numeric(dhcb_social[col], errors='coerce')

# --- 4. Split by population ---
if 'Total.Population.of.Village' not in dhcb_social.columns:
    raise KeyError("Expected column 'Total.Population.of.Village' not found in selected social columns")

dhcb_social_small = dhcb_social[dhcb_social['Total.Population.of.Village'] < 1000].copy()
dhcb_social_medium = dhcb_social[(dhcb_social['Total.Population.of.Village'] >= 1000) & (dhcb_social['Total.Population.of.Village'] <= 2500)].copy()
dhcb_social_high = dhcb_social[dhcb_social['Total.Population.of.Village'] > 2500].copy()

print(f"Social small: {dhcb_social_small.shape}, medium: {dhcb_social_medium.shape}, high: {dhcb_social_high.shape}")

# --- 5. Impute Distance column for small (R used mean 12.78) ---
distance_main_col = [c for c in dhcb_social_small.columns if c == 'Distance']
if distance_main_col:
    dhcb_social_small[distance_main_col[0]] = dhcb_social_small[distance_main_col[0]].fillna(12.78)
    print(f"Imputed missing values in {distance_main_col[0]} with 12.78")

# --- 6. Scale features ---
# R: dhcb_social_small.Scaled <- scale(dhcb_social_small[,3:29])
def scale_by_positions(df, r_positions):
    positions = [p-1 for p in r_positions]
    positions = [p for p in positions if 0 <= p < df.shape[1]]
    if not positions:
        return pd.DataFrame()
    cols = df.columns[positions]
    scaler = StandardScaler()
    scaled = pd.DataFrame(scaler.fit_transform(df[cols].fillna(0)), columns=cols, index=df.index)
    return scaled

r_pos = list(range(3,30))  # 3:29
small_scaled = scale_by_positions(dhcb_social_small, r_pos)
medium_scaled = scale_by_positions(dhcb_social_medium, r_pos)
high_scaled = scale_by_positions(dhcb_social_high, r_pos)

print(f"Scaled shapes: small {small_scaled.shape}, medium {medium_scaled.shape}, high {high_scaled.shape}")

# --- 7. Remove zero-variance columns ---
# R: small removes col 22, medium/high remove cols 6,7 (from scaled data)
def drop_scaled_cols(scaled_df, r_positions):
    # r_positions are 1-based positions in the scaled matrix
    positions = [p-1 for p in r_positions]
    positions = [p for p in positions if 0 <= p < scaled_df.shape[1]]
    if not positions:
        return scaled_df
    cols_to_drop = scaled_df.columns[positions]
    return scaled_df.drop(columns=cols_to_drop)

small_scaled1 = drop_scaled_cols(small_scaled, [22])
medium_scaled1 = drop_scaled_cols(medium_scaled, [6, 7])
high_scaled1 = drop_scaled_cols(high_scaled, [6, 7])

print(f"After dropping zero-variance: small {small_scaled1.shape}, medium {medium_scaled1.shape}, high {high_scaled1.shape}")

# --- 8. Optional elbow plots ---
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

# Uncomment to view elbow plots
wss_plot(small_scaled1, title='Social Small')
wss_plot(medium_scaled1, title='Social Medium')
wss_plot(high_scaled1, title='Social High')

# --- 9. KMeans clustering & export ---
# Note: R aggregates with different column exclusions per tier:
# small: aggregate(dhcb_social_small[,-c(1,2,24)]...)
# medium/high: aggregate(dhcb_social_medium[,-c(1,2,8,9)]...)

def cluster_and_export(df_original, df_scaled, out_prefix, exclude_positions):
    if df_scaled.shape[0] == 0 or df_scaled.shape[1] == 0:
        print(f"Skipping clustering for {out_prefix}: no scaled data")
        return
    K = 4
    kmeans = KMeans(n_clusters=K, n_init=10, random_state=42)
    clusters = kmeans.fit_predict(df_scaled)
    df_original = df_original.copy()
    df_original['Clusters'] = clusters

    # Aggregate excluding specified positions (1-based R positions)
    positions = [p-1 for p in exclude_positions]
    positions = [p for p in positions if 0 <= p < df_original.shape[1]]
    cols_to_exclude = list(df_original.columns[positions]) if positions else []
    
    aggr_cols = [c for c in df_original.columns if c not in cols_to_exclude and c != 'Clusters']
    aggr = df_original.groupby('Clusters')[aggr_cols].mean(numeric_only=True)

    # Determine output directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, f"{out_prefix}.csv")
    out_path1 = os.path.join(script_dir, f"{out_prefix}1.csv")
    
    df_original.to_csv(out_path, index=False)
    aggr.to_csv(out_path1)
    print(f"Exported {out_path} and {out_path1}")

# Small: exclude cols 1,2,24 (R positions)
cluster_and_export(dhcb_social_small, small_scaled1, "00dhcb_social_small_rmd", [1, 2, 24])

# Medium: exclude cols 1,2,8,9
cluster_and_export(dhcb_social_medium, medium_scaled1, "00dhcb_social_medium_rmd", [1, 2, 8, 9])

# High: exclude cols 1,2,8,9
cluster_and_export(dhcb_social_high, high_scaled1, "00dhcb_social_high_rmd", [1, 2, 8, 9])

print("Social processing complete.")
