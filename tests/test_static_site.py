"""Offline regression checks for the local-first static reading demo."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PageMarkup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.lang = None
        self.ids = set()
        self.local_assets = []
        self.new_tab_links = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "html":
            self.lang = attrs.get("lang")
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "script" and attrs.get("src"):
            self.local_assets.append(attrs["src"])
        if tag == "link" and "stylesheet" in (attrs.get("rel") or "").split():
            if attrs.get("href"):
                self.local_assets.append(attrs["href"])
        if tag == "a" and attrs.get("target") == "_blank":
            self.new_tab_links.append(attrs)


class StaticSiteTests(unittest.TestCase):
    def parse_page(self, relative_path):
        path = ROOT / relative_path
        self.assertTrue(path.is_file(), f"Missing page: {relative_path}")
        parser = PageMarkup()
        parser.feed(path.read_text(encoding="utf-8"))
        parser.close()
        return parser

    def test_root_entrypoint_links_to_web(self):
        root_index = ROOT / "index.html"
        content = root_index.read_text(encoding="utf-8")
        self.assertIn('content="0; url=web/"', content)
        self.assertIn('href="web/"', content)
        self.assertTrue((ROOT / "web/index.html").is_file())

    def test_local_assets_exist_without_remote_dependencies(self):
        for relative_path in ("index.html", "web/index.html"):
            with self.subTest(page=relative_path):
                markup = self.parse_page(relative_path)
                self.assertEqual(markup.lang, "zh-CN")
                for asset_url in markup.local_assets:
                    parsed = urlsplit(asset_url)
                    self.assertFalse(parsed.scheme or parsed.netloc, asset_url)
                    self.assertFalse(parsed.path.startswith("/"), asset_url)
                    asset_path = (ROOT / relative_path).parent / unquote(parsed.path)
                    self.assertTrue(asset_path.is_file(), f"Missing asset: {asset_path}")

        web_markup = self.parse_page("web/index.html")
        self.assertIn("styles.css", web_markup.local_assets)
        self.assertIn("app.js", web_markup.local_assets)

    def test_reading_stages_remain_present(self):
        markup = self.parse_page("web/index.html")
        for element_id in ("ritualView", "readingView", "exitView"):
            with self.subTest(element_id=element_id):
                self.assertIn(element_id, markup.ids)

    def test_new_tab_links_are_protected(self):
        for page in ("index.html", "web/index.html"):
            markup = self.parse_page(page)
            for link in markup.new_tab_links:
                with self.subTest(page=page, href=link.get("href")):
                    rel = set((link.get("rel") or "").split())
                    self.assertIn("noopener", rel)
                    self.assertIn("noreferrer", rel)


if __name__ == "__main__":
    unittest.main()
