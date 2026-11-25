// US-33: reads CSV text into rows of cells (RFC 4180): quoted cells may hold commas, line
// breaks and doubled quotes (""), lines may end in \n or \r\n, and a byte order mark is
// dropped. Files saved by Excel in some regions use semicolons, so the separator is taken
// from the header line: a semicolon when it has more semicolons than commas outside quotes.
export function detectSeparator(text) {
  let commas = 0
  let semicolons = 0
  let quoted = false
  for (const char of text) {
    if (char === '"') quoted = !quoted
    else if (!quoted && (char === '\n' || char === '\r')) break
    else if (!quoted && char === ',') commas += 1
    else if (!quoted && char === ';') semicolons += 1
  }
  return semicolons > commas ? ';' : ','
}

export function parseCsv(input) {
  const text = String(input ?? '').replace(/^\uFEFF/, '')
  const separator = detectSeparator(text)
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  let unclosed = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"' && cell === '') {
      quoted = true
    } else if (char === separator) {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  if (quoted) unclosed = true
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return { rows, separator, unclosed }
}
