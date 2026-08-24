# Placeholders That Need Filling

These placeholders appear in `src/content/*.md` files and need to be filled with real business information before the pages are usable:

## Contact Information
- `[your.email@puplets.co.uk]` → Real business email (appears in all pages)
- `[wholesale@puplets.co.uk]` → Wholesale inquiry email
- `[press@puplets.co.uk]` → Press/media email

## Business Address
- `[Your Business Address Line 1]`
- `[City, Postal Code]`
- `[Country]`
- `[Your returns address]` → Physical returns mailing address

## Business Details
- `[Your registered business name]`
- `[If registered company]` → Company number or remove this line
- `[If VAT registered]` → VAT number or remove this line

## Files Affected
- src/content/privacy-policy.md
- src/content/terms-and-conditions.md
- src/content/returns-policy.md
- src/content/cookie-policy.md
- src/content/contact.md
- src/content/size-guide.md
- src/content/faq.md

## After Filling
After updating the markdown files, regenerate the HTML pages using the marked library:
```bash
# Example for one page:
node -e "const fs = require('fs'); const marked = require('./node_modules/marked'); ..."
```

Or extend the build script to automate this (see dual-source-of-truth warning in review).
