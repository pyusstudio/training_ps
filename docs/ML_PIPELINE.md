# ML Pipeline Documentation (PoC)

The ML Pipeline is a collection of scripts designed to transition from a rule-based scoring engine to a machine-learning-based intent classifier.

## Overview
The pipeline follows a standard ML workflow:
1.  **Data Collection**: Gathering example transcripts.
2.  **Preprocessing**: Converting text into numerical embeddings.
3.  **Training**: Fitting a classifier to those embeddings.
4.  **Export**: Saving the model for backend inference.

## Scripts Description

### 1. `scrape_data.py`
- **Purpose**: Simulates the collection of raw dialogue samples.
- **Output**: Generates a set of hardcoded examples for `Isolate`, `Empathy`, and `Defensive` intents. 
- **Production Note**: In a full system, this script would be replaced by a connector to verified training data or simulated roleplays.

### 2. `prepare_dataset.py`
- **Purpose**: Prepares the data for training.
- **Actions**: 
    - Loads the raw samples.
    - Uses **SBERT** (`sentence-transformers`) to generate semantic embeddings for each text snippet.
- **Output**: Saves the embeddings and corresponding labels into a `ml_dataset.json` file.

### 3. `train_classifier.py`
- **Purpose**: Trains a lightweight classifier.
- **Actions**:
    - Loads `ml_dataset.json`.
    - Trains a **Logistic Regression** model using Scikit-Learn.
    - Evaluates the model with a classification report (precision, recall, f1-score).
- **Output**: Exports the trained model as `ml_models/intent_classifier.joblib`.

## Integration with Backend
The Backend is pre-wired to utilize the exported model. 
To enable it:
1.  Ensure `ml_models/intent_classifier.joblib` exists.
2.  Update the `backend/.env` file:
    ```env
    USE_LEARNING_MODEL=True
    LEARNING_MODEL_PATH=ml_models/intent_classifier.joblib
    ```

## Requirements
To run the ML scripts, you need the following Python packages (installed in the backend environment):
- `sentence-transformers`
- `scikit-learn`
- `joblib`
- `pandas` / `numpy`
