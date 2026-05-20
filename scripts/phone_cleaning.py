import re


def _is_nullish(val) -> bool:
    if val is None:
        return True
    try:
        return bool(val != val)
    except TypeError:
        return False


def clean_phone(val):
    if _is_nullish(val):
        return None
    val_str = str(val).strip()
    if re.match(r"^'[=+\-@]", val_str):
        val_str = val_str[1:].strip()
    if val_str.lower() in ("prefer not to say", "") or val_str.upper() == "#ERROR!":
        return None
    if "/" in val_str:
        parts = [p.strip() for p in val_str.split("/")]
        for part in parts:
            if re.search(r"(\+?\d[\d\s\-\(\)]{5,})", part):
                val_str = part
                break
    val_str = re.sub(r" {2,}", " ", val_str.strip())
    return val_str if val_str else None
