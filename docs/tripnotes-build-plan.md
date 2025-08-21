# TripNotes CC - 7-Day Build Plan

## Tech Stack
- **Frontend:** Next.js 15+, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (DB + Auth), Cloudflare R2 (Images)
- **ORM:** Drizzle
- **Payments:** Stripe
- **AI:** Claude API + OpenAI API
- **Maps:** Mapbox GL JS

---

## Day 1: Foundation & Infrastructure
**Goal: Core setup, auth, database, and payment foundation**

### Morning: Project Setup (4 hours)
- Initialize Next.js 15+ with TypeScript, strict mode
- Configure Tailwind + shadcn/ui components
- Set up ESLint (no "any" types, strict rules for Vercel)
- Project structure:
  ```
  /app (App Router)
  /components (UI components)
  /lib (utilities, hooks)
  /server (server actions, API)
  /drizzle (schema, migrations)
  ```

### Afternoon: Database & Auth (4 hours)
- **Supabase Setup:**
  ```
  Tables with Drizzle schema:
  - users (id, email, name, creator_status, stripe_customer_id)
  - trips (id, creator_id, title, subtitle, price, status, published_at)
  - trip_days (id, trip_id, day_number, title, subtitle)
  - activities (id, day_id, time_block, content, order)
  - gems (id, activity_id, title, description, type)
  - trip_photos (id, trip_id, r2_key, caption, order)
  - purchases (id, user_id, trip_id, stripe_payment_id, amount, purchased_at)
  - user_trip_notes (id, user_id, trip_id, notes)
  - creator_earnings (id, creator_id, amount, status, payout_date)
  - prompt_templates (id, trip_id, prompt, order)
  ```
- Row Level Security (RLS) policies
- Auth middleware with protected routes

### Evening: Storage & Payment Setup (4 hours)
- **Cloudflare R2:**
  - Bucket creation and CORS config
  - Presigned URL generation for uploads
  - Image optimization pipeline planning
- **Stripe Integration:**
  - Account setup (Connect for marketplace)
  - Webhook endpoints
  - Product/Price object structure
  - Test mode configuration

---

## Day 2: Creator Editor Core
**Goal: Functional trip creation with auto-save**

### Morning: Editor Layout (4 hours)
- Two-panel responsive layout
- Header with save status indicator
- Collapsible AI sidebar structure
- Focus mode toggle
- Auto-save with debouncing (2-second delay)
- Optimistic UI updates

### Afternoon: Content Management (4 hours)
- **Trip CRUD Operations:**
  - Create/edit trip metadata
  - Add/edit/delete/reorder days
  - Time blocks and activities
  - Hidden gems with special styling
  - Textarea auto-expansion
- **State Management:**
  - Zustand for editor state
  - Optimistic updates with rollback

### Evening: Media & Rich Content (4 hours)
- **Image Handling:**
  - Drag-and-drop upload to R2
  - Canvas API for resize/compress
  - Progress indicators
  - Thumbnail generation (60x60, 300x300)
- Photo gallery management
- Markdown support for formatting

---

## Day 3: AI Integration & Maps
**Goal: Smart features for creators**

### Morning: LLM Infrastructure (4 hours)
- **API Setup:**
  - OpenAI and Claude clients with retry logic
  - Token counting and cost estimation
  - Streaming responses for better UX
  - Redis caching for common queries
- **Prompt Templates:**
  - Suggestion generation
  - Fact checking
  - Content enhancement

### Afternoon: AI Features Implementation (4 hours)
- **Creator Tools:**
  - Missing attractions suggester
  - Distance/time calculator
  - Price validator (scraping when needed)
  - SEO optimizer
  - Auto-tagging system
- Response streaming to UI
- Error handling with fallbacks

### Evening: Maps Integration (4 hours)
- **Mapbox Setup:**
  - Custom Moleskine-inspired style
  - Location extraction from text (NLP)
  - Auto-plotting with markers
  - Route generation and optimization
  - Walking time calculations
  - Static map generation for previews

---

## Day 4: Payment Flow & User Experience
**Goal: Complete purchase flow and reader view**

### Morning: Payment Integration (4 hours)
- **Stripe Checkout:**
  - Server-side price calculation
  - Checkout session creation
  - Success/cancel handling
  - Webhook processing (payment_intent.succeeded)
- **Post-Purchase:**
  - Instant access granting
  - Email confirmation (Resend/SendGrid)
  - Receipt generation
  - Creator earnings tracking

### Afternoon: Trip Reader View (4 hours)
- **Notebook Design Implementation:**
  - Expandable day cards
  - Hidden gems with highlighter effect
  - Photo thumbnails with lightbox
  - Inline lazy-loaded maps
  - Print-friendly CSS
- Mobile-responsive design
- Offline reading capability (PWA basics)

### Evening: Personalization Features (4 hours)
- **User Customization:**
  - Personal notes per activity
  - Bookmark/favorite activities
  - AI-powered trip customization
  - Custom prompt interface
- Trip sharing (unique URLs)
- Export to PDF (using Puppeteer/jsPDF)

---

## Day 5: Creator Dashboard & Discovery
**Goal: Analytics, earnings, and marketplace features**

### Morning: Creator Analytics (4 hours)
- **Dashboard Implementation:**
  - Sales charts (Chart.js/Recharts)
  - View analytics
  - Conversion tracking
  - Popular destinations insights
- **Earnings Management:**
  - Balance display
  - Transaction history
  - Payout requests (manual initially)
  - Tax document generation prep

### Afternoon: Marketplace Features (4 hours)
- **Discovery System:**
  - Search with filters (destination, duration, price)
  - Category browsing
  - Trending trips algorithm
  - Creator profiles and follow system
- Homepage with featured trips
- SEO optimization (meta tags, sitemap)

### Evening: Social Features (4 hours)
- **Engagement Tools:**
  - Review and rating system
  - Q&A for trips
  - Social sharing buttons
  - Email to friend functionality
- Creator verification badges
- Report inappropriate content flow

---

## Day 6: Performance & Polish
**Goal: Production optimization and testing**

### Morning: Performance Optimization (4 hours)
- **Speed Improvements:**
  - Image lazy loading with blur placeholders
  - Route prefetching
  - Database query optimization (N+1 prevention)
  - API response caching
  - Bundle splitting and tree shaking
- Lighthouse audit fixes
- Core Web Vitals optimization

### Afternoon: Error Handling & Edge Cases (4 hours)
- **Robustness:**
  - Error boundaries for each section
  - Skeleton loaders for all async content
  - Empty states with helpful CTAs
  - Form validation with helpful errors
  - Payment failure recovery
  - Partial content loading
- 404 and error pages
- Rate limiting implementation

### Evening: Testing Setup (4 hours)
- **Test Coverage:**
  - Unit tests for payment calculations
  - Integration tests for purchase flow
  - E2E tests with Playwright
  - AI response mocking
- Accessibility audit (WCAG 2.1 AA)
- Cross-browser testing checklist

---

## Day 7: Launch Preparation
**Goal: Deploy, monitor, and go live**

### Morning: Production Deployment (4 hours)
- **Vercel Setup:**
  - Environment variables (prod vs dev)
  - Domain configuration (tripnotes.cc)
  - SSL and security headers
  - Edge function optimization
- **Database Migration:**
  - Seed data for demo trips
  - Backup automation setup
- CDN configuration for R2

### Afternoon: Monitoring & Analytics (4 hours)
- **Observability:**
  - Sentry error tracking
  - Vercel Analytics + Google Analytics
  - Custom event tracking
  - AI API usage monitoring dashboard
  - Stripe webhook monitoring
- **Alerts Setup:**
  - Payment failures
  - High error rates
  - AI API quotas

### Evening: Launch Checklist (4 hours)
- **Legal & Support:**
  - Terms of Service
  - Privacy Policy  
  - Creator Agreement
  - FAQ page
  - Support email setup
- **Launch Materials:**
  - Creator onboarding guide
  - Demo trip content
  - Social media templates
  - Press kit

---

## Critical Path & Dependencies

### Must Complete in Order:
1. **Day 1:** Database + Stripe setup → enables everything else
2. **Day 2:** Editor core → needed for content creation
3. **Day 4 AM:** Payment flow → must work for launch
4. **Day 7 AM:** Production deployment → go live

### Can Be Parallel:
- AI features (enhance post-launch if needed)
- Maps (can use static images initially)
- Analytics (basic version fine for launch)
- Social features (can add post-launch)

---

## Risk Mitigations

### Payment Risks:
- **Mitigation:** Use Stripe Checkout (proven, handles edge cases)
- **Fallback:** Manual payment processing via Stripe Dashboard
- **Testing:** Extensive testing with Stripe test mode

### AI Cost Overruns:
- **Mitigation:** Aggressive caching, rate limits per user
- **Fallback:** Queue system, graceful degradation
- **Monitoring:** Real-time cost tracking dashboard

### Performance Issues:
- **Mitigation:** CDN for all static assets, edge functions
- **Fallback:** Static site generation for popular trips
- **Testing:** Load testing before launch

---

## MVP Shortcuts (If Behind Schedule)

### Can Defer to Week 2:
1. **Drag-and-drop** → Use up/down arrows
2. **AI fact-checking** → Manual moderation
3. **Automated payouts** → Manual weekly payouts
4. **Multiple currencies** → USD only
5. **Advanced search** → Basic filter only
6. **PDF export** → Email HTML version
7. **Reviews** → Just star ratings
8. **Follow system** → Simple bookmarks

### Cannot Compromise:
- Payment processing must work
- Creator can publish trips
- Users can purchase and view
- Mobile responsive design
- Basic AI suggestions

---

## Success Metrics

### Launch Day Requirements:
✅ Creator can publish trip in < 10 minutes  
✅ Purchase flow completes in < 30 seconds  
✅ Page loads under 3 seconds  
✅ AI suggestions work 95% of time  
✅ Zero payment failures  
✅ Mobile responsive  

### Week 1 Targets:
- 10 creators onboarded
- 50 trips published
- 100 test purchases
- < 1% error rate
- < 2% payment failure rate

---

## Daily Standup Focus

### Each Day Should Ask:
1. Is payment flow working end-to-end?
2. Can creators publish trips?
3. Can users purchase and view?
4. Are we tracking the right metrics?
5. What's the biggest risk today?

### Daily Deliverable:
- **Day 1:** Auth works, DB schema complete, Stripe connected
- **Day 2:** Can create and save a trip
- **Day 3:** AI suggestions appearing
- **Day 4:** Can purchase a trip with real money (test mode)
- **Day 5:** Creator dashboard showing earnings
- **Day 6:** Performance under 3 second load
- **Day 7:** Live on tripnotes.cc

---

## Post-Launch Roadmap (Week 2+)

### Week 2: Enhance
- Multi-language support
- Advanced AI customization
- Collaborative trip planning
- Mobile app planning

### Week 3: Scale
- Creator recruitment program  
- Affiliate system
- B2B partnerships
- API for third parties

### Month 2: Expand
- Hotel/flight integration
- Booking capability
- Creator tools mobile app
- White-label solution