import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

from phone_cleaning import clean_phone


def test_clean_phone_strips_google_sheets_text_escape():
    assert clean_phone("'+91-044-28296490") == "+91-044-28296490"


def test_clean_phone_drops_formula_error_values():
    assert clean_phone("#ERROR!") is None
