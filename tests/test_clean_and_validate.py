import sys
from pathlib import Path

import pandas as pd
import pytest

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

from phone_cleaning import clean_phone
import clean_and_validate


def test_clean_phone_strips_google_sheets_text_escape():
    assert clean_phone("'+91-044-28296490") == "+91-044-28296490"


def test_clean_phone_drops_formula_error_values():
    assert clean_phone("#ERROR!") is None


@pytest.mark.parametrize("value", [None, pd.NA, float("nan"), "nan", "None", "null"])
def test_sheet_cell_serialization_keeps_missing_values_blank(value):
    assert clean_and_validate._sheet_cell(value) == ""


def test_clean_fields_does_not_stringify_missing_values():
    source = pd.DataFrame(
        [{
            "name_first": None,
            "name_last": pd.NA,
            "work_address": "nan",
            "City": float("nan"),
            "Country": "null",
        }]
    )

    cleaned = clean_and_validate.clean_fields(source)

    assert cleaned.loc[0, "name_first"] is None
    assert pd.isna(cleaned.loc[0, "name_last"])
    assert cleaned.loc[0, "work_address"] == ""
    assert cleaned.loc[0, "City"] == ""
    assert cleaned.loc[0, "Country"] == ""


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


@pytest.mark.parametrize(
    ("explicit_value", "language_value", "expected"),
    [
        (True, "English", "TRUE"),
        (False, "English with interpreter services available", "FALSE"),
        (" true ", "English", "TRUE"),
        ("", "English with interpreter services available", "TRUE"),
        (None, "English", "FALSE"),
        ("unknown", "French with interpreter present", "TRUE"),
        ("unknown", "French", "FALSE"),
    ],
)
def test_interpreter_service_normalization_uses_legacy_inference_only_as_fallback(
    explicit_value, language_value, expected
):
    assert (
        clean_and_validate.normalize_uses_interpreters(
            explicit_value, language_value
        )
        == expected
    )
