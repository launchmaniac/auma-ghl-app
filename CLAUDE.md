# AUMA GHL App - Project Instructions

## ClickUp Configuration

- **Workspace ID:** 9017265590
- **List ID:** 901709434048
- **Project ID:** 90171746569
- **URL:** https://app.clickup.com/9017265590/v/b/li/901709434048?pr=90171746569

All tasks and progress for this project should be tracked in the above ClickUp list.

## Project Overview

AUMA (Automated Unlicensed Mortgage Assistant) - A GHL Marketplace App for mortgage loan processing with SAFE Act compliance.

## Deployment Infrastructure

- **Coolify:** https://cool.launchmaniac.com (Hetzner server: 5.78.135.208)
- **GitHub:** https://github.com/launchmaniac/auma-ghl-app

### Service Domains
| Service | Domain | Coolify UUID |
|---------|--------|--------------|
| Backend | api.launchmaniac.com | skowgwwsg4wgkscw8k8oog4k |
| Frontend | app.launchmaniac.com | kcwk0g8sgcs0soc8ks84ow8k |
| Portal | portal.launchmaniac.com | wocwos4gk4c0wow0sck0k4k8 |
| Admin | admin.launchmaniac.com | hgoossgsocowkkwsgs8wc04w |

## Environment Variables (Backend)

Required in Coolify:
- GHL_CLIENT_ID, GHL_CLIENT_SECRET, GHL_APP_ID, GHL_REDIRECT_URI
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET, ENCRYPTION_KEY
- REDIS_URL, PORTAL_URL
