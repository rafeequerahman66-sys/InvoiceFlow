# UI Wireframes (text)

Layout: fixed left sidebar (≥ md) + content area. Dark/light via class on `<html>`.

## Dashboard
```
┌────────┬──────────────────────────────────────────────────────┐
│ ₹ Invo │  Dashboard                       [New quote][New inv]  │
│  Flow  │ ┌─────┬─────┬─────┬─────┬─────┬─────┐                  │
│        │ │Rev. │Pend.│Over.│Paid │Draft│Quote│  KPI cards       │
│ Dash●  │ └─────┴─────┴─────┴─────┴─────┴─────┘                  │
│ Invoic │ ┌──────────────────────────┐ ┌───────────────────┐    │
│ Quotes │ │ Monthly revenue (bars)   │ │ Recent quotations │    │
│ Client │ │  ▁▂▅▃▆▇▅▂▃▅▆█            │ │  QT/.. ₹..  [SENT]│    │
│ Catalog│ └──────────────────────────┘ └───────────────────┘    │
│        │ ┌──────────────────────────────────────────────────┐  │
│ 🌙 Dark│ │ Recent invoices (number · client · total · badge)│  │
│ Signout│ └──────────────────────────────────────────────────┘  │
└────────┴──────────────────────────────────────────────────────┘
```

## Invoice / Quote builder
```
┌ New invoice ───────────────────────────────────────────────┐
│ [Client ▾]  [Currency ▾]   [Issue date]  [Due date]         │
│ [Supply type ▾ — auto from client]                          │
│ Line items                                                  │
│  ┌ Description ──────────────┐ [Qty][ Rate ][Tax%] (×)      │
│  │ item notes…   [✨ AI describe]                            │
│  + Add line                                                 │
│ [Discount][type ▾]    [Notes…]            ┌ Totals ───────┐ │
│                                           │ Subtotal …    │ │
│                                           │ CGST/SGST|IGST│ │
│                                           │ Total  ₹….    │ │
│                                           │ [Save invoice]│ │
└───────────────────────────────────────────────────────────┘
```

## Invoice detail
```
← Invoices
INV/2026-27/0001   [PAID]    [Record payment][Mark paid][PDF][Send]
                              [Public link][Payment link][Duplicate][Cancel]
┌ Line items ───────────────────┐  ┌ Client ───────┐
│ table…              Subtotal   │  │ Acme · GSTIN  │
│                     CGST/SGST  │  ├ Details ──────┤
│                     Total      │  │ dates, supply │
│                     Paid/Bal.  │  ├ Payments ─────┤
└───────────────────────────────┘  │ list          │
```

## Public share / Print sheet (A4)
```
RIN MEDIA                                   TAX INVOICE
Crew Catalyst Innovations            INV/2026-27/0001
GSTIN ……                             Issue / Due dates
────────────────────────────────────────────────────
BILL TO …                            Supply · Place · Currency
Item            SAC   Qty  Rate  Tax%   Amount
…                                        Subtotal / GST / Total
Payment details (bank)              [Scan to pay]  Authorised sign.
```
