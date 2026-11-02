# Word lists

`eff-large-words.txt` is the [EFF Large Wordlist](https://www.eff.org/dice) (7,776 words, CC BY 3.0 US,
Electronic Frontier Foundation), with the dice-roll column removed to keep the extension small.

Original file: `eff_large_wordlist.txt`, SHA-256
`addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e`.

To verify or regenerate:

```bash
sha256sum eff_large_wordlist.txt
cut -f2 eff_large_wordlist.txt > eff-large-words.txt
```
