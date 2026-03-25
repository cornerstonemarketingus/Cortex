# Domain and Business Email Setup (Google Workspace)

## 1) Buy Domain
Use any registrar (Cloudflare, Namecheap, GoDaddy, Porkbun).

## 2) Point Domain to Bid Build App
Set DNS records for hosting provider:
- `A` or `CNAME` for root (`@`) as required by host
- `CNAME` for `www`

Example (host-specific values vary):
- `@ -> A -> 76.76.21.21`
- `www -> CNAME -> cname.host.example`

## 3) Configure Google Workspace Email
In DNS, add Google MX records:
- `ASPMX.L.GOOGLE.COM` priority `1`
- `ALT1.ASPMX.L.GOOGLE.COM` priority `5`
- `ALT2.ASPMX.L.GOOGLE.COM` priority `5`
- `ALT3.ASPMX.L.GOOGLE.COM` priority `10`
- `ALT4.ASPMX.L.GOOGLE.COM` priority `10`

## 4) Email Deliverability Records
Add these records:
- SPF TXT: `v=spf1 include:_spf.google.com ~all`
- DKIM TXT: from Google Admin key generation
- DMARC TXT: `_dmarc` -> `v=DMARC1; p=none; rua=mailto:postmaster@yourdomain.com`

After validation, tighten DMARC policy to `quarantine` then `reject`.

## 5) Recommended Mailboxes
- `hello@yourdomain.com`
- `sales@yourdomain.com`
- `support@yourdomain.com`
- `billing@yourdomain.com`

## 6) Verify End-to-End
- Visit `https://yourdomain.com`
- Hit `https://yourdomain.com/api/readyz`
- Send/receive test email from new mailbox

## 7) Optional Security Enhancements
- Enforce 2FA in Google Workspace
- Add BIMI after DMARC is strict
- Enable registrar lock and DNSSEC
