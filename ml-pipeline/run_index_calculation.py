"""
Quick runner script for index calculation
Handles error checking and provides detailed output
"""

import sys
import os
from pathlib import Path

def check_environment():
    """Check if required packages are installed"""
    print("Checking Python environment...")
    
    required_packages = {
        'pandas': 'pandas',
        'numpy': 'numpy',
        'scipy': 'scipy'
    }
    
    missing = []
    for package, import_name in required_packages.items():
        try:
            __import__(import_name)
            print(f"  ✓ {package}")
        except ImportError:
            missing.append(package)
            print(f"  ✗ {package} - NOT INSTALLED")
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print(f"\nInstall with: pip install {' '.join(missing)}")
        return False
    
    return True


def check_data_files():
    """Check if all required CSV files exist"""
    print("\nChecking data files...")
    
    base_path = Path('analysis')
    if not base_path.exists():
        print(f"✗ Analysis folder not found: {base_path.absolute()}")
        return False
    
    required_files = []
    for stratum in ['high', 'medium', 'small']:
        required_files.extend([
            f"agriculture/dhcb_agri_{stratum}_rmd.csv",
            f"education/{stratum}/dhcb_education_{stratum}_rmd.csv",
            f"health/{stratum}/dhcb_health_{stratum}_rmd.csv",
            f"infra/dhcb_infra_{stratum}_rmd.csv",
            f"irrigation/dhcb_irrig_{stratum}_rmd.csv",
            f"social/dhcb_social_{stratum}_rmd.csv"
        ])
    
    missing = []
    found = []
    for file in required_files:
        filepath = base_path / file
        if filepath.exists():
            found.append(file)
            print(f"  ✓ {file}")
        else:
            missing.append(file)
            print(f"  ✗ {file} - NOT FOUND")
    
    print(f"\nFound {len(found)}/{len(required_files)} required files")
    
    if missing:
        print(f"\n⚠️  Missing {len(missing)} files:")
        for f in missing[:5]:
            print(f"  - {f}")
        if len(missing) > 5:
            print(f"  ... and {len(missing)-5} more")
        return False
    
    return True


def main():
    """Run the index calculation with error handling"""
    print("="*80)
    print("HARYANA DISTRICT EXPLORER - INDEX CALCULATION")
    print("="*80)
    print()
    
    # Check environment
    if not check_environment():
        print("\n❌ Environment check failed. Please install missing packages.")
        sys.exit(1)
    
    # Check data files
    if not check_data_files():
        print("\n❌ Data file check failed. Please ensure all CSV files are present.")
        sys.exit(1)
    
    print("\n✅ All checks passed. Starting index calculation...\n")
    
    # Import and run calculator
    try:
        from index_calculator import IndexCalculator
        
        calculator = IndexCalculator(base_path='analysis')
        calculator.load_all_data()
        calculator.calculate_composite_indices()
        calculator.aggregate_to_districts()
        calculator.export_results()
        
        print("\n" + "="*80)
        print("SUCCESS! Index calculation completed.")
        print("="*80)
        print("\nOutput files:")
        print("  📄 results/village_indices_complete.csv")
        print("  📄 results/district_rankings.csv")
        print("  📄 results/summary_statistics.txt")
        print("\nNext steps:")
        print("  1. Review district rankings in results/district_rankings.csv")
        print("  2. Check summary statistics in results/summary_statistics.txt")
        print("  3. Validate top/bottom districts make sense")
        print("="*80)
        
    except Exception as e:
        print("\n" + "="*80)
        print("❌ ERROR DURING EXECUTION")
        print("="*80)
        print(f"\nError message: {str(e)}")
        print("\nFull traceback:")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
