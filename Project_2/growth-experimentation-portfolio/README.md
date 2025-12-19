# 🧪 Growth Experimentation Portfolio

A rigorous A/B testing framework demonstrating scientific methodology for growth engineering.

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📊 Project Overview

This repository showcases a complete A/B testing workflow, from hypothesis definition to executive decision memo. It demonstrates:

- **Statistical Rigor**: Proper power analysis, sample size calculation, and hypothesis testing
- **Reproducible Analysis**: Configurable simulation scripts and reusable analysis modules
- **Leadership Communication**: Professional decision memos for stakeholder consumption

## 🎯 The Experiment

**Hypothesis**: Changing the 'Sign Up' button color from Blue to Green on the mobile landing page will result in a 15% increase in conversion rate.

| Parameter | Value |
|-----------|-------|
| Baseline Conversion | 8% |
| Target Lift | 15% (relative) |
| Significance Level | 0.05 (95% confidence) |
| Statistical Power | 0.80 (80%) |

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/growth-experimentation-portfolio.git
cd growth-experimentation-portfolio

# Install dependencies
pip install -r requirements.txt

# Run the analysis
python src/simulator.py    # Generate test data
python src/stats_engine.py # Analyze results

# Or explore interactively
jupyter notebook notebooks/analysis_walkthrough.ipynb
```

## 📁 Repository Structure

```
├── data/
│   ├── raw/           # Original campaign data
│   └── processed/     # Generated simulation data
├── src/
│   ├── simulator.py   # A/B test data generator
│   ├── stats_engine.py # Statistical analysis
│   └── utils.py       # Common utilities
├── notebooks/
│   └── analysis_walkthrough.ipynb
├── README.md
└── DECISION_MEMO.md   # Executive summary
```

## 📈 Key Results

| Metric | Control | Variant | Lift |
|--------|---------|---------|------|
| Conversion Rate | 8.0% | 9.2% | +15% |
| P-Value | - | - | < 0.05 |
| Recommendation | - | - | **SHIP** |

## 🛠 Technologies

- **Python** - Core analysis language
- **pandas/numpy** - Data manipulation
- **scipy/statsmodels** - Statistical testing
- **matplotlib/seaborn** - Visualization
- **Jupyter** - Interactive analysis

## 📝 Decision Memo

See [DECISION_MEMO.md](DECISION_MEMO.md) for the complete executive summary and recommendation.

## 📚 Methodology

This project follows industry best practices:

1. **Pre-registration**: Hypothesis defined before data collection
2. **Power Analysis**: Sample size calculated to detect meaningful effects
3. **Proper Randomization**: Users randomly assigned to groups
4. **Multiple Testing Correction**: Single primary metric to avoid p-hacking
5. **Guardrail Metrics**: Secondary metrics monitored for adverse effects

## 🤝 About

Created as part of a Growth Engineering portfolio to demonstrate expertise in:
- Experimental design
- Statistical analysis
- Data-driven decision making
- Executive communication

---

*Built with scientific rigor and a passion for growth.*
