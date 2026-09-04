# Deal workflow

The production database now contains additive tables for offers, contracts, contract versions, commissions, payment schedules, and payment records.

The application migration will expose these records through the authenticated Express API. Existing Deal, Client, Property, Viewing, and media workflows remain unchanged.

No destructive migration or localStorage deletion is performed as part of this batch.
