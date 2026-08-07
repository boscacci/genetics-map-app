import sys
from pathlib import Path

import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

from phone_cleaning import clean_phone
import clean_and_validate


def test_clean_phone_strips_google_sheets_text_escape():
    assert clean_phone("'+91-044-28296490") == "+91-044-28296490"


def test_clean_phone_drops_formula_error_values():
    assert clean_phone("#ERROR!") is None


def test_cleaning_preserves_explicit_interpreter_service_values(monkeypatch):
    source = pd.DataFrame(
        [
            {
                "name_first": "Ada",
                "name_last": "Lovelace",
                "language_spoken": "English, French",
                "uses_interpreters": "TRUE",
            },
            {
                "name_first": "Grace",
                "name_last": "Hopper",
                "language_spoken": "English with interpreter services available",
                "uses_interpreters": "FALSE",
            },
        ]
    )

    class FakePath:
        def exists(self):
            return True

        def read_text(self):
            return "spreadsheet-id"

        def __str__(self):
            return "credentials.json"

    captured = {}
    monkeypatch.setattr(clean_and_validate, "CREDENTIALS_PATH", FakePath())
    monkeypatch.setattr(clean_and_validate, "SHEET_ID_PATH", FakePath())
    monkeypatch.setattr(
        clean_and_validate.service_account.Credentials,
        "from_service_account_file",
        lambda *args, **kwargs: object(),
    )
    monkeypatch.setattr(clean_and_validate, "build", lambda *args, **kwargs: object())
    monkeypatch.setattr(
        clean_and_validate,
        "_read_production_from_sheet",
        lambda sheets, spreadsheet_id: (clean_and_validate.SHEET_HEADERS, source.copy()),
    )
    monkeypatch.setattr(
        clean_and_validate,
        "_write_to_production",
        lambda sheets, spreadsheet_id, header_row, df: captured.update(df=df.copy()),
    )
    monkeypatch.setattr(sys, "argv", ["clean_and_validate.py"])

    clean_and_validate.main()

    assert captured["df"]["uses_interpreters"].tolist() == ["TRUE", "FALSE"]
