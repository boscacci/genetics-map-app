import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

from geocode_working_copy import format_geocode_log_summary


def test_format_geocode_log_summary_redacts_location_values():
    summary = format_geocode_log_summary(
        {
            "lat": "40.7128",
            "lng": "-74.0060",
            "city": "New York",
            "country": "United States",
            "street": "1 Main Street",
            "state": "NY",
            "zip": "10001",
        }
    )

    assert "40.7128" not in summary
    assert "-74.0060" not in summary
    assert "New York" not in summary
    assert "United States" not in summary
    assert "1 Main Street" not in summary
    assert "10001" not in summary
    assert "coordinates" in summary
    assert "address components" in summary
