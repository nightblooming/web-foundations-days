System Design Document: TicketHub
1. Requirements
Functional Requirements
1.	Search & Browse Events: Users can browse, search, and filter events by artist, venue, genre, city, and date.

2.	View Seat Availability: Users can inspect a venue map displaying real-time seat statuses (AVAILABLE, HELD, SOLD).

3.	Hold Seats (Temporary Reservation): Users can temporarily lock one or more seats for up to 10 minutes to complete checkout.

4.	Checkout & Payment: Users can pay for held seats using third-party payment gateways (e.g., Stripe) and receive booking confirmation.

5.	View & Manage Tickets: Users can view purchased tickets with cryptographically signed QR codes/barcodes in their user profile.

Non-Functional Requirements
1.	Correctness (Zero Double-Booking): Under no circumstance may two different users purchase or hold the same physical seat for the same show. Strong transactional consistency is mandatory for inventory allocation.

2.	Fairness: First-come, first-served semantics. During high-demand sales, bot protection, strict rate limiting, and an upstream virtual waiting room (queue) must guarantee equitable access.

3.	Low Latency (Speed):


o	Search/browse queries: P95 < 100 ms.

o	Seat selection map: $P95 < 150ms.

o	Hold/Lock execution: $P99 < 500ms.

4.	High Availability: 99.99% availability for browsing and read operations. The system must degrade gracefully (shedding excess load via a waiting queue) rather than failing under traffic spikes.

5.	Scalability: Capable of withstanding sudden surges from hundreds of thousands of users hitting the platform at the exact second a sale opens.

2. Capacity Estimates & Traffic Comparison
All daily calculations use an operational estimate of 100,000 seconds/day (simplified from 86,400 s.


1. Normal Day Traffic
•	Registered User Base: 2,000,000 accounts.

•	Daily Visitors: 50,000 visitors/day.

•	Page Views per Visitor: 10 views.

•	Total Daily Page Views (Reads):

50,000 x 10 = 500,000 views/day
•	Average Read QPS:

500,000 requests/ 100, s = 5 QPS
 (Peak normal read QPS, assuming a 2x – 3x diurnal distribution: approx 10 - 15 QPS)

•	Tickets Sold per Day (Writes): 5,000 tickets/day.

•	Average Write QPS (Completed Bookings):
5,000 purchase / 100,000 sec =0.05 QPS
 (Peak normal write QPS: approx 0.1 - 0.2 QPS)

2. The "Big Sale" Peak (Popular Concert Drop)
•	Available Inventory: 20,000 seats.

•	Active Competing Users: 200,000 users attempting to purchase within the first 10 minutes (600 seconds).

•	Demand-to-Supply Contention Ratio:
200,000 / 20,000 = 10:1
 (10 users competing for every 1 available seat).

Read Traffic (Browsing, Map Renders, Status Polling)
Assuming each of the 200,000 users generates an average of 6 read/polling requests during the 10-minute on-sale window:


•	Total Read Requests: 200,000 x 6 = 1,200,000 requests.

•	Average Read QPS:
1,200,000 requests / 600 sec = 2,000 QPS

•	Peak Burst Read QPS (First 60 Seconds): Assuming 40% of users land at 10:00 AM sharp:
480,000 requests / 60 sec = 8,000 QPS

Write Traffic (Seat Holds & Reservation Locks)
Assuming each user makes an average of 1.5 hold attempts (initial attempt plus retries when a chosen seat is taken):


•	Total Hold Attempts: 200,000 x 1.5 = 300,000 write requests.

•	Average Write / Hold QPS:
300,000 /600 sec =500 QPS

•	Peak Burst Hold QPS (First 60 Seconds): Assuming 40% of write attempts land in the opening minute:
120,000 requests /60 sec =2,000 QPS

•	Successful Purchase Throughput: All $20{,}000$ seats are confirmed across the 10 minutes:
20,000 orders / 600 sec =33.3 successful bookings per sec


3. API Design
All endpoints follow REST conventions, exchange JSON, and require an Authorization: Bearer <JWT> token for private actions.


1. Browse Events
HTTP
GET /api/v1/events?keyword=coldplay&city=london&page=1&limit=20
•	Response 200 OK:

JSON
{
  "events": [
    {
      "id": "evt_901a1b",
      "title": "Music of the Spheres Tour",
      "venue": "Wembley Stadium",
      "city": "London",
      "event_date": "2026-09-12T18:00:00Z",
      "min_price_cents": 7500,
      "max_price_cents": 35000,
      "status": "ON_SALE"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
2. View Seats & Availability
HTTP
GET /api/v1/events/{eventId}/seats?section=102
•	Response 200 OK:

JSON
{
  "event_id": "evt_901a1b",
  "section": "102",
  "seats": [
    {
      "seat_id": "seat_102_B_12",
      "row": "B",
      "number": 12,
      "tier": "STANDARD",
      "price_cents": 12000,
      "status": "AVAILABLE"
    },
    {
      "seat_id": "seat_102_B_13",
      "row": "B",
      "number": 13,
      "tier": "STANDARD",
      "price_cents": 12000,
      "status": "HELD"
    }
  ]
}
3. Hold Seats (Temporary Lock)
HTTP
POST /api/v1/events/{eventId}/holds
Content-Type: application/json
Idempotency-Key: a4f8c92e-5f93-41a4-9df2-5d6e2e28a9b1

{
  "seat_ids": ["seat_102_B_12"]
}
•	Response 201 Created:

JSON
{
  "reservation_token": "res_c87a19ff",
  "held_seat_ids": ["seat_102_B_12"],
  "expires_at": "2026-09-12T10:10:00Z",
  "ttl_seconds": 600,
  "total_price_cents": 12000
}
•	Error 409 Conflict:

JSON
{
  "error": "SEATS_UNAVAILABLE",
  "message": "One or more requested seats are currently held or sold."
}
4. Create Order & Process Payment
HTTP
POST /api/v1/orders/checkout
Content-Type: application/json
Idempotency-Key: b7c3d1e2-9f0a-4a2b-88b1-3e5f7a9c1d2e

{
  "reservation_token": "res_c87a19ff",
  "payment_method_id": "pm_card_visa_4242",
  "billing_address": {
    "postal_code": "SW1A 1AA",
    "country": "GB"
  }
}
•	Response 200 OK:

JSON
{
  "order_id": "ord_88291a",
  "status": "CONFIRMED",
  "total_paid_cents": 12000,
  "tickets_generated": 1
}
5. View Purchased Tickets
HTTP
GET /api/v1/users/me/tickets
•	Response 200 OK:

JSON
{
  "tickets": [
    {
      "ticket_id": "tkt_5521ab",
      "order_id": "ord_88291a",
      "event_title": "Music of the Spheres Tour",
      "venue": "Wembley Stadium",
      "seat_display": "Section 102, Row B, Seat 12",
      "qr_code_signature": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "status": "VALID"
    }
  ]
}
4. Data Model
The data layer uses an ACID-compliant Relational Database (PostgreSQL) to enforce row-level locking, foreign key constraints, and multi-record atomic transactions.


+---------------+        1:N        +---------------+
|     users     | ----------------< |    orders     |
+---------------+                   +---------------+
                                            |
                                            | 1:N
                                            v
+---------------+        1:N        +---------------+
|    events     | ----------------< |  event_seats  |
+---------------+                   +---------------+
Schema Definition
SQL
-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    venue_name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    event_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- 'UPCOMING', 'ON_SALE', 'SOLD_OUT'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Event Seats Table (Seat Inventory & State per Event)
CREATE TABLE event_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,
    row_label VARCHAR(10) NOT NULL,
    seat_number INT NOT NULL,
    tier VARCHAR(50) NOT NULL,
    price_cents INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'HELD', 'SOLD'
    reservation_token UUID NULL,
    held_by_user_id UUID NULL REFERENCES users(id),
    hold_expires_at TIMESTAMP WITH TIME ZONE NULL,
    version INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_event_physical_seat UNIQUE (event_id, section, row_label, seat_number)
);

CREATE INDEX idx_event_seat_status ON event_seats(event_id, status);
CREATE INDEX idx_hold_expiry ON event_seats(hold_expires_at) WHERE status = 'HELD';

-- 4. Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    event_id UUID NOT NULL REFERENCES events(id),
    total_amount_cents INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'EXPIRED', 'REFUNDED'
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    payment_reference VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tickets Table (Fulfillment & Delivery)
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    seat_id UUID UNIQUE NOT NULL REFERENCES event_seats(id),
    qr_code_signature TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'VALID', -- 'VALID', 'CHECKED_IN', 'REVOKED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
5. Preventing Double-Booking
Preventing double-booking requires a two-phase reservation protocol (AVAILABLE $\rightarrow$ HELD $\rightarrow$ SOLD) executed within strict ACID boundaries.


User A ──┐
         ├──> [Atomic UPDATE & Row Lock] ──> Winner: Gets 10-Minute Hold
User B ──┘    (WHERE status = 'AVAILABLE')    Loser: 0 Rows Updated -> 409 Conflict
Phase 1: Acquiring the Temporary Seat Hold
When multiple users target the same seat at the exact same millisecond, the application executes an atomic conditional update:


SQL
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

UPDATE event_seats
SET status = 'HELD',
    reservation_token = :reservation_token,
    held_by_user_id = :user_id,
    hold_expires_at = NOW() + INTERVAL '10 minutes',
    version = version + 1
WHERE id = :seat_id 
  AND (status = 'AVAILABLE' OR (status = 'HELD' AND hold_expires_at < NOW()));

-- Application checks affected row count:
-- If affected_rows == 1: Seat secured. Commit transaction.
-- If affected_rows == 0: Another buyer secured it first. Roll back & return 409 Conflict.

COMMIT;
Why This Prevents Double-Booking
1.	Row-Level Mutex: In PostgreSQL, an UPDATE statement immediately acquires an exclusive write lock on that specific row. Any competing transaction on the same seat_id must wait in a queue for the first transaction to finish.

2.	Predicate Re-Evaluation: When the second transaction acquires the row lock, it re-evaluates the WHERE clause against the newly committed state. Because status has become 'HELD' and hold_expires_at > NOW(), the predicate evaluates to FALSE. The query updates 0 rows and returns immediately.

3.	Inline Expired Hold Reclamation: If a user holds a seat and abandons the cart, the condition OR (status = 'HELD' AND hold_expires_at < NOW()) allows another buyer to reclaim the seat inline without waiting for an asynchronous garbage-collection cron job.

Phase 2: Confirming the Purchase (Order Finalization)
When the payment gateway confirms the charge, the system transitions the seat from 'HELD' to 'SOLD' inside a single transaction:


SQL
BEGIN;

UPDATE event_seats
SET status = 'SOLD',
    hold_expires_at = NULL,
    version = version + 1
WHERE id = :seat_id 
  AND status = 'HELD' 
  AND reservation_token = :reservation_token 
  AND hold_expires_at >= NOW();

-- If affected_rows == 1:
INSERT INTO orders (id, user_id, event_id, total_amount_cents, status, idempotency_key, payment_reference)
VALUES (:order_id, :user_id, :event_id, :amount, 'PAID', :idempotency_key, :payment_ref);

INSERT INTO tickets (order_id, seat_id, qr_code_signature, status)
VALUES (:order_id, :seat_id, :qr_token, 'VALID');

COMMIT;
•	If the 10-minute hold expired while the user was submitting payment, affected_rows is 0. The transaction aborts, and an asynchronous worker immediately initiates a full refund via the payment provider.

6. Architecture & Surviving the "Big Sale"
Architecture Diagram
                                  [ 200,000 Concurrent Buyers ]
                                                │
                                                ▼
                                    +───────────────────────+
                                    |   Cloudflare / Akamai |  <-- DDoS mitigation, bot shield,
                                    |     Edge CDN Layer    |      static asset caching (SVGs/maps)
                                    +───────────────────────+
                                                │
                                                ▼
                                    +───────────────────────+
                                    | Virtual Waiting Room  |  <-- Token bucket / Queue
                                    |   (Cloudflare Queue)  |      Admits 350 users/sec
                                    +───────────────────────+
                                                │ (Admitted with Signed JWT Token)
                                                ▼
                                    +───────────────────────+
                                    | API Gateway / Envoy   |  <-- TLS termination,
                                    | Rate Limiter (Redis)  |      Rate limits per IP/UserID
                                    +───────────────────────+
                                                │
                      ┌─────────────────────────┴────────────────────────┐
                      ▼                                                  ▼
          +───────────────────────+                          +───────────────────────+
          | Browse / Search Svc   |                          | Booking & Hold Svc    |
          +───────────────────────+                          +───────────────────────+
             │                 │                                         │
             ▼                 ▼                                         ▼
      +────────────+    +────────────+                         +───────────────────+
      | Read Cache |    | Elasticsearch|                       | Distributed Cache |
      | Redis Read |    | Event Search |                       |  (Redis Cluster)  |
      +────────────+    +────────────+                         | Short-TTL Maps    |
                                                               +───────────────────+
                                                                         │
                                                                         ▼
                                                           +───────────────────────────+
                                                           | Primary RDBMS (PostgreSQL)|
                                                           | (Master Writes + Replicas)|
                                                           +───────────────────────────+
                                                                         │
                                                                         ▼
                                                           +───────────────────────────+
                                                           | Kafka Event Bus           |
                                                           | Async Payment & Emails    |
                                                           +───────────────────────────+
How the Architecture Survives the Spike
1.	Edge CDN Layer: Caches all static assets, event metadata, and seat layout SVGs. This absorbs over 95% of the $8{,}000\text{ QPS}$ peak browse traffic before it ever touches application servers.

2.	Virtual Waiting Room (Edge Admission Gate):


o	The Bottleneck Problem: Without an admission control gate, $200{,}000$ users hitting the database simultaneously would trigger $2{,}000\text{ write QPS}$ concentrated on only $20{,}000$ rows. This creates severe row-lock contention, fills the connection pool, and cascades into database downtime.

o	The Solution: An upstream virtual queue intercepts the $200{,}000$ users and admits them at a controlled rate:

$$\frac{200{,}000 \text{ users}}{600 \text{ s}} \approx 330 - 350 \text{ users/second}$$
o	Admitted users receive a cryptographically signed cookie/JWT granting entry to the seat-selection flow. This caps downstream database write requests to $\approx 350 - 500\text{ QPS}$, well within PostgreSQL's comfortable transaction ceiling.

3.	API Gateway & Redis Rate Limiting: Enforces token-bucket rate limits (e.g., max 10 seat-hold attempts per minute per user ID) to block scalper bots and multi-tab scripts.

4.	Read vs. Write Segregation: Read queries (checking seat maps) hit Redis replicas updated via change-data-capture (CDC) with a 2-second cache window. Only the hold and checkout operations touch the primary PostgreSQL database.

5.	Kafka Asynchronous Pipeline: Once the primary database confirms the payment and order record, ticket PDF generation, barcode digital signing, and email dispatch are offloaded to Kafka workers, keeping checkout latency low.

7. Trade-Offs
Trade-Off 1: Virtual Waiting Room vs. Infinite Elastic Autoscaling
•	Decision: Implement an upstream virtual waiting room to meter user entry at 350 users/second, rather than attempting to autoscale application pods to handle all 200,000 users simultaneously.

•	Why: In ticket sales, the bottleneck is not stateless compute (which scales horizontally); it is single-row lock contention on a database. Scaling out application pods simply directs more concurrent connections at the same row lock (e.g., front-row seats), increasing lock wait times, causing transaction timeouts, and overwhelming the database connection pool.

•	Trade-Off: Users encounter an explicit queue and wait several minutes to enter the store. However, the system avoids total service collapse, latency remains sub-second for admitted users, and zero orders fail due to database crashes.

Trade-Off 2: Relational Row-Level Locks vs. Redis Distributed Locking (Redlock)
•	Decision: Use PostgreSQL row-level locks and atomic updates directly as the single source of truth for seat holds, rather than using Redis distributed locks with asynchronous database write-back.

•	Why: Redis handles higher raw write volumes, but maintaining seat state across two separate storage layers creates distributed consistency risks. If the Redis master crashes before persisting to the replica or database, a seat can be double-sold. Furthermore, reconciling network partitions and TTL discrepancies between Redis and the database adds substantial architectural complexity.

•	Trade-Off: Lower raw peak lock throughput per second ($2{,}000 - 4{,}000\text{ writes/sec}$ maximum for RDBMS vs. $100{,}000+\text{ ops/sec}$ in Redis). Because the upstream virtual waiting room throttles inbound write requests to $\approx 350 - 500\text{ QPS}$, the database handles the load easily while providing guaranteed ACID correctness.

Trade-Off 3: Synchronous Payment Validation vs. Asynchronous Fulfillment
•	Decision: Keep payment gateway authorization synchronous within the user's 10-minute hold window, but delegate ticket asset creation, QR code signing, and email delivery to asynchronous Kafka workers.

•	Why: A user must know immediately if their credit card was declined while their seat hold is active so they can retry before the 10-minute timer expires. In contrast, generating cryptographic PDF tickets and sending emails adds 1–3 seconds of latency that does not need to block the user.

•	Trade-Off: Checkout response time depends on third-party payment gateway latency (typically 500–1,500 ms). If the payment processor fails or takes longer than the hold window, automated reconciliation workers must issue a refund and release the seat.
