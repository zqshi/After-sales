import unittest

from src.events.bridge import NodeEventLedger


class NodeEventLedgerTest(unittest.TestCase):
    def test_recording_maintains_max_entries(self):
        ledger = NodeEventLedger(max_entries=2)
        ledger.record({"eventType": "Chat", "aggregateId": "conv-1"})
        ledger.record({"eventType": "Task", "aggregateId": "task-1"})
        ledger.record({"eventType": "Alert", "aggregateId": "alert-1"})

        recent = ledger.recent()
        self.assertEqual(len(recent), 2)
        self.assertEqual(recent[0]["aggregateId"], "task-1")
        self.assertEqual(recent[1]["aggregateId"], "alert-1")

    def test_clear_resets_state(self):
        ledger = NodeEventLedger(max_entries=2)
        ledger.record({"eventType": "Foo", "aggregateId": "foo"})
        ledger.clear()
        self.assertEqual(ledger.recent(), [])
