# Stock-In Purchase Journal Recovery

Stock-in payment history uses `produkmasuk_pembayaran` links to associate a
`produkmasuk` entry with its original purchase journal and later repayment
journals. A journal description is useful for display, but is not a reliable
identifier for recovery or subsequent payment management.

## Finding a journal to link

For a selected stock-in entry, the recovery picker searches journals in the
same company and excludes journals already linked to a different stock-in.
It does not require a particular description. A candidate must have:

- Two or three transaction lines.
- Exactly one debit, to a COA named `Persediaan`, for the full stock-in total.
- One or two credit lines whose combined amount equals the stock-in total.
- No credit line to the same `Persediaan` COA.

This supports both a simple purchase journal (one credit account) and a split
initial purchase (for example, cash/bank plus Hutang). The journal must be
balanced and its debit and credit totals are compared to the stock-in total to
two decimal places.

Matching amount and line structure cannot prove that a journal belongs to a
particular stock-in. Before linking, review the candidate's date and credit
account. An unrelated journal with the same company, amount, and structure
could also match.

## After linking

The link in `produkmasuk_pembayaran` becomes the relationship used to manage
the initial purchase journal; its description is preserved. The payment
overview recognizes the linked source journal from its transaction lines,
including an initial payment split between cash/bank and Hutang. Repayment
journals remain separate entries and use Hutang and cash/bank accounts.

For a fully paid stock-in with no source journal to recover, an authorized user
can create the missing purchase journal as Lunas by selecting the cash/bank
account. Partial payments must be recovered by linking the correct existing
journal rather than automatically guessing its cash/Hutang split.
