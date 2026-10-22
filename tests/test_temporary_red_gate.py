"""Temporary CI negative-control check; delete after proving the red gate."""

import unittest


class RedGateTest(unittest.TestCase):
    def test_fail_closed(self):
        self.fail("intentional red-gate control: CI must report failure")


if __name__ == "__main__":
    unittest.main()
