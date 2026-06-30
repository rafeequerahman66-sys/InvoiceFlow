# Bundled fonts

These TrueType fonts are embedded into generated invoice/quote PDFs by
`@react-pdf/renderer`. The default PDF font (Helvetica) has no glyph for the
Indian Rupee sign ₹ (U+20B9); **DejaVu Sans** includes it (plus €, £, ¥).

- **DejaVuSans.ttf**, **DejaVuSans-Bold.ttf** — DejaVu Fonts v2.37
  - License: free, permits embedding & redistribution (Bitstream Vera / Arev
    derivative). See https://dejavu-fonts.github.io/License.html
  - Source: https://www.npmjs.com/package/dejavu-fonts-ttf

react-pdf subsets the font (only the glyphs actually used) into each PDF, so the
output stays small (~25–30 KB) despite the ~750 KB source files.
