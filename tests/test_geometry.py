"""La versión Python y la web comparten casos geométricos verificables."""
import json
import math
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "calculador_potencias"))
from clases_calculadora import calcula_endpoint, calcula_punto, calcula_deltas


class GeometryTests(unittest.TestCase):
    def test_shared_fixtures(self):
        fixtures = json.loads((ROOT / "tests/fixtures/geometry.json").read_text(encoding="utf-8"))
        for fixture in fixtures:
            with self.subTest(fixture=fixture["name"]):
                config = fixture["config"]
                values = tuple(config[key] for key in ("length", "angle", "height", "reach", "rotation"))
                x, y = calcula_punto(fixture["headAngle"], values)
                self.assertAlmostEqual(x, fixture["expected"]["x"], places=9)
                self.assertAlmostEqual(y, fixture["expected"]["y"], places=9)

    def test_original_example(self):
        x, y = calcula_endpoint(72.5, 110, -6, 27.5)
        self.assertAlmostEqual(x, -27.5 * math.cos(math.radians(72.5)) + 110 * math.cos(math.radians(11.5)))
        self.assertAlmostEqual(y, 27.5 * math.sin(math.radians(72.5)) + 110 * math.sin(math.radians(11.5)))

    def test_neutral_and_negative_deltas(self):
        config = (100, -18, 0, 70, 0)
        self.assertIn("mismo alcance, misma altura", calcula_deltas([("A", config), ("B", config)], 72)[0])
        self.assertIn("10.0 mm más atrás", calcula_deltas([("A", config), ("B", (90, -18, 0, 70, 0))], 72)[0])

    def test_invalid_data(self):
        with self.assertRaises(ValueError):
            calcula_deltas([], 72)
        for value in (float("nan"), float("inf"), -1, 0, "100", True):
            with self.subTest(value=value), self.assertRaises(ValueError):
                calcula_endpoint(72, value, 6, 10)


if __name__ == "__main__":
    unittest.main()
