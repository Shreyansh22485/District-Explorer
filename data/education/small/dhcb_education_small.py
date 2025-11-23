import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt

# --- 1. Load and Prepare Data ---
try:
    # Read the Excel file
    dhcb = pd.read_excel("D:\\BTP\\analysis\\DCHB_Village_Release_0600 v1.xlsx")
    print("Excel file loaded successfully.")
    print(f"Original data shape: {dhcb.shape}")
except FileNotFoundError:
    print("Error: 'DCHB_Village_Release_0600 v1.xlsx' not found.")
    print("Please ensure the Excel file is in the correct directory.")
    exit()

# Clean column names: strip whitespace and replace spaces with dots
dhcb.columns = dhcb.columns.str.strip().str.replace(r'\s+', '.', regex=True)

# Select education-related columns (columns 2:30 in R, which is 1:30 in Python 0-indexing)
dhcb_education = dhcb.iloc[:, 1:30].copy()

print(f"\nSelected education data shape: {dhcb_education.shape}")
print("Columns selected for analysis:")
print(dhcb_education.columns.tolist())

# --- 2. Inverse Distance Columns ---
# Distance columns: lower values mean farther, so we inverse them (15 - value)
distance_cols = [col for col in dhcb_education.columns if 'Distance' in col or 
                 col.startswith('(If.not.available.within.the.village')]

for col in distance_cols[:-1]:  # Exclude the last problematic column
    if col in dhcb_education.columns:
        dhcb_education[col] = 15 - dhcb_education[col]

# Handle the long column name separately and then drop it
long_col = [c for c in dhcb_education.columns if c.startswith('(If.not.available.within.the.village')]
if long_col:
    # Create Distance10 from the long column name
    dhcb_education['Distance10'] = 15 - dhcb_education[long_col[0]]
    # Drop the original long column
    dhcb_education = dhcb_education.drop(columns=long_col)

print(f"\nAfter distance inversion and cleanup: {dhcb_education.shape}")

# --- 3. Split Data by Population Size ---
dhcb_education_small = dhcb_education[dhcb_education['Total.Population.of.Village'] < 1000].copy()
dhcb_education_medium = dhcb_education[
    (dhcb_education['Total.Population.of.Village'] >= 1000) & 
    (dhcb_education['Total.Population.of.Village'] <= 2500)
].copy()
dhcb_education_high = dhcb_education[dhcb_education['Total.Population.of.Village'] > 2500].copy()

print("\nData segmented by population:")
print(f"Small villages (<1000 pop): {dhcb_education_small.shape[0]} rows")
print(f"Medium villages (1000-2500 pop): {dhcb_education_medium.shape[0]} rows")
print(f"High villages (>2500 pop): {dhcb_education_high.shape[0]} rows")

# --- 4. Scale Numerical Features for Small Villages ---
# Select columns 3:29 (2:29 in Python 0-indexing)
scaling_cols = dhcb_education_small.columns[2:29]

print(f"\nScaling {len(scaling_cols)} columns for clustering...")

scaler = StandardScaler()
dhcb_education_small_scaled = pd.DataFrame(
    scaler.fit_transform(dhcb_education_small[scaling_cols]), 
    columns=scaling_cols
)

# Remove columns with zero variance (columns 24, 25 in R = indices 23, 24 in Python)
# These likely correspond to facilities that don't exist in small villages
cols_to_drop = []
for idx in [23, 24]:
    if idx < len(dhcb_education_small_scaled.columns):
        cols_to_drop.append(dhcb_education_small_scaled.columns[idx])

dhcb_education_small_scaled1 = dhcb_education_small_scaled.drop(columns=cols_to_drop)

print(f"After removing zero-variance columns: {dhcb_education_small_scaled1.shape}")
print(f"Missing values: {dhcb_education_small_scaled1.isna().sum().sum()}")

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
wss_plot(dhcb_education_small_scaled1, title='Elbow Plot for Small Villages (Education)')

# --- 6. Perform K-Means Clustering ---
K = 4
print(f"\nPerforming k-means clustering with k={K}...")

kmeans_small = KMeans(n_clusters=K, n_init=3, random_state=42)
dhcb_education_small['Clusters'] = kmeans_small.fit_predict(dhcb_education_small_scaled1)

print("Clustering complete. 'Clusters' column added.")

# --- 7. Aggregate Results by Cluster ---
# Exclude columns 1, 2, 26, 27 (indices 0, 1, 25, 26 in Python)
cols_to_exclude = [0, 1]
if dhcb_education_small.shape[1] > 26:
    cols_to_exclude.extend([25, 26])

aggr_cols = [col for idx, col in enumerate(dhcb_education_small.columns) 
             if idx not in cols_to_exclude and col != 'Clusters']

aggr = dhcb_education_small.groupby('Clusters')[aggr_cols].mean(numeric_only=True)

print("\nAggregated cluster means for small villages:")
print(aggr)

# --- 8. Export Results to CSV ---
print("\nExporting results to CSV files...")

dhcb_education_small.to_csv("00_dhcb_education_small.csv", index=False)
aggr.to_csv("00_dhcb_education_small1.csv")

print("All files have been successfully exported.")
print(f"Working directory: {pd.io.common.get_filepath_or_buffer('')[1]}")
