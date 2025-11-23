import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt


try:
    
    dhcb = pd.read_excel("analysis/DCHB_Village_Release_0600 v1.xlsx")
    print("Excel file loaded successfully.")
    print(f"Original data shape: {dhcb.shape}")
except FileNotFoundError:
    print("Error: 'DCHB_Village_Release_0600 v1.xlsx' not found.")
    print("Please ensure the Excel file is in the correct directory.")
    exit()


dhcb.columns = dhcb.columns.str.strip().str.replace(r'\s+', '.', regex=True)

selected_cols_indices = np.r_[1:8, 135:139, 144:152]
dhcb_agri = dhcb.iloc[:, selected_cols_indices]

print(f"\nSelected agriculture data shape: {dhcb_agri.shape}")
print("Columns selected for analysis:")
print(dhcb_agri.columns.tolist())


 #Filter the DataFrame into three segments based on village population
dhcb_agri_small = dhcb_agri[dhcb_agri['Total.Population.of.Village'] < 1000].copy()
dhcb_agri_medium = dhcb_agri[(dhcb_agri['Total.Population.of.Village'] >= 1000) & (dhcb_agri['Total.Population.of.Village'] <= 2500)].copy()
dhcb_agri_high = dhcb_agri[dhcb_agri['Total.Population.of.Village'] > 2500].copy()

print("\nData segmented by population:")
print(f"Small villages (<1000 pop): {dhcb_agri_small.shape[0]} rows")
print(f"Medium villages (1000-2500 pop): {dhcb_agri_medium.shape[0]} rows")
print(f"High villages (>2500 pop): {dhcb_agri_high.shape[0]} rows")

 #Scale Numerical Features for Clustering 

scaling_cols_indices = np.r_[2:5, 7:19]
scaling_cols_names = dhcb_agri.columns[scaling_cols_indices]

print(f"\nScaling {len(scaling_cols_names)} columns for clustering...")

scaler = StandardScaler()

# Scaling each segment 
dhcb_agri_small_scaled = pd.DataFrame(scaler.fit_transform(dhcb_agri_small[scaling_cols_names]), columns=scaling_cols_names)
dhcb_agri_medium_scaled = pd.DataFrame(scaler.fit_transform(dhcb_agri_medium[scaling_cols_names]), columns=scaling_cols_names)
dhcb_agri_high_scaled = pd.DataFrame(scaler.fit_transform(dhcb_agri_high[scaling_cols_names]), columns=scaling_cols_names)

 #Elbow Method
def wss_plot(data, max_clusters=8, title='Elbow Plot'):
    wss = []
    for i in range(1, max_clusters + 1):
        kmeans = KMeans(n_clusters=i, init='k-means++', n_init=10, random_state=3110)
        kmeans.fit(data)
        wss.append(kmeans.inertia_) #
    
    plt.figure()
    plt.plot(range(1, max_clusters + 1), wss, 'bo-')
    plt.title(title)
    plt.xlabel('Number of Clusters')
    plt.ylabel('Within-Cluster Sum of Squares (WSS)')
    plt.show()

print("\nGenerating Elbow plots to find optimal k...")
wss_plot(dhcb_agri_small_scaled, title='Elbow Plot for Small Villages')
wss_plot(dhcb_agri_medium_scaled, title='Elbow Plot for Medium Villages')
wss_plot(dhcb_agri_high_scaled, title='Elbow Plot for High Villages')

    # K-Means Clustering
K = 4
print(f"\nPerforming k-means clustering with k={K}...")

# Small villages
kmeans_small = KMeans(n_clusters=K, n_init=3, random_state=42)
dhcb_agri_small['Clusters'] = kmeans_small.fit_predict(dhcb_agri_small_scaled)

# Medium villages
kmeans_medium = KMeans(n_clusters=K, n_init=3, random_state=42)
dhcb_agri_medium['Clusters'] = kmeans_medium.fit_predict(dhcb_agri_medium_scaled)

# High villages
kmeans_high = KMeans(n_clusters=K, n_init=3, random_state=42)
dhcb_agri_high['Clusters'] = kmeans_high.fit_predict(dhcb_agri_high_scaled)

print("Clustering complete. 'Clusters' column added to each segment.")

 # Aggregate Results by Cluster 
# Calculate the mean of all numerical columns for each cluster
aggr_agri_small = dhcb_agri_small.groupby('Clusters').mean(numeric_only=True)
aggr_agri_medium = dhcb_agri_medium.groupby('Clusters').mean(numeric_only=True)
aggr_agri_high = dhcb_agri_high.groupby('Clusters').mean(numeric_only=True)

print("\nAggregated cluster means for small villages:")
print(aggr_agri_small)

# Export Results to CSV 
print("\nExporting results to CSV files...")


dhcb_agri_small.to_csv("00_dhcb_agri_small_rmd.csv", index=False)
dhcb_agri_medium.to_csv("00_dhcb_agri_medium_rmd.csv", index=False)
dhcb_agri_high.to_csv("00_dhcb_agri_high_rmd.csv", index=False)

aggr_agri_small.to_csv("00_dhcb_agri_small1_rmd.csv")
aggr_agri_medium.to_csv("00_dhcb_agri_medium1_rmd.csv")
aggr_agri_high.to_csv("00_dhcb_agri_high1_rmd.csv")

print("All files have been successfully exported.")
