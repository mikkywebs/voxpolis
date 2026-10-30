#!/usr/bin/env bash
# Starts the built site and checks key routes. Prints one GitHub annotation with results.
set -u
npx next start -p 3100 > /tmp/next.log 2>&1 &
PID=$!
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3100/robots.txt && break; sleep 1; done
out=""
check() { # path, expected content-type fragment, grep pattern
  local code type size body
  code=$(curl -s -o /tmp/body -w '%{http_code}|%{content_type}|%{size_download}' "http://localhost:3100$1")
  body=$(grep -a -o -m1 -E "$3" /tmp/body | head -c 120)
  out="$out$1 → $code${body:+ | found: $body}%0A"
}
check / text/html '<h1[^>]*>[^<]+'
check /nigeria text/html '<h1[^>]*>[^<]+'
check /ng text/html 'nigeria'
check /not-a-country text/html 'not-found|404'
check /how-we-report text/html '<h1[^>]*>[^<]+'
check /robots.txt text/plain 'Sitemap: [^ ]+'
check /sitemap.xml xml '<loc>[^<]+'
check /news-sitemap.xml xml 'urlset'
check /feed.xml xml '<title>[^<]+'
check /ads.txt text/plain '.+'
check /nigeria/no-such-story text/html 'not-found|404'
check /news/old-style-slug-2026-10-30-abcd text/html 'not-found|404'
check /forgot-password text/html '<h1[^>]*>[^<]+'
check /login text/html 'Forgot password'
check /card/test-story image 'PNG'
size=$(stat -c %s /tmp/body 2>/dev/null || echo 0)
out="${out}card bytes: $size%0A"
kill $PID 2>/dev/null
echo "$out" | sed 's/%0A/\n/g'
echo "::notice title=Smoke::$out"
grep -iE "error|warn" /tmp/next.log | head -5
