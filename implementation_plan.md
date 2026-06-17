# Phase 4: Follow System Implementation Plan

This plan outlines the steps to build Phase 4 of MiniConnect, adding the ability for users to follow/unfollow each other and view follower/following counts.

## Proposed Changes

### Database Changes
#### [MODIFY] [schema.sql](file:///e:/Social%20Media%20Platform/database/schema.sql)
- Add `followers` table: `id`, `follower_id` (FK to users), `following_id` (FK to users), `created_at` (TIMESTAMP).
- Add a composite `UNIQUE KEY` on `(follower_id, following_id)` to prevent duplicate follows.
- Add foreign keys with `ON DELETE CASCADE`.

---

### Backend Updates

#### [NEW] [userController.js](file:///e:/Social%20Media%20Platform/backend/controllers/userController.js)
- Create controller for user-related actions:
  - `followUser`: Inserts into `followers`.
  - `unfollowUser`: Deletes from `followers`.
  - `getFollowers`: Fetches users following a specific user.
  - `getFollowing`: Fetches users a specific user is following.
  - `getUserProfile`: Fetches a user's profile by ID, including their follower/following counts, post count, and an `is_following` boolean (using `optionalAuth` to determine if the requesting user follows them).

#### [NEW] [userRoutes.js](file:///e:/Social%20Media%20Platform/backend/routes/userRoutes.js)
- Create routes mounted at `/api/users`:
  - `POST /:id/follow` (Protected)
  - `DELETE /:id/unfollow` (Protected)
  - `GET /:id/followers` (Public)
  - `GET /:id/following` (Public)
  - `GET /:id` (Public with `optionalAuth`)

#### [MODIFY] [profileController.js](file:///e:/Social%20Media%20Platform/backend/controllers/profileController.js)
- Update `getProfile` to also return `followers_count`, `following_count`, and `posts_count` for the current user's quick stats.

#### [MODIFY] [server.js](file:///e:/Social%20Media%20Platform/backend/server.js)
- Import and register `/api/users` routes.

---

### Frontend Updates

#### [MODIFY] [profile.html](file:///e:/Social%20Media%20Platform/frontend/profile.html)
- Change "Quick Stats" from "Friends / Likes" to "Followers / Following".
- Add an ID to the profile actions container so we can dynamically swap the "Edit Profile" button with a "Follow/Unfollow" button when viewing another user's profile.

#### [MODIFY] [profile.js](file:///e:/Social%20Media%20Platform/frontend/js/profile.js)
- Update `loadProfile` to check for an `?id=` URL parameter. If present, fetch `/api/users/:id`. Otherwise, fetch `/api/profile` (current user).
- Update `displayProfile` to render the follower/following counts.
- Add logic to hide the avatar upload button and "Edit Profile" button if viewing someone else's profile. Inject a "Follow" or "Unfollow" button instead based on `is_following`.
- Add `toggleFollow` function to call the follow/unfollow API endpoints.

#### [MODIFY] [feed.js](file:///e:/Social%20Media%20Platform/frontend/js/feed.js)
- Make post author avatars and names clickable links that point to `profile.html?id=${post.user_id}`, allowing users to discover profiles from the feed.

#### [MODIFY] [style.css](file:///e:/Social%20Media%20Platform/frontend/css/style.css)
- Add any needed styles for the Follow/Unfollow buttons (e.g., `.btn-follow`, `.btn-unfollow`).

---

### Documentation Updates

#### [MODIFY] [WALKTHROUGH.md](file:///e:/Social%20Media%20Platform/WALKTHROUGH.md)
- Append Phase 4 details.
- Explain how follow relationships work.
- Explain why `follower_id` and `following_id` are needed and how they represent directed relationships.
- Explain how counts are calculated dynamically using SQL subqueries.
- Add common interview questions related to Phase 4.

## User Review Required

> [!IMPORTANT]
> The current Profile page (`profile.html`) will be dual-purposed. If you visit `profile.html` normally, it shows your profile. If you click a user's name in the feed, it goes to `profile.html?id=123` to show their profile and the Follow button. Is this dual-purpose approach acceptable?

## Verification Plan

### Manual Verification
1. Run SQL schema updates.
2. Restart backend.
3. Open feed, click an author's name, verify it opens their profile.
4. Verify the Quick Stats show Posts, Followers, and Following.
5. Click Follow on their profile. Verify count increases and button changes to Unfollow.
6. Check your own profile to verify your "Following" count increased.
