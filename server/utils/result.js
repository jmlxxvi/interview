export const Result = (value, error) => {
  return {
    value,
    error,
    isError () {
      return this.error !== null
    },
    isOk () {
      return this.error === null
    }
  }
}

Result.ok = function (value) {
  return Result(value, null)
}

Result.fail = function (error, extra = null) {
  return Result(extra, error)
}

Result.select = function (isError, value, error) {
  if (isError) {
    return Result.fail(error)
  }
  return Result.ok(value)
}

Result.merge = function (...results) {
  for (const res of results) {
    if (res.isError()) {
      return res
    }
  }
  return Result.ok(results.map(r => r.value))
}

/*
For Result.fromPromise(func(param)) to work properly,
func(param) needs to be a function that returns a promise,
and that promise should reject on errors (like database errors, not found, etc.).

For example:
  findById: async (id) => {
      // Simulate database lookup
      const user = await database.query('SELECT * FROM users WHERE id = ?', [id]);

      if (!user) {
          // This will trigger Result.fail() in Result.fromPromise
          throw new Error('User not found');
      }

      return user; // This will trigger Result.ok() in Result.fromPromise
  }

If you have functions that don't follow this pattern, you can adapt them:
// Function that returns null instead of throwing
  const findUserOldStyle = async (id) => {
      const user = await db.getUser(id);
      return user; // Returns null if not found (no error)
  };

// Wrap it to make it work with Result.fromPromise
  const findUserWithErrors = async (id) => {
      const user = await findUserOldStyle(id);
      if (!user) {
          throw new Error('User not found');
      }
      return user;
  };

// Now it works:
  const result = await Result.fromPromise(findUserWithErrors(123));
*/
Result.fromPromise = async function (promise) {
  try {
    const value = await promise // Waits for the promise to resolve
    return Result.ok(value) // If promise resolves → success
  } catch (error) {
    return Result.fail(error) // If promise rejects → failure
  }
}

Result.flatMapAsync = async function (result, asyncFn) {
  if (result.isError()) return result
  return Result.fromPromise(asyncFn(result.value))
}

/*
Usage Examples with Promises
// Example with fetch API
async function fetchUserData(userId) {
    return Result.fromPromise(
        fetch(`/api/users/${userId}`).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
    );
}

// Example with database calls
async function getUserWithPosts(userId) {
    const userResult = await Result.fromPromise(db.users.findById(userId));
    if (userResult.isError()) {
        return userResult; // Early return on error
    }

    const postsResult = await Result.fromPromise(
        db.posts.findByUserId(userId)
    );
    if (postsResult.isError()) {
        return postsResult; // Early return on error
    }

    return Result.ok({
        user: userResult.value,
        posts: postsResult.value
    });
}

Chaining Promises with Result
// You can chain multiple async operations
async function processUserOrder(userId, orderId) {
    // Get user
    const userResult = await Result.fromPromise(db.users.findById(userId));
    if (userResult.isError()) return userResult;

    // Get order
    const orderResult = await Result.fromPromise(db.orders.findById(orderId));
    if (orderResult.isError()) return orderResult;

    // Validate ownership
    if (orderResult.value.userId !== userId) {
        return Result.fail(new Error('Order does not belong to user'));
    }

    // Process payment
    const paymentResult = await Result.fromPromise(
        paymentService.charge(orderResult.value.amount)
    );
    if (paymentResult.isError()) return paymentResult;

    return Result.ok({
        user: userResult.value,
        order: orderResult.value,
        payment: paymentResult.value
    });
}

// Usage with cleaner chaining
async function getUserProfile(userId) {
    const userResult = await Result.fromPromise(db.users.findById(userId));

    const profileResult = await Result.flatMapAsync(userResult,
        user => db.profiles.findByUserId(user.id)
    );

    const settingsResult = await Result.flatMapAsync(userResult,
        user => db.settings.findByUserId(user.id)
    );

    if (profileResult.isError()) return profileResult;
    if (settingsResult.isError()) return settingsResult;

    return Result.ok({
        user: userResult.value,
        profile: profileResult.value,
        settings: settingsResult.value
    });
}

// Express.js route handler with Result pattern
app.get('/api/users/:id/posts', async (req, res) => {
    const userId = parseInt(req.params.id);

    // Validate input
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get user and posts with error handling
    const userResult = await Result.fromPromise(db.users.findById(userId));
    if (userResult.isError()) {
        return res.status(404).json({ error: 'User not found' });
    }

    const postsResult = await Result.fromPromise(
        db.posts.findByUserId(userId)
    );
    if (postsResult.isError()) {
        return res.status(500).json({ error: 'Failed to fetch posts' });
    }

    res.json({
        user: userResult.value,
        posts: postsResult.value
    });
});

Batch Operations with Results
// Handle multiple promises with individual error handling
async function getMultipleUsers(userIds) {
    const promises = userIds.map(id =>
        Result.fromPromise(db.users.findById(id))
    );

    const results = await Promise.all(promises);

    const successful = results.filter(r => r.isOk()).map(r => r.value);
    const errors = results.filter(r => r.isError()).map(r => r.error);

    return Result.ok({
        users: successful,
        errors: errors.map(e => e.message)
    });
}

// Usage
const userIds = [1, 2, 3, 999]; // 999 might not exist
const result = await getMultipleUsers(userIds);

if (result.isError()) {
    console.error('Batch operation failed completely');
} else {
    console.log('Successful:', result.value.users);
    console.log('Errors:', result.value.errors);
}

*/
