import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt

# --- 1. Load and Prepare Data ---
try:
    # Read the Excel file
    dhcb = pd.read_excel("D:/BTP/analysis/DCHB_Village_Release_0600 v1.xlsx")
    print("Excel file loaded successfully.")
    print(f"Original data shape: {dhcb.shape}")
except FileNotFoundError:
    print("Error: 'DCHB_Village_Release_0600 v1.xlsx' not found.")
    print("Please ensure the Excel file is in the correct directory.")
    exit()

# Clean column names: strip whitespace and replace spaces with dots
dhcb.columns = dhcb.columns.str.strip().str.replace(r'\s+', '.', regex=True)

# Select health-related columns (columns 2:8, 31:74 in R, which is 1:8, 30:74 in Python 0-indexing)
selected_cols_indices = np.r_[1:8, 30:74]
dhcb_health = dhcb.iloc[:, selected_cols_indices].copy()

print(f"\nSelected health data shape: {dhcb_health.shape}")
print("Columns selected for analysis:")
print(dhcb_health.columns.tolist())

# --- 2. Inverse Distance Columns ---
# Distance columns: lower values mean farther, so we inverse them (15 - value)
distance_cols = [col for col in dhcb_health.columns if 'Distance' in col]

for col in distance_cols:
    if col in dhcb_health.columns:
        dhcb_health[col] = 15 - dhcb_health[col]

print(f"\nAfter distance inversion: {dhcb_health.shape}")

# --- 3. Split Data by Population Size ---
dhcb_health_small = dhcb_health[dhcb_health['Total.Population.of.Village'] < 1000].copy()
dhcb_health_medium = dhcb_health[
    (dhcb_health['Total.Population.of.Village'] >= 1000) & 
    (dhcb_health['Total.Population.of.Village'] <= 2500)
].copy()
dhcb_health_high = dhcb_health[dhcb_health['Total.Population.of.Village'] > 2500].copy()

print("\nData segmented by population:")
print(f"Small villages (<1000 pop): {dhcb_health_small.shape[0]} rows")
print(f"Medium villages (1000-2500 pop): {dhcb_health_medium.shape[0]} rows")
print(f"High villages (>2500 pop): {dhcb_health_high.shape[0]} rows")

# --- 4. Scale Numerical Features for Small Villages ---
# Select columns 3:51 (2:51 in Python 0-indexing)
scaling_cols = dhcb_health_small.columns[2:51]

print(f"\nScaling {len(scaling_cols)} columns for clustering...")

scaler = StandardScaler()
dhcb_health_small_scaled = pd.DataFrame(
    scaler.fit_transform(dhcb_health_small[scaling_cols]), 
    columns=scaling_cols
)

print(f"Scaled data shape: {dhcb_health_small_scaled.shape}")
print(f"Missing values in scaled data: {dhcb_health_small_scaled.isna().sum().sum()}")

# Remove columns with zero variance for small villages
# Columns to remove (R indices): 6, 7, 8, 26, 27, 28, 42, 43, 44
# Python indices: 5, 6, 7, 25, 26, 27, 41, 42, 43
# These include:
# - Community.Health.Centre and related
# - Hospital.Allopathic and related
# - Mobile.Health.Clinic and related
cols_to_drop = []
drop_indices = [5, 6, 7, 25, 26, 27, 41, 42, 43]
for idx in drop_indices:
    if idx < len(dhcb_health_small_scaled.columns):
        cols_to_drop.append(dhcb_health_small_scaled.columns[idx])

dhcb_health_small_scaled1 = dhcb_health_small_scaled.drop(columns=cols_to_drop)

print(f"After removing zero-variance columns: {dhcb_health_small_scaled1.shape}")
print(f"Columns remaining: {dhcb_health_small_scaled1.columns.tolist()}")
print(f"Missing values: {dhcb_health_small_scaled1.isna().sum().sum()}")

# --- 5. Determine Optimal Number of Clusters (Elbow Method) ---
def wss_plot(data, max_clusters=5, title='Elbow Plot'):
    """
    Calculates and plots the within-cluster sum of squares (WSS) for k-means.
    """
    wss = []
    for i in range(1, max_clusters + 1):
        kmeans = KMeans(n_clusters=i, init='k-means++', n_init=10, random_state=3110)
        kmeans.fit(data)
        wss.append(kmeans.inertia_)
    
    plt.figure()
    plt.plot(range(1, max_clusters + 1), wss, 'bo-')
    plt.title(title)
    plt.xlabel('Number of Clusters')
    plt.ylabel('Within-Cluster Sum of Squares (WSS)')
    plt.grid(True, alpha=0.3)
    plt.show()

print("\nGenerating Elbow plot for Small Villages...")
wss_plot(dhcb_health_small_scaled1, title='Elbow Plot for Small Villages (Health)')

# --- 6. Perform K-Means Clustering ---
K = 4
print(f"\nPerforming k-means clustering with k={K}...")

kmeans_small = KMeans(n_clusters=K, n_init=3, random_state=42)
dhcb_health_small['Clusters'] = kmeans_small.fit_predict(dhcb_health_small_scaled1)

print("Clustering complete. 'Clusters' column added.")

# --- 7. Aggregate Results by Cluster ---
# Exclude columns 1, 2, 8, 9, 10, 28, 29, 30, 44, 45, 46 (indices 0, 1, 7, 8, 9, 27, 28, 29, 43, 44, 45 in Python)
cols_to_exclude = [0, 1, 7, 8, 9, 27, 28, 29, 43, 44, 45]

aggr_cols = [col for idx, col in enumerate(dhcb_health_small.columns) 
             if idx not in cols_to_exclude and col != 'Clusters']

aggr = dhcb_health_small.groupby('Clusters')[aggr_cols].mean(numeric_only=True)

print("\nAggregated cluster means for small villages:")
print(aggr)

# --- 8. Export Results to CSV ---
print("\nExporting results to CSV files...")

dhcb_health_small.to_csv("dhcb_health_small.csv", index=False)
aggr.to_csv("dhcb_health_small1.csv")

print("All files have been successfully exported.")
print(f"Working directory: {pd.io.common.get_filepath_or_buffer('')[1]}")
