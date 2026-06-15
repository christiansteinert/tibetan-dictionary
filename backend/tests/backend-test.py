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
        
        params = {"dictionaries": "Rangjung Yeshe,Berzin"}
        response = requests.get(url, params=params)
        
        self.assertEqual(response.status_code, 200, f"Expected 200, got {response.status_code}")
        data = response.json()
        self.assertIsInstance(data, dict, "Response should be a dictionary/map of dictionary names.")

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


if __name__ == "__main__":
    print(f"Running tests against: {BASE_URL}")
    unittest.main()