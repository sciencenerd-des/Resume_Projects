# Repository Guidelines

## Project Structure & Module Organization
This repository is intentionally data-first. `Project_1` holds `Ecommerce.csv` (transaction funnel snapshot) and `phone_usage_india.csv` (device-level segmentation). `Project_2/AB Testing` contains `control_group.csv` and `test_group.csv` for experimentation walkthroughs. `project_constitution.md` is the authoritative product narrative; treat it as the spec when planning derivatives. Keep new scripts inside a sibling `src/` folder under the relevant project (e.g., `Project_1/src/segmenter.py`) and notebooks under `Project_<n>/notebooks/`. Do not overwrite the raw CSVs—place derived tables in `processed/` subfolders with ISO timestamps.

## Build, Test, and Development Commands
- `python -m venv .venv && source .venv/bin/activate` – provision an isolated analytics environment before touching data.
- `python -c "import pandas as pd; print(pd.read_csv('Project_1/Ecommerce.csv').head())"` – fast smoke-check that the expected schema is still intact.
- `pytest` – execute repository tests once you add automation; gate every pull request on a clean run.

## Coding Style & Naming Conventions
Target Python 3.11+, 4-space indentation, and Black-compatible formatting. Use `snake_case` for modules/functions, `PascalCase` for classes, and suffix data loaders with `_reader` (for example, `ab_reader.py`). Favor pure functions that accept file paths or DataFrames so they are easily testable. Document every public function with a short docstring summarizing the metric being produced and cite the data source (e.g., `Project_2/AB Testing/control_group.csv`).

## Testing Guidelines
Use `pytest` with fixtures that read from lightweight samples under `tests/fixtures/` instead of the full CSVs. Mirror the project tree in `tests/` (e.g., `tests/project_2/test_ab.py`). Validate statistical assumptions (minimum sample size, lift direction, column presence) and target ≥85% statement coverage; add property-based checks for random simulations. Run `pytest -k "<project>"` locally before sharing results to keep feedback cycles short.

## Commit & Pull Request Guidelines
Git history is currently absent in this workspace, so standardize on Conventional Commits (`feat:`, `fix:`, `docs:`) referencing the relevant project directory. Keep commits scoped to one dataset or module and include before/after metrics whenever numerical changes occur. Pull requests must state the business question answered, link back to sections of `project_constitution.md`, attach screenshots or summary tables, and note any privacy considerations when new data sources are introduced.

## Data Handling & Security Tips
Treat all CSVs as immutable source-of-truth files; stage experiments in copies. Never commit rows containing personal identifiers, and scrub exports before sharing externally. Store secrets (API keys for dashboards, automation tokens) via environment variables in your shell profile instead of the repository, and describe the required keys in the PR description.
