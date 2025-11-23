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

# --- 2. Inverse Distance Columns ---
distance_cols = [col for col in dhcb_education.columns if 'Distance' in col or 
                 col.startswith('(If.not.available.within.the.village')]

for col in distance_cols[:-1]:
    if col in dhcb_education.columns:
        dhcb_education[col] = 15 - dhcb_education[col]

# Handle the long column name separately and then drop it
long_col = [c for c in dhcb_education.columns if c.startswith('(If.not.available.within.the.village')]
if long_col:
    dhcb_education['Distance10'] = 15 - dhcb_education[long_col[0]]
    dhcb_education = dhcb_education.drop(columns=long_col)

# --- 3. Filter for High Population Villages (>2500 population) ---
dhcb_education_high = dhcb_education[dhcb_education['Total.Population.of.Village'] > 2500].copy()

print(f"\nHigh villages (>2500 pop): {dhcb_education_high.shape[0]} rows")
print(f"Columns: {dhcb_education_high.shape[1]}")

# --- 4. Scale Numerical Features ---
# Select columns 3:29 (2:29 in Python 0-indexing)
scaling_cols = dhcb_education_high.columns[2:29]

print(f"\nScaling {len(scaling_cols)} columns for clustering...")

scaler = StandardScaler()
dhcb_education_high_scaled = pd.DataFrame(
    scaler.fit_transform(dhcb_education_high[scaling_cols]), 
    columns=scaling_cols
)

# Remove column with zero variance (column 25 in R = index 24 in Python)
# No "Total.School.For.Disabled" in villages having population above 2500
cols_to_drop = []
if 24 < len(dhcb_education_high_scaled.columns):
    cols_to_drop.append(dhcb_education_high_scaled.columns[24])

dhcb_education_high_scaled1 = dhcb_education_high_scaled.drop(columns=cols_to_drop)

print(f"After removing zero-variance columns: {dhcb_education_high_scaled1.shape}")
print(f"Columns in scaled data: {dhcb_education_high_scaled1.columns.tolist()}")
print(f"Missing values: {dhcb_education_high_scaled1.isna().sum().sum()}")

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

print("\nGenerating Elbow plot for High Villages...")
wss_plot(dhcb_education_high_scaled1, title='Elbow Plot for High Villages (Education)')

# --- 6. Perform K-Means Clustering ---
K = 4
print(f"\nPerforming k-means clustering with k={K}...")

kmeans_high = KMeans(n_clusters=K, n_init=10, random_state=42)
dhcb_education_high['Clusters'] = kmeans_high.fit_predict(dhcb_education_high_scaled1)

print("Clustering complete. 'Clusters' column added.")
print(f"Columns in final dataframe: {dhcb_education_high.columns.tolist()}")

# --- 7. Aggregate Results by Cluster ---
# Exclude columns 1, 2, 27 (indices 0, 1, 26 in Python)
cols_to_exclude = [0, 1]
if dhcb_education_high.shape[1] > 27:
    cols_to_exclude.append(26)

aggr_cols = [col for idx, col in enumerate(dhcb_education_high.columns) 
             if idx not in cols_to_exclude and col != 'Clusters']

aggr = dhcb_education_high.groupby('Clusters')[aggr_cols].mean(numeric_only=True)

print("\nAggregated cluster means for high villages:")
print(aggr)

# --- 8. Export Results to CSV ---
print("\nExporting results to CSV files...")

dhcb_education_high.to_csv("00_dhcb_education_high.csv", index=False)
aggr.to_csv("00_dhcb_education_high1.csv")

print("All files have been successfully exported.")
