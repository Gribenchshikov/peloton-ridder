#!/usr/bin/env python3
"""Builds prototype/peloton-redesign.html and prototype/dist.html from source/site.html.

source/site.html is the editable template — fonts and images are referenced via
__TOKEN__ placeholders so the file stays readable and diffable in git. This script
splices in the real base64 data URIs and writes the two build outputs:

  prototype/peloton-redesign.html  — unwrapped body content, for Artifact publishing
  prototype/dist.html              — same content wrapped in <!DOCTYPE html>/<head>
                                      with a UTF-8 charset meta tag, for standalone
                                      serving (Docker/nginx), which does not get the
                                      wrapper the Artifacts platform adds automatically.

Run from anywhere: python3 source/build.py
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
ASSETS = SRC / "assets"
PHOTOS = ASSETS / "photos"
OUT_DIR = ROOT / "prototype"

IMAGE_TOKENS = {
    "__IMG_HERO__": PHOTOS / "hero.jpg",
    "__IMG_EV_PANORAMA__": PHOTOS / "ev_panorama.jpg",
    "__IMG_EV_RADON__": PHOTOS / "ev_radon.jpg",
    "__IMG_EV_SKI__": PHOTOS / "ev_ski.jpg",
    "__IMG_EV_UPHILL__": PHOTOS / "ev_uphill.jpg",
    "__IMG_LM_FOREST__": PHOTOS / "lm_forest.jpg",
    "__IMG_LM_RIVER__": PHOTOS / "lm_river.jpg",
    "__IMG_LM_SUMMIT__": PHOTOS / "lm_summit.jpg",
    "__IMG_LM_LIFT__": PHOTOS / "lm_lift.jpg",
    "__IMG_LM_MEADOW__": PHOTOS / "lm_meadow.jpg",
    "__IMG_LM_MIST__": PHOTOS / "lm_mist.jpg",
    "__IMG_ABOUT__": PHOTOS / "lm_meadow.jpg",
    "__IMG_ABOUT_BANNER__": PHOTOS / "lm_forest.jpg",
    "__IMG_LOGO__": PHOTOS / "logo.png",
}


def data_uri(path: pathlib.Path) -> str:
    mime = "image/png" if path.suffix == ".png" else "image/jpeg"
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def build() -> str:
    template = (SRC / "site.html").read_text(encoding="utf-8")

    faces = (ASSETS / "fontfaces.css").read_text(encoding="utf-8")
    assert template.count("/*__FONT_FACES__*/") == 1, "font placeholder missing/duplicated"
    template = template.replace("/*__FONT_FACES__*/", faces)

    cache: dict[str, str] = {}
    for token, path in IMAGE_TOKENS.items():
        assert template.count(token) >= 1, f"token {token} not found in site.html"
        key = str(path)
        if key not in cache:
            cache[key] = data_uri(path)
        template = template.replace(token, cache[key])

    assert "__IMG_" not in template, "unreplaced image token left in output"
    assert "__FONT_FACES__" not in template, "unreplaced font placeholder left in output"
    return template


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    body = build()

    artifact_path = OUT_DIR / "peloton-redesign.html"
    artifact_path.write_text(body, encoding="utf-8")

    dist = (
        "<!DOCTYPE html>\n"
        '<html lang="ru">\n'
        "<head>\n"
        '<meta charset="UTF-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        "<title>Peloton Ridder — забеги и клуб</title>\n"
        "</head>\n"
        "<body>\n"
        f"{body}\n"
        "</body>\n"
        "</html>\n"
    )
    dist_path = OUT_DIR / "dist.html"
    dist_path.write_text(dist, encoding="utf-8")

    print(f"wrote {artifact_path} ({artifact_path.stat().st_size/1024/1024:.2f} MB)")
    print(f"wrote {dist_path} ({dist_path.stat().st_size/1024/1024:.2f} MB)")


if __name__ == "__main__":
    main()
