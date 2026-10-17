SnapShare System Scaling Plan
1. Assumptions and Daily Active Users (DAU)
Starting Facts & Assumptions
•	Total Registered Users: 10,000,000

•	Daily Activity Ratio: 10% of registered users are active daily

•	Upload Activity: 1 photo uploaded per active user per day

•	Feed Activity: 50 feed page views per active user per day

•	Photo File Size: 2 MB average original upload

•	Thumbnail File Size: 50 KB (0.05 MB) per photo

•	Time Distribution: 86,400 seconds per day (approximated to 100,000 seconds for conservative average estimation
•	Traffic Spikes: Peak traffic multiplier is $5\times$ the average load

DAU Calculation
DAU = 10,000,000 * 10% = 1,000,000 Daily active users

2. Traffic and Storage Estimates
Daily Volumes
•	Daily Uploads: 1,000,000 users* 1 photo/day = 1,000,000 uploads/day

•	Daily Feed Views: 1,000,000 users * 50 feed views/day = 50,000,000 feed views/day

Uploads Per Second (Writes)
•	Average Uploads/sec:

1,000,000 \100,000 seconds = 10 uploads/sec 
Peak Uploads/sec ($5\times$):

10 * 5 = 50 uploads/sec

Feed Views Per Second (Reads)
•	Average Feed Views/sec:

50,000,000 feed views \100,000 seconds =500views/sec 
Peak Feed Views/sec ($5\times$):
500 *5= 2,500 views per sec

Photo Storage Per Year
•	Storage per Photo (Original + Thumbnail):
2.0 MB + 0.05MB =2.05MB

•	Daily Storage Added:
1,000,000 Uploads/day *2.05MB =2,050,000MBS = 2.05TB/day

•	Annual Storage Required (365 days):
2.05TB * 365 Days =748.25 TB/year

3. Read-Heavy vs. Write-Heavy Analysis
SnapShare is heavily read-heavy, with a read-to-write ratio of 50:1 (50 million feed reads vs. 1 million uploads per day).


Design Implications
•	Aggressive Caching: We must implement multi-tier caching (Edge CDN for static media and Redis/Memcached for user feeds and metadata) so the majority of read requests bypass primary databases entirely.

•	Database Read Replication: Because reads dominate writes by orders of magnitude, the primary relational database needs multiple read replicas to scale query throughput horizontally without bottlenecking write transactions.

•	Asynchronous Processing: Since user experience hinges on fast read performance and quick feed scrolling, heavy write operations (like resizing photos and generating fan-out feed updates) must be offloaded to asynchronous background queues and workers.

4. Storage Strategy: Database vs. Object Storage
Photos must never be stored directly inside a relational or document database (such as BLOB columns).


Why Databases Should Not Store Binary Photos:
•	Storage and Memory Bloat: Storing multi-megabyte binary payloads dramatically inflates database size, evicting high-priority index data and query rows from database RAM caches (e.g., MySQL InnoDB buffer pool).

•	Cost Inefficiency: High-performance database storage (e.g., Provisioned IOPS NVMe SSDs) is significantly more expensive per gigabyte than distributed cold/warm object storage.

•	Degraded Backup & Replication Performance: Performing point-in-time recovery, routine backups, and binlog replication across read replicas becomes sluggish and prone to timeouts when handling terabytes of binary payloads.

Recommended Destination:
•	Store actual media binaries in dedicated Object Storage (e.g., Amazon S3, Google Cloud Storage).

•	Store only metadata and URLs (e.g., photo_id, user_id, s3_url, thumbnail_url, created_at) inside the database.

5. Architecture Diagram
Plaintext
                           +-------------------+
                           |    Client App     |
                           |  (Mobile / Web)   |
                           +---------+---------+
                                     |
               +---------------------+---------------------+
               |                                           |
        [1. Read Media]                            [2. API / Uploads]
               |                                           |
               v                                           v
      +-----------------+                         +-----------------+
      |       CDN       |                         |  Load Balancer  |
      +--------+--------+                         +--------+--------+
               |                                           |
               |                                   +-------+-------+
               |                                   |               |
               |                                   v               v
               |                            +-------------+ +-------------+
               |                            | App Server  | | App Server  |
               |                            +------+------+ +------+------+
               |                                   |               |
               |         +-------------------------+---------------+
               |         |                         |               |
               v         v                         v               v
     +-----------------------+             +---------------+ +---------------+
     |     Object Store      |             | In-Memory     | | Primary DB    |
     | (S3 - Photos/Thumbs)  |             | Cache (Redis) | | (Writes)      |
     +-----------^-----------+             +---------------+ +-------+-------+
                 |                                                   |
                 |                                            (Replication)
                 |                                                   |
                 |                                                   v
                 |                                           +---------------+
                 |                                           | Read Replica  |
                 |                                           | (Feed Reads)  |
                 +-----------------+                         +---------------+
                                   |
                           +-------+-------+
                           | Thumb Worker  |
                           +-------^-------+
                                   |
                           +-------+-------+
                           | Message Queue |
                           +-------^-------+
                                   |
                          (Enqueues Job on Upload)
6. Component Responsibilities
1.	CDN (Content Delivery Network): Caches and serves static photo files and thumbnails from geographic edge locations close to users to reduce latency and origin server bandwidth.

2.	Load Balancer: Distributes incoming HTTP traffic evenly across multiple application servers to prevent any single server from becoming overwhelmed.

3.	App Servers: Executes core application logic, handles authentication, coordinates uploads, queries data layers, and generates feed responses.

4.	Cache (e.g., Redis): Holds pre-computed user feeds and frequently accessed photo metadata in memory to deliver low-latency reads.

5.	Database with Read Replica: Handles write operations (new users, metadata) on the primary node while offloading heavy feed query reads across read replicas to ensure database scalability.

6.	Object Storage (e.g., S3): Provides cost-effective, highly durable, and virtually infinite distributed storage specifically designed for large binary assets like photos and thumbnails.

7.	Message Queue: Buffers asynchronous thumbnail generation tasks and decoupling the photo upload acknowledgment from compute-intensive image processing.

8.	Thumbnail Worker: Consumes tasks from the message queue, pulls the raw image from object storage, generates a lightweight 50 KB thumbnail, and saves it back to object storage.

7. Step-by-Step Upload Flow
1.	Presigned URL Request: The client sends a POST /photos/upload-request to the App Server via the Load Balancer containing metadata (file size, image type).

2.	URL Generation: The App Server validates the request, generates a unique file identifier and an S3 presigned upload URL, and returns it to the client.

3.	Direct Upload: The client bypasses the application servers and uploads the 2 MB raw photo directly to Object Storage via the presigned URL.

4.	Upload Confirmation & Metadata Persistence: Upon successful S3 upload, the client calls POST /photos/confirm; the App Server writes the new photo record to the Primary Database and invalidates/updates relevant Redis caches.

5.	Enqueue Processing Task: The App Server pushes an asynchronous message (e.g., { photo_id, object_key }) to the Message Queue.

6.	Fast Client Acknowledgment: The App Server returns a 201 Created HTTP response to the client immediately without waiting for thumbnail generation.

7.	Thumbnail Processing: A Thumbnail Worker pulls the job from the Message Queue, fetches the 2 MB image from Object Storage, generates a resized 50 KB thumbnail, and uploads the thumbnail back to Object Storage.

8.	Record Finalization: The worker updates the database record with the new thumbnail_url and updates the cache.

8. Architectural Trade-Offs
Trade-Off 1: Pre-computed Feeds (Fan-out on Write) vs. Query-Time Aggregation (Fan-out on Read)
•	Choice: We use Fan-out on Read combined with cache layers for general users, with selective background pre-computation for regular users.

•	Pros: Fan-out on Read avoids massive write amplification whenever a user with hundreds of thousands of followers posts a photo.

•	Cons: Constructing the feed on demand requires querying the follower graph and sorting posts across multiple followees at read time, incurring higher compute and cache lookup costs during peak scrolling hours.

Trade-Off 2: Direct-to-S3 Upload (Presigned URLs) vs. Upload Through App Servers
•	Choice: Direct client upload to Object Storage via presigned URLs.

•	Pros: Saves substantial App Server memory and bandwidth, ensuring App Servers do not tie up connection threads handling slow mobile uploads of 2 MB payloads.

•	Cons: We lose immediate synchronous validation (e.g., verifying file contents or checking for malware on our own application servers before the file lands in S3) and require a secondary confirmation step to ensure the database stays in sync with S3.
