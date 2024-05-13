const { floor } = Math
$.bsearch = (a, cmp) => {
  let l = 0, r = a.length - 1
  while (l <= r) {
    let m = floor((l + r) / 2), c = cmp(a[m])
    if (c > 0) { r = m - 1 } else if (c < 0) { l = m + 1 } else { return m }
  } return -1
}
$.bsleft = (a, cmp, l = 0, r = a.length, m) => {
  while (l < r) { m = floor((l + r) / 2); cmp(a[m]) < 0 ? l = m + 1 : r = m } return l
}
$.bsright = (a, cmp, l = 0, r = a.length) => {
  while (l < r) { m = floor((l + r) / 2); cmp(a[m]) > 0 ? r = m : l = m + 1 } return r - 1
}
// $.bsearch = bsright
// $.bsearch = bsleft

{
  const cmp = t => v => v.startsWith(t) ? 0 : v.localeCompare(t)
  const a = ["a", "bc", "aa", "_a", "cdeh", "11", "234"].sort()
  log(a)
  log(bsearch(a, cmp("a"))) // -> 3
  log(bsright(a, cmp("a"), 3)) // -> 4
  log(bsright(a, cmp("aa"), 3)) // -> 4
  log(bsearch(a, cmp("aa"))) // -> 4
  log(bsearch(a, cmp("b"))) // -> 5
}

{
  const a = [1, 3, 7, 8, 11, 23, 58, 79, 101, 211, 333, 456]
  log(a)
  log(bsearch(a, v => v - 1)) // -> 0
  log(bsearch(a, v => v - 23)) // -> 5
  log(bsearch(a, v => v - 211)) // -> 9
  log(bsearch(a, v => v - 555)) // -> -1
  log(bsright(a, v => v - 211, 9)) // -> 9
  log(bsearch(a, v => v + 100)) // -> -1
}