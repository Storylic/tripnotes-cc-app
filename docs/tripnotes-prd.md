# Product Requirements Document
# TripNotes CC - Creator-Curated Travel Marketplace

**Version:** 1.0  
**Date:** January 2025  
**Status:** Draft

---

## 1. Statement of Intent

### Vision
TripNotes CC is a marketplace that brings **joy and delight** to both travel creators and travelers through beautifully crafted trip plans. We solve the universal problem of trip planning paralysis by offering curated, purchasable itineraries in a distraction-free, notebook-inspired interface that makes planning feel like a creative act rather than a chore.

### Mission
Create a platform where the act of crafting and consuming travel plans becomes a source of joy. We empower creators with precise AI assistance while providing travelers with clean, intentional experiences that transform overwhelming planning into delightful discovery.

### Core Value Proposition
**For Creators:** Experience the joy of crafting beautiful trip plans with AI that assists without overwhelming  
**For Travelers:** Discover the delight of a clean, focused trip plan that reveals details progressively and intentionally

### Design Philosophy
**"Joy Through Simplicity"** - Every feature, image, and interaction is intentionally designed to reduce cognitive load and increase delight. We show only what's needed, when it's needed.

---

## 2. Problem Statement

### Current Pain Points

**For Travelers:**
- Trip planning takes 20-40 hours of research
- Information overload from blogs, reviews, and social media
- Generic itineraries don't match personal preferences
- Difficulty validating if plans are realistic (distances, timing)
- No single source of truth for a complete trip

**For Travel Creators:**
- Limited monetization beyond ads and affiliates
- Content gets copied without compensation
- No tools to help validate/improve their recommendations
- Difficulty building sustainable income from travel expertise

### Market Opportunity
- 1.4 billion international tourist arrivals annually
- Average traveler spends $1,500-3,000 per trip
- 73% of travelers research trips online
- $12-50 acceptable price point for detailed trip plans
- Creator economy valued at $104B and growing 20% YoY

---

## 3. Product Overview

### What TripNotes CC Is
A two-sided marketplace where travel creators publish purchasable trip plans that users can buy, customize with AI, and use as their definitive travel guide.

### What TripNotes CC Is Not
- Not a booking platform (no hotels/flights)
- Not a review site (not TripAdvisor)
- Not a social network (not Instagram)
- Not a travel agency (no human consultation)

### Key Differentiators
1. **Purchasable Content:** Trip plans are products, not free content
2. **AI Customization:** Every purchased plan can be personalized
3. **Creator Tools:** AI assists in creation, fact-checking, and optimization
4. **Notebook Aesthetic:** Premium, tangible feel vs generic web interfaces
5. **Validation Layer:** Automatic feasibility checking of routes and timings

---

## 4. User Personas

### Primary Persona 1: Travel Creator "Sarah"
- **Age:** 28-45
- **Profile:** Travel blogger, digital nomad, local expert, or TripNotes CC staff curator
- **Goals:** Share expertise with joy, create beautiful content, generate income
- **Needs:** Clean creation tools, intelligent assistance, validation support
- **Delights in:** Crafting perfect itineraries, seeing plans come together, helping travelers

### Primary Persona 2: Trip Planner "Michael"
- **Age:** 25-55
- **Profile:** Professional with disposable income, values aesthetics and simplicity
- **Goals:** Efficient planning without overwhelm, authentic experiences
- **Needs:** Clean interface, progressive disclosure, trustworthy content
- **Delights in:** Beautiful design, discovering hidden gems, seamless experience

### Primary Persona 3: Platform Curator "TripNotes Team"
- **Profile:** In-house travel experts creating official TripNotes CC collections
- **Goals:** Set quality standards, fill content gaps, showcase platform capabilities
- **Needs:** Same tools as creators, bulk creation capabilities, quality templates
- **Delights in:** Creating flagship content that demonstrates platform excellence

---

## 5. Core Features

### 5.1 Creator Features

#### Trip Editor - "The Joy of Creation"
- **Distraction-free writing** with auto-save
- **Clean notebook interface** - focus on content, not chrome
- **Day-by-day structure** with elegant transitions
- **Hidden gems** that appear like handwritten margin notes
- **Intentional media** - photos/maps hidden until explicitly requested
- **Gentle animations** that feel like page turns

#### AI Assistant - "Precise & Intentional"
The AI is a quiet assistant, not a co-pilot. It appears only when summoned and provides specific, targeted help:

- **Idea Generation** (On-demand only)
  - "What am I missing?" - suggests overlooked attractions
  - "What else is nearby?" - discovers proximity opportunities
  - "Seasonal alternatives" - weather-appropriate options
  
- **Fact Verification** (Automatic but subtle)
  - Operating hours validation (green checkmark when verified)
  - Price range confirmation (amber dot if outdated)
  - Seasonal availability (red flag if closed during suggested dates)
  - Gentle corrections appear as margin notes
  
- **Trip Validation** (Background processing)
  - Distance calculations between stops
  - Realistic travel time estimates (walking/transit/driving)
  - Daily pace assessment (too rushed/too relaxed)
  - Rest stop recommendations
  - Feasibility score with specific improvements

#### Creator Dashboard - "Clean Insights"
- **Minimalist analytics** - only metrics that inspire
  - Single number focus: "14 travelers delighted this week"
  - Subtle graphs that expand on hover
  - Earnings displayed as simple, celebration-worthy milestones
- **Review highlights** - pull quotes that bring joy
- **Version history** - see your creation evolve

### 5.2 Traveler Features

#### Discovery & Purchase - "Browse with Delight"
- **Visual silence** - text-first browsing, images on hover
- **Preview that respects** - Day 1 preview without overwhelming
- **Creator trust signals** - subtle badges, not walls of credentials
- **One-click purchase** - no forms, no friction

#### Trip Consumption - "The Reading Experience"
- **Notebook aesthetic** throughout
  - Clean typography, generous whitespace
  - Ruled lines that guide the eye
  - Margin notes for personalization
- **Progressive disclosure**
  - Days expand one at a time
  - Photos appear only when requested via subtle "📸" indicators
  - Maps load inline, never as popups
- **Intentional interactions**
  - Highlighter effect for gems
  - Pencil animation for notes
  - Page-turn transitions

#### AI Customization - "Your Perfect Trip"
- **Natural language, not forms**
  - "I'm vegetarian" transforms all food recommendations
  - "Traveling with a 5-year-old" adjusts pace and activities
  - "On a tight budget" suggests alternatives
- **Subtle transformations** - changes appear as gentle annotations
- **Non-destructive** - original plan always recoverable

### 5.3 Platform Features

#### Visual Hierarchy - "When Less is More"
- **Images:** Hidden by default, revealed on intention
  - Thumbnail previews (60x60px) on click
  - Full images in lightbox
  - Never auto-playing or animated
- **Maps:** Progressive enhancement
  - Text directions first
  - Static map preview on request
  - Interactive map as final layer
- **Color:** Minimal palette
  - Paper white background
  - Charcoal text
  - Single accent color (burnt sienna)
  - Highlighter for emphasis

#### Platform-Created Content
- **TripNotes Signature Series**
  - Flagship trips created by in-house team
  - Sets quality standard for community
  - Fills gaps in popular destinations
- **Quality Templates**
  - Starter templates for new creators
  - Best practice examples
  - Seasonal collections

---

## 6. Data Model

### Core Entities

#### Users
```
- id (UUID)
- email (unique)
- name
- avatar_url
- is_creator (boolean)
- is_platform_curator (boolean)  // For TripNotes CC staff
- creator_verified (boolean)
- stripe_customer_id
- stripe_connect_account_id
- created_at
- updated_at
```

#### Trips
```
- id (UUID)
- creator_id (FK → Users)
- is_platform_created (boolean)  // TripNotes Signature Series
- title
- subtitle
- description
- destination
- duration_days
- price_cents
- currency
- season
- budget_range
- trip_style
- cover_image_url
- media_display_preference (always/on_request/never)
- status (draft/published/archived)
- view_count
- purchase_count
- average_rating
- delight_score  // Joy metric based on engagement
- seo_metadata (JSON)
- published_at
- created_at
- updated_at
```

#### Trip_Days
```
- id (UUID)
- trip_id (FK → Trips)
- day_number
- title
- subtitle
- summary
- created_at
- updated_at
```

#### Activities
```
- id (UUID)
- day_id (FK → Trip_Days)
- time_block (morning/afternoon/evening/custom)
- start_time
- end_time
- title
- description
- location_name
- location_coordinates (Point)
- activity_type
- estimated_cost
- order_index
- created_at
- updated_at
```

#### Gems (Hidden Gems/Tips)
```
- id (UUID)
- activity_id (FK → Activities)
- gem_type (hidden_gem/tip/warning)
- title
- description
- insider_info
- created_at
- updated_at
```

#### Purchases
```
- id (UUID)
- user_id (FK → Users)
- trip_id (FK → Trips)
- amount_cents
- currency
- stripe_payment_intent_id
- stripe_charge_id
- status (pending/completed/refunded)
- refunded_at
- purchased_at
```

#### User_Trip_Customizations
```
- id (UUID)
- user_id (FK → Users)
- trip_id (FK → Trips)
- customization_type (note/reorder/hide)
- activity_id (FK → Activities, nullable)
- custom_data (JSON)
- created_at
- updated_at
```

#### Reviews
```
- id (UUID)
- trip_id (FK → Trips)
- user_id (FK → Users)
- purchase_id (FK → Purchases)
- rating (1-5)
- title
- content
- creator_response
- helpful_count
- created_at
- updated_at
```

#### Creator_Earnings
```
- id (UUID)
- creator_id (FK → Users)
- purchase_id (FK → Purchases)
- amount_cents
- platform_fee_cents
- creator_net_cents
- payout_status (pending/processing/paid)
- payout_id
- paid_at
- created_at
```

#### AI_Prompts
```
- id (UUID)
- trip_id (FK → Trips)
- prompt_template
- prompt_category
- order_index
- usage_count
- created_at
- updated_at
```

---

## 7. Technical Architecture

### Frontend
- **Framework:** Next.js 15+ with App Router
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **Maps:** Mapbox GL JS
- **Forms:** React Hook Form + Zod

### Backend
- **Database:** Supabase (PostgreSQL)
- **ORM:** Drizzle
- **Auth:** Supabase Auth
- **Storage:** Cloudflare R2
- **CDN:** Cloudflare

### APIs & Services
- **Payments:** Stripe + Stripe Connect
- **AI:** OpenAI GPT-4 + Claude 3
- **Email:** Resend
- **Analytics:** Vercel Analytics + PostHog
- **Error Tracking:** Sentry
- **Cache:** Upstash Redis

### Infrastructure
- **Hosting:** Vercel
- **Edge Functions:** Vercel Edge Runtime
- **Cron Jobs:** Vercel Cron
- **Rate Limiting:** Upstash Ratelimit

---

## 8. Business Model

### Revenue Streams

#### Primary: Transaction Fees
- **30% platform fee** on each sale
- **70% to creators**
- Average trip price: $15-25
- Platform revenue: $4.50-7.50 per sale

#### Secondary: Premium Features (Future)
- Creator Pro subscriptions ($29/month)
  - Advanced analytics
  - Priority support
  - Featured placement
  - Bulk upload tools

### Pricing Strategy
- **Suggested pricing:** $12-50 per trip
- **Minimum price:** $5
- **Maximum price:** $200
- **Currency support:** USD initially, then EUR, GBP

### Financial Projections (Year 1)
- Month 1-3: 100 creators, 1,000 sales/month
- Month 4-6: 500 creators, 5,000 sales/month
- Month 7-12: 2,000 creators, 20,000 sales/month
- Year 1 GMV: $1.5M
- Year 1 Revenue: $450K

---

## 9. Success Metrics

### North Star Metrics
- **Creator Delight Score** (CDS) - Time spent in flow state while creating
- **Reader Joy Index** (RJI) - Engagement without overwhelm metrics
- **Platform Content Quality** (PCQ) - % of trips meeting excellence standards

### Experience Metrics
- **Creator Metrics**
  - Time in editor without distraction (>30 min sessions)
  - Completion rate without AI assistance requests
  - Creator NPS specifically about joy of creation (>70)
  - Return rate to create second trip (>60%)

- **Traveler Metrics**
  - Time to first "aha" moment (<30 seconds)
  - Progressive disclosure engagement (expand rate per day)
  - Note-taking rate (>40% add personal notes)
  - Reading completion rate (>80% view all days)

### Platform Health
- **Intentional Interaction Metrics**
  - Image view rate (should be <50% - not everything needs images)
  - Map interaction rate (should be selective, not compulsive)
  - AI customization quality (meaningful changes, not feature overuse)
- **Content Excellence**
  - Platform-created trips rating (>4.7/5)
  - Community trips meeting quality bar (>70%)
  - Fact verification accuracy (>95%)

---

## 10. Launch Strategy

### Phase 1: MVP (Week 1-2)
- Core editor with focus on writing joy
- Clean purchase flow
- Precise AI fact-checking only
- 5 platform-created showcase trips
- 10 beta creators

### Phase 2: Beta (Week 3-4)
- Full AI assistance suite (still on-demand)
- Delight-focused analytics
- Review system emphasizing quality
- 20 TripNotes Signature trips
- 100 creators invited

### Phase 3: Public Launch (Month 2)
- Press release emphasizing "joy of trip planning"
- Creator recruitment focused on quality over quantity
- Platform curation team established
- Design-forward marketing

### Phase 4: Scale (Month 3-6)
- Maintain quality bar while growing
- Platform collections for underserved destinations
- Creator mentorship program
- Design system documentation

---

## 11. Risks & Mitigations

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| AI API costs exceed projections | High | Aggressive caching, rate limits, fallback to simpler models |
| Payment processing issues | Critical | Multiple payment providers, manual backup process |
| Data breach | Critical | SOC 2 compliance, encryption, regular audits |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Creator content quality | High | Verification process, community moderation, quality score |
| Market competition | Medium | Focus on AI customization, creator tools differentiation |
| Seasonal demand | Medium | Global creator base, off-season promotions |

### Legal Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Copyright infringement | High | DMCA process, content scanning, creator agreements |
| Tax compliance | High | Stripe Tax, professional accounting, clear terms |
| Data privacy | High | GDPR compliance, privacy-first design |

---

## 12. Future Roadmap

### Q2 2025
- Mobile applications (iOS/Android)
- Multi-language support (Spanish, French, German)
- Group trip features
- Collaborative planning

### Q3 2025
- White-label solution for travel brands
- API for third-party integrations
- Advanced personalization AI
- Creator collaboration tools

### Q4 2025
- Booking integration partnerships
- Corporate travel packages
- Subscription tiers
- Gamification features

### 2026
- AR/VR previews
- Voice-guided tours
- Real-time trip tracking
- Social features

---

## Appendices

### A. Competitive Analysis
- **Viator/GetYourGuide:** Focus on bookable activities, not full itineraries
- **Lonely Planet:** Static guides, no personalization
- **TripAdvisor:** Reviews and forums, not purchasable plans
- **Wanderlog:** Free planner, no creator economy

### B. Technical Dependencies
- All third-party services listed in Section 7
- HTML demos attached separately
- Figma designs (to be created)
- API documentation (to be created)

### C. Legal Requirements
- Terms of Service
- Privacy Policy
- Creator Agreement
- DMCA Policy
- Refund Policy
- Cookie Policy

### D. Brand Guidelines
- **Core Principle:** Joy through simplicity
- **Visual Philosophy:** Show less to communicate more
- **Moleskine-inspired aesthetic:** Tangible, crafted, timeless
- **Warm, paper-like colors:** Creating calm, not excitement
- **Typography:** Inter + Crimson Pro for readability and elegance
- **Tone:** Knowledgeable but never overwhelming
- **Interactions:** Intentional, never automatic
- **Media:** Hidden by default, revealed with purpose

### E. AI Philosophy
- **Assistant, not autopilot:** AI helps but never takes over
- **Precision over volume:** Three good suggestions beat twenty options
- **Validation, not generation:** Focus on fact-checking and feasibility
- **Invisible when working:** Users shouldn't notice when AI is helping
- **Optional always:** Every AI feature can be ignored completely

### F. Platform Content Strategy
- **TripNotes Signature Series:** 20% of initial catalog
- **Quality templates:** Guide community standards
- **Underserved destinations:** Platform fills gaps
- **Seasonal collections:** Curated by platform team
- **Excellence examples:** Showcase what's possible

---

**Document History:**
- v1.0 - Initial draft - January 2025

**Approval:**
- Product: ___________
- Engineering: ___________
- Design: ___________
- Legal: ___________