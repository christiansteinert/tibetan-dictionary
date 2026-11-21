import unittest
import requests
import os

### A simple set of tests for the backend API. These can be run via the docker compose file

# Configuration: Set the base URL here or via environment variable
BASE_URL = os.getenv("API_BASE_URL", "http://backend-dev/backend/api")

class TestTibetanDictionaryAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Check if the backend is reachable before running tests."""
        try:
            # Simple heartbeat check (optional, depending on your environment)
            requests.get(BASE_URL, timeout=2)
        except requests.exceptions.ConnectionError:
            print(f"Warning: Backend at {BASE_URL} is unreachable. Tests may fail.")

    def test_get_term(self):
        """Test GET /term/{lang}/{term} - Specific term lookup."""
        lang = "bo"
        term = "bde ba"
        url = f"{BASE_URL}/term/{lang}/{term}"
        
        params = {"dictionaries": "RangjungYeshe,Berzin"}
        response = requests.get(url, params=params)
        
        self.assertEqual(response.status_code, 200, f"Expected 200, got {response.status_code}")
        data = response.json()
        self.assertIsInstance(data, dict, "Response should be a dictionary/map of dictionary names.")
        # Exactly the two requested dictionaries, both of which contain "bde ba"
        self.assertEqual(sorted(data.keys()), ["Berzin", "RangjungYeshe"])
        for definition in data.values():
            self.assertIsInstance(definition, str)
            self.assertNotEqual(definition, "")

    def test_get_term_not_found(self):
        """Test GET /term/{lang}/{term} - Unknown term returns an empty object, not an empty array."""
        url = f"{BASE_URL}/term/bo/xyz_nonexistent_term"

        response = requests.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text.strip(), "{}")
        self.assertEqual(response.json(), {})

    def test_unsupported_language_rejected(self):
        """All endpoints return 400 with an error message for a language other than bo/en/sa."""
        requests_to_check = [
            ("GET", f"{BASE_URL}/term/xx/chos", None),
            ("GET", f"{BASE_URL}/terms/xx/chos", None),
            ("GET", f"{BASE_URL}/fulltext/xx/happiness", None),
            ("POST", f"{BASE_URL}/check-terms/xx", {"s1": "chos"}),
        ]
        for method, url, body in requests_to_check:
            with self.subTest(method=method, url=url):
                response = requests.request(method, url, json=body)
                self.assertEqual(response.status_code, 400)
                self.assertIn("error", response.json())

    def test_search_terms_autocomplete(self):
        """Test GET /terms/{lang}/{term} - Prefix-based search."""
        lang = "bo"
        term = "bde*"
        url = f"{BASE_URL}/terms/{lang}/{term}"
        
        params = {
            "offset": 0,
            "maxResults": 20
        }
        response = requests.get(url, params=params)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list, "Expected a list of term objects.")
        if len(data) > 0:
            self.assertIn("term", data[0], "List items should contain a 'term' key.")

    def test_search_terms_autocomplete_question_mark(self):
        """Test GET /terms/{lang}/{term} - Single-character wildcard search."""
        lang = "bo"
        term = "ch?s"
        encoded_term = requests.utils.quote(term, safe='')
        url = f"{BASE_URL}/terms/{lang}/{encoded_term}"

        params = {
            "offset": 0,
            "maxResults": 20
        }
        response = requests.get(url, params=params)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list, "Expected a list of term objects.")
        self.assertGreater(len(data), 10, "Expected non-empty result set for wildcard search.")
        self.assertRegex(data[0]["term"], r'^ch.s', "Expected result to match the single-char wildcard pattern.")

    def test_check_terms_bulk(self):
        """Test POST /check-terms/{lang} - Bulk existence check."""
        url = f"{BASE_URL}/check-terms/bo"
        payload = {
            "section_1": "bde ba",
            "section_2": "xyz_nonexistent_term_123"
        }
        
        response = requests.post(url, json=payload)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list, "Expected a list of section IDs.")

    def test_fulltext_search(self):
        """Test GET /fulltext/{lang}/{term} - FTS5 search."""
        lang = "en"
        term = "happiness"
        url = f"{BASE_URL}/fulltext/{lang}/{term}"
        
        response = requests.get(url)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Per OpenAPI spec, this returns an array of FtsSearchResult objects
        self.assertIsInstance(data, list)
        assert len(data) > 0
        item = data[0]
        required_keys = ["term", "dictionary", "snippet", "definition", "lang"]
        for key in required_keys:
            self.assertIn(key, item, f"FTS result missing key: {key}")

    def assertJsonError(self, response, status=400):
        """The response must be a JSON ErrorResponse (no PHP warning/HTML output)."""
        self.assertEqual(response.status_code, status)
        self.assertTrue(response.headers.get("Content-Type", "").startswith("application/json"))
        data = response.json()
        self.assertIsInstance(data.get("error"), str)
        return data

    def test_fulltext_invalid_query_rejected(self):
        """Malformed FTS5 expressions return a JSON 400, not a PHP warning."""
        for query in ['"unbalanced', 'compassion AND', 'foo:bar']:
            with self.subTest(query=query):
                encoded = requests.utils.quote(query, safe='')
                response = requests.get(f"{BASE_URL}/fulltext/en/{encoded}")
                data = self.assertJsonError(response)
                self.assertIn("Invalid fulltext query", data["error"])

    def test_non_numeric_paging_params_rejected(self):
        """offset/maxResults must be non-negative integers, otherwise 400."""
        for endpoint in ["terms/bo/chos", "fulltext/en/compassion"]:
            for name in ["offset", "maxResults"]:
                for value in ["abc", "-5", "1.5", "10x"]:
                    with self.subTest(endpoint=endpoint, name=name, value=value):
                        response = requests.get(f"{BASE_URL}/{endpoint}", params={name: value})
                        data = self.assertJsonError(response)
                        self.assertIn(name, data["error"])

    def test_paging_params_clamped(self):
        """Valid but out-of-range integers are clamped (maxResults 1–500)."""
        response = requests.get(f"{BASE_URL}/terms/bo/chos", params={"maxResults": 0})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_dictionaries_filter_not_injectable(self):
        """Dictionary names are treated as literal strings, never as SQL."""
        for value in ['x") OR ("1"="1', "x') OR ('1'='1", "name"]:
            with self.subTest(dictionaries=value):
                response = requests.get(f"{BASE_URL}/term/bo/chos", params={"dictionaries": value})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {})

    def test_fulltext_results_unique(self):
        """An entry matching in both its term and its definition is returned only once."""
        response = requests.get(f"{BASE_URL}/fulltext/en/compassion", params={"maxResults": 500})
        self.assertEqual(response.status_code, 200)
        keys = [(r["dictionaryId"], r["term"], r["definition"]) for r in response.json()]
        self.assertGreater(len(keys), 0)
        self.assertEqual(len(keys), len(set(keys)), "Duplicate rows in fulltext results")

    def test_fulltext_prefix_query_highlighted(self):
        """A prefix query (word*) highlights the complete matching word."""
        response = requests.get(f"{BASE_URL}/fulltext/en/compass*", params={"maxResults": 20})
        self.assertEqual(response.status_code, 200)
        highlighted = [r["highlightedTerm"] for r in response.json()]
        self.assertIn("<em>compassion</em>", highlighted)

    def test_fulltext_lowercase_operator_words_highlighted(self):
        """Lowercase 'not' is a plain word in FTS5 and gets highlighted (no empty <em></em>)."""
        response = requests.get(f"{BASE_URL}/fulltext/en/not", params={"maxResults": 20})
        self.assertEqual(response.status_code, 200)
        rows = response.json()
        self.assertGreater(len(rows), 0)
        for row in rows:
            self.assertNotIn("<em></em>", row["highlightedTerm"])
            self.assertNotIn("<em></em>", row["snippet"])
        self.assertTrue(any("<em>not</em>" in r["highlightedTerm"].lower() for r in rows))

    def test_fulltext_highlighted_term_html_escaped(self):
        """highlightedTerm is HTML-escaped like the snippet."""
        response = requests.get(f"{BASE_URL}/fulltext/en/black", params={"maxResults": 500})
        self.assertEqual(response.status_code, 200)
        row = next((r for r in response.json() if r["term"] == "black & white"), None)
        self.assertIsNotNone(row, "Expected the entry 'black & white' in the results")
        self.assertEqual(row["highlightedTerm"], "<em>black</em> &amp; white")

    def test_caching_headers(self):
        """Successful GETs are cacheable; errors and POSTs are not."""
        ok = requests.get(f"{BASE_URL}/term/bo/chos")
        self.assertIn("Expires", ok.headers)
        error = requests.get(f"{BASE_URL}/term/xx/chos")
        self.assertNotIn("Expires", error.headers)
        self.assertEqual(error.headers.get("Cache-Control"), "no-store")
        post = requests.post(f"{BASE_URL}/check-terms/bo", json={"a": "chos"})
        self.assertNotIn("Expires", post.headers)

    def test_term_is_trimmed(self):
        """Surrounding whitespace in the term is ignored; a blank term is a 400."""
        plain = requests.get(f"{BASE_URL}/term/bo/bde%20ba").json()
        padded = requests.get(f"{BASE_URL}/term/bo/%20bde%20ba%20").json()
        self.assertGreater(len(plain), 0)
        self.assertEqual(plain, padded)
        self.assertJsonError(requests.get(f"{BASE_URL}/term/bo/%20%20"))

    def test_path_decoded_only_once(self):
        """'%2520' is the literal text '%20', not a space — in both URL styles."""
        script_base = BASE_URL.replace("/api", "/api.php")
        for base in [BASE_URL, script_base]:
            with self.subTest(base=base):
                self.assertNotEqual(requests.get(f"{base}/term/bo/bde%20ba").json(), {})
                self.assertEqual(requests.get(f"{base}/term/bo/bde%2520ba").json(), {})

    def test_check_terms_multiple(self):
        """Each term is checked independently (statement is reused)."""
        payload = {"a": "chos", "b": "xyz_nonexistent", "c": "bde ba", "d": "", "e": "chos"}
        response = requests.post(f"{BASE_URL}/check-terms/bo", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), ["a", "c", "e"])


if __name__ == "__main__":
    print(f"Running tests against: {BASE_URL}")
    unittest.main()