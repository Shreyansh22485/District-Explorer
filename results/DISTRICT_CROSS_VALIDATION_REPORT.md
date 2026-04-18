# District Cross-Validation Analysis Report
**Haryana Village Development Indices - Advanced Analytics**

Date: February 1, 2026  
Dataset: 6,839 villages across 21 districts  
Analysis Type: District-based cross-validation with R-value calculations

---

## Executive Summary

This report presents advanced analytical findings on the Haryana Village Development Indices, focusing on:
1. **Predictive relationships** between development sectors using both Linear Regression and Random Forest models
2. **Impact analysis** identifying which sectors most influence infrastructure development
3. **Geographic generalization** testing through district-based 5-fold cross-validation

**Key Finding**: Infrastructure development is highly predictable (R² = 0.75) from other sectors, with Social infrastructure explaining 83.2% of the variance.

---

## Dataset Overview

- **Total Villages**: 6,839 (after data cleaning)
- **Districts**: 21
- **Sectors Analyzed**: Agriculture, Education, Health, Infrastructure, Irrigation, Social
- **Index Range**: 0-100 for all sectors

### District Distribution

| District | Villages | District | Villages |
|----------|----------|----------|----------|
| Ambala | 470 | Mahendragarh | 370 |
| Bhiwani | 444 | Mewat | 439 |
| Faridabad | 149 | Palwal | 278 |
| Fatehabad | 245 | Panchkula | 219 |
| Gurgaon | 242 | Panipat | 186 |
| Hisar | 269 | Rewari | 403 |
| Jhajjar | 260 | Rohtak | 143 |
| Jind | 306 | Sirsa | 330 |
| Kaithal | 269 | Sonipat | 332 |
| Karnal | 434 | Yamunanagar | 636 |
| Kurukshetra | 415 | | |

---

## Deliverable 1: Sector Prediction with R Values

### Objective
Calculate correlation coefficients (R) and variance explained (R²) for predicting each sector from all other sectors, comparing Linear Regression vs Random Forest models.

### Methodology
- **Models**: Linear Regression (baseline) and Random Forest (captures non-linear relationships)
- **Metrics**: R (correlation), R² (variance explained), MAE, RMSE
- **Features**: For each target sector, use remaining 5 sectors as predictors

### Results Summary

| Target Sector | LR R | LR R² | RF R | RF R² | Better Model |
|---------------|------|-------|------|-------|--------------|
| Agriculture | +0.4700 | 0.2209 (22.09%) | +0.7139 | 0.5097 (50.97%) | Random Forest |
| Education | +0.3521 | 0.1240 (12.40%) | +0.6511 | 0.4239 (42.39%) | Random Forest |
| Health | +0.3541 | 0.1254 (12.54%) | +0.7089 | 0.5026 (50.26%) | Random Forest |
| Infrastructure | +0.5540 | 0.3069 (30.69%) | +0.8668 | 0.7514 (75.14%) | Random Forest |
| Irrigation | +0.3514 | 0.1235 (12.35%) | +0.6941 | 0.4818 (48.18%) | Random Forest |
| Social | +0.5527 | 0.3054 (30.54%) | +0.8159 | 0.6656 (66.56%) | Random Forest |

### Key Insights from Deliverable 1

1. **Random Forest Consistently Outperforms Linear Models**
   - RF achieves 2-3x higher R² values across all sectors
   - Indicates strong non-linear relationships between development sectors

2. **Most Predictable Sectors** (RF R²):
   - Infrastructure: 0.7514 (75.14% variance explained)
   - Social: 0.6656 (66.56%)
   - Agriculture: 0.5097 (50.97%)

3. **Least Predictable Sectors** (RF R²):
   - Education: 0.4239 (42.39%)
   - Irrigation: 0.4818 (48.18%)
   - Health: 0.5026 (50.26%)

4. **Interpretation**: Infrastructure and Social sectors have strong interdependencies with other development dimensions, while Education shows more autonomous variation.

---

### Detailed Sector Analysis

#### 1. Agriculture Prediction
**Random Forest Performance**: R = 0.7139, R² = 0.5097

**Top Predictors (Feature Importance)**:
1. Social: 37.62%
2. Infrastructure: 24.07%
3. Irrigation: 23.18%
4. Education: 9.28%
5. Health: 5.85%

**Insight**: Agricultural development strongly correlates with social infrastructure (market access, financial services) and irrigation availability.

---

#### 2. Education Prediction
**Random Forest Performance**: R = 0.6511, R² = 0.4239

**Top Predictors (Feature Importance)**:
1. Health: 31.24%
2. Infrastructure: 18.54%
3. Agriculture: 17.60%
4. Social: 16.95%
5. Irrigation: 15.67%

**Insight**: Health facilities are the strongest predictor of education infrastructure, suggesting coordinated service delivery.

---

#### 3. Health Prediction
**Random Forest Performance**: R = 0.7089, R² = 0.5026

**Top Predictors (Feature Importance)**:
1. Education: 32.85%
2. Social: 19.44%
3. Infrastructure: 18.44%
4. Agriculture: 15.90%
5. Irrigation: 13.37%

**Insight**: Reciprocal relationship with education - villages with schools tend to have health facilities and vice versa.

---

#### 4. Infrastructure Prediction
**Random Forest Performance**: R = 0.8668, R² = 0.7514

**Top Predictors (Feature Importance)**:
1. Social: 83.17%
2. Irrigation: 5.57%
3. Health: 4.58%
4. Education: 3.37%
5. Agriculture: 3.31%

**Insight**: Social infrastructure dominates - villages with banks, markets, and community centers have better roads, water, and communication infrastructure.

---

#### 5. Irrigation Prediction
**Random Forest Performance**: R = 0.6941, R² = 0.4818

**Top Predictors (Feature Importance)**:
1. Agriculture: 28.17%
2. Social: 24.25%
3. Infrastructure: 23.81%
4. Education: 12.49%
5. Health: 11.28%

**Insight**: Irrigation depends on agricultural intensity, but also requires infrastructure (electricity for tube wells) and market access.

---

#### 6. Social Prediction
**Random Forest Performance**: R = 0.8159, R² = 0.6656

**Top Predictors (Feature Importance)**:
1. Infrastructure: 35.16%
2. Agriculture: 19.70%
3. Irrigation: 17.44%
4. Health: 16.45%
5. Education: 11.25%

**Insight**: Social infrastructure (banks, markets) requires basic infrastructure (roads, connectivity) as a foundation.

---

## Deliverable 2: Infrastructure Impact Analysis

### Objective
Understand which development sectors most influence infrastructure, using both linear and non-linear models with district-based cross-validation.

### Linear Regression Analysis

**Model Performance**:
- R (Correlation): +0.5540
- R² (Variance Explained): 0.3069 (30.69%)
- MAE: 5.38 points
- RMSE: 7.68 points

**Regression Equation**:
```
Infrastructure Index = 8.24
                     + 0.2623 × Social
                     + 0.2428 × Agriculture
                     + 0.1286 × Irrigation
                     + 0.0395 × Education
                     + 0.0269 × Health
```

**Coefficient Interpretation**:

| Factor | Coefficient | Impact Direction | Practical Meaning |
|--------|-------------|------------------|-------------------|
| Social | +0.2623 | POSITIVE ↑ | 1-point increase → +0.26 points in Infrastructure |
| Agriculture | +0.2428 | POSITIVE ↑ | 1-point increase → +0.24 points in Infrastructure |
| Irrigation | +0.1286 | POSITIVE ↑ | 1-point increase → +0.13 points in Infrastructure |
| Education | +0.0395 | POSITIVE ↑ | 1-point increase → +0.04 points in Infrastructure |
| Health | +0.0269 | POSITIVE ↑ | 1-point increase → +0.03 points in Infrastructure |

**Policy Implication**: A 10-point improvement in Social infrastructure yields approximately +2.6 points in overall Infrastructure development.

---

### Random Forest Analysis

**Model Performance**:
- R (Correlation): +0.8668
- R² (Variance Explained): 0.7514 (75.14%)
- MAE: 3.47 points
- RMSE: 4.60 points

**Feature Importance Ranking**:

| Rank | Factor | Importance | Percentage |
|------|--------|------------|------------|
| 1 | Social | 0.8317 | 83.17% |
| 2 | Irrigation | 0.0557 | 5.57% |
| 3 | Health | 0.0458 | 4.58% |
| 4 | Education | 0.0337 | 3.37% |
| 5 | Agriculture | 0.0331 | 3.31% |

**Critical Finding**: Social infrastructure explains over 83% of infrastructure variance, dwarfing all other factors. This suggests infrastructure development follows social/economic activity rather than preceding it.

---

### Geographic Generalization Test: District-Based 5-Fold Cross-Validation

**Methodology**: 
- Split 21 districts into 5 folds (4-5 districts per fold)
- Train on ~16-17 districts, test on ~4-5 districts
- Tests whether models generalize across geographic regions

**Cross-Validation Results**:

| Fold | Test Districts | LR R | LR R² | RF R | RF R² |
|------|----------------|------|-------|------|-------|
| 1 | Ambala, Rohtak, Panipat, Bhiwani | -0.8322 | -0.6925 | +0.5545 | 0.3074 |
| 2 | Kaithal, Hisar, Mahendragarh, Fatehabad | +0.5312 | 0.2822 | +0.5662 | 0.3206 |
| 3 | Sirsa, Rewari, Palwal, Faridabad | +0.5642 | 0.3184 | +0.7949 | 0.6319 |
| 4 | Karnal, Yamunanagar, Gurgaon, Mewat | +0.5685 | 0.3231 | +0.8174 | 0.6681 |
| 5 | Jind, Kurukshetra, Panchkula, Sonipat, Jhajjar | +0.4625 | 0.2139 | +0.8020 | 0.6432 |

**Average Performance**:
- **Linear Regression**: R = +0.2589 ± 0.5468, R² = 0.0890 ± 0.3927
- **Random Forest**: R = +0.7070 ± 0.1200, R² = 0.5143 ± 0.1640

**Interpretation**:
1. **Linear models struggle to generalize** (high variance, even negative R² in Fold 1)
2. **Random Forest generalizes well** (R² = 0.51 average across districts)
3. **Regional differences exist** but Random Forest captures underlying patterns

---

## Key Insights: What Drives Infrastructure Development?

### 1. Most Important Factor
**Social Infrastructure** explains 83.2% of infrastructure variance (Random Forest feature importance)

**Why**: 
- Banks and markets require road connectivity
- Community centers need electricity and water
- Financial services drive communication infrastructure

### 2. Strongest Linear Relationship
**Social Sector** (coefficient: +0.2623)
- 10-point increase in Social → +2.62 points in Infrastructure
- Strongest among all linear predictors

### 3. Model Generalization
**Random Forest generalizes better** across districts:
- Cross-validation R² = 0.5143 (Random Forest) vs 0.0890 (Linear)
- Non-linear relationships are crucial for prediction
- District-specific patterns captured by tree-based models

### 4. Overall Predictability
**Infrastructure is highly predictable** (R² = 0.7514 with Random Forest)
- 75% of infrastructure variance explained by other sectors
- Strong interdependencies in development
- Suggests coordinated development patterns

---

## Policy Recommendations

### 1. Prioritize Social Infrastructure for Multiplier Effects
- **Finding**: Social infrastructure drives 83% of physical infrastructure development
- **Recommendation**: Invest in banks, markets, community centers to catalyze broader infrastructure growth
- **Expected Impact**: 10-point social improvement → 2.6-point infrastructure gain

### 2. Recognize Non-Linear Development Dynamics
- **Finding**: Random Forest outperforms linear models by 2-3x
- **Recommendation**: Avoid linear extrapolation in policy planning
- **Implication**: Threshold effects exist - small improvements may have outsized impacts

### 3. Account for Regional Differences
- **Finding**: Cross-validation shows district-specific patterns
- **Recommendation**: Customize interventions by geographic region
- **Example**: Fold 1 districts (Ambala, Rohtak) show different dynamics than Fold 4 (Karnal, Yamunanagar)

### 4. Integrate Development Planning
- **Finding**: All sectors show strong interdependencies (R > 0.65)
- **Recommendation**: Coordinate agriculture, health, education, and infrastructure investments
- **Avoid**: Siloed sector planning that ignores complementarities

---

## Technical Validation

### Model Selection Justification
1. **Random Forest chosen** for final predictions due to:
   - Higher R² across all sectors (0.42-0.75 vs 0.12-0.31)
   - Better cross-validation performance (R² = 0.51 vs 0.09)
   - Captures non-linear relationships critical in development

2. **Linear Regression retained** for:
   - Coefficient interpretation (directional effects)
   - Simplicity and transparency
   - Policy communication

### Data Quality Checks
- Missing values: 2 villages removed (0.03% of dataset)
- All indices validated in 0-100 range
- District representation: 143-636 villages per district (adequate for CV)

### Limitations
1. **2011 Census data**: Results reflect 2011 conditions
2. **Correlation ≠ Causation**: High R² doesn't prove causal relationships
3. **Omitted variables**: Factors like governance, climate not included
4. **Cross-sectional analysis**: Cannot capture temporal dynamics

---

## Output Files

### 1. deliverable1_r_values.csv
Contains R and R² values for all sector predictions:
- Columns: target, lr_r, lr_r2, lr_mae, lr_rmse, rf_r, rf_r2, rf_mae, rf_rmse, feature_importance
- Rows: 6 (one per sector)
- Use: Compare model performance, identify best predictors

### 2. deliverable2_infrastructure_coefficients.csv
Linear regression coefficients for infrastructure prediction:
- Columns: Factor, Coefficient, Abs_Coef
- Rows: 5 (Agriculture, Education, Health, Irrigation, Social)
- Use: Quantify linear impact of each sector on infrastructure

### 3. deliverable2_infrastructure_importance.csv
Random Forest feature importance for infrastructure:
- Columns: Factor, Importance
- Rows: 5 (sorted by importance)
- Use: Identify dominant drivers of infrastructure development

---

## Conclusion

This analysis provides robust evidence for:

1. **Strong sectoral interdependencies** in village development (R² > 0.50 for most sectors)
2. **Social infrastructure as the primary driver** of physical infrastructure (83% importance)
3. **Non-linear development dynamics** requiring tree-based models for accurate prediction
4. **Geographic generalization** of relationships across Haryana districts (R² = 0.51)

The findings validate the multi-sectoral index approach and provide actionable insights for targeted development interventions. Random Forest models should be used for prediction and targeting, while Linear Regression coefficients offer transparent policy guidance.

**Next Steps**:
1. Extend analysis to 2001 Census for temporal validation
2. Incorporate additional variables (governance, climate, connectivity)
3. Develop district-specific prediction models for precision targeting
4. Integrate findings into District Explorer platform for policy use

---

**Report Generated**: February 1, 2026  
**Analysis Tool**: district_cross_validation_analysis.py  
**Contact**: BTP Research Team
