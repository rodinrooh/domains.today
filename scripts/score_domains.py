import os
from english_words import get_english_words_set
from supabase import create_client

WORDS = get_english_words_set(['web2'], lower=True, alpha=True)
VOWELS = set('aeiou')

HIGH_TLD = {'com': 20, 'io': 18, 'ai': 18, 'co': 16, 'gg': 14, 'xyz': 12}
MID_TLD  = {'net': 10, 'org': 10, 'app': 10, 'dev': 10, 'so': 10}
LOW_TLD  = {'info': 3, 'biz': 3, 'shop': 3, 'vip': 3, 'club': 3}


def score_domain(domain: str) -> int:
    domain = domain.lower().strip()
    parts = domain.rsplit('.', 1)
    if len(parts) != 2:
        return 0
    sld, tld = parts

    pts = 0

    l = len(sld)
    if   l <= 5:  pts += 25
    elif l <= 8:  pts += 20
    elif l <= 11: pts += 15
    elif l <= 15: pts += 8

    if sld in WORDS:
        pts += 30
    else:
        limit = min(len(sld) - 1, 15)
        found = False
        for i in range(2, limit):
            if sld[:i] in WORDS and sld[i:] in WORDS:
                pts += 20
                found = True
                break
        if not found:
            for i in range(3, min(len(sld), 15)):
                if sld[:i] in WORDS or sld[i:] in WORDS:
                    pts += 10
                    break

    if   tld in HIGH_TLD: pts += HIGH_TLD[tld]
    elif tld in MID_TLD:  pts += MID_TLD[tld]
    elif tld in LOW_TLD:  pts += LOW_TLD[tld]
    else:                 pts += 5

    if not any(c.isdigit() for c in sld):
        pts += 10

    letters = [c for c in sld if c.isalpha()]
    if len(letters) >= 2:
        alt = sum(
            1 for i in range(len(letters) - 1)
            if (letters[i] in VOWELS) != (letters[i + 1] in VOWELS)
        )
        pts += round(alt / (len(letters) - 1) * 10)

    if '-' not in sld:
        pts += 5

    return min(pts, 100)


supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

PAGE = 1000
offset = 0
total = 0

while True:
    res = (
        supabase.table("domains")
        .select("id, domain")
        .is_("score", "null")
        .range(offset, offset + PAGE - 1)
        .execute()
    )
    rows = res.data
    if not rows:
        break

    scored = [{"id": r["id"], "score": score_domain(r["domain"])} for r in rows]

    BATCH = 500
    for i in range(0, len(scored), BATCH):
        chunk = scored[i:i + BATCH]
        supabase.table("domains").upsert(chunk, on_conflict="id").execute()

    total += len(rows)
    print(f"Scored {total} domains so far...")
    if len(rows) < PAGE:
        break
    offset += PAGE

print(f"Done. Total scored: {total}")
