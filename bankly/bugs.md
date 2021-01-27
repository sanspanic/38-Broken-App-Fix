# BUGS

## Bug 1 - ./middleware/auth.js
##### Line 47 - 63, function authUser

```
function authUser(req, res, next) {
  try {
    const token = req.body._token || req.query._token;
    if (token) {
      let payload = jwt.decode(token);
      req.curr_username = payload.username;
      req.curr_admin = payload.admin;
    }
    return next();
  } catch (err) {
    err.status = 401;
    return next(err);
  }
}

```
###### Issues: 

* token is typically not passed on via req.body or req.query. It is passed to the server via req.headers. Front-end often passes in JWT via header with the pre-fix 'Bearer ', which should be accounted for on the backend. Not a bug per se though because this method is possible too. 
* the method to safely extract the payload from the token is not ```jwt.decode(token)```but ```jwt.verify(token, SECRET_KEY)```. Decoding the token on its own does not validate the signature, which is a security vulnerability since anyone could tamper with the payload. 

###### Test:
* line 89

```
describe("MIDDLEWARE auth.js works", function () {
  test("should prevent payload from being tampered with", async function () {
    //change u1 token payload and sign with a diff key
    const tamperedToken = jwt.sign(
      { username: "u1", admin: true },
      "wrong-key"
    );
    const response = await request(app)
      .get("/users")
      .send({ _token: tamperedToken });
    expect(response.statusCode).toBe(401);
  });
});
```
* expected: status code 401, received: status code 200

###### Fix: 
* line 54 in ./middleware/auth.js

```
function authUser(req, res, next) {
  try {
    const token = req.body._token || req.query._token;
    if (token) {
      //BUGFIX:
      let payload = jwt.verify(token, SECRET_KEY);
      req.curr_username = payload.username;
      req.curr_admin = payload.admin;
    }
    return next();
  } catch (err) {
    err.status = 401;
    return next(err);
  }
}
```
## Bug 2 - ./routes/users.js
##### line 69 - PATCH /[username]

```
router.patch(
  "/:username",
  authUser,
  requireLogin,
  requireAdmin,
  async function (req, res, next) {
    try {
      if (!req.curr_admin && req.curr_username !== req.params.username) {
        throw new ExpressError("Only that user or admin can edit a user.", 401);
      }

      // get fields to change; remove token so we don't try to change it
      let fields = { ...req.body };
      delete fields._token;

      let user = await User.update(req.params.username, fields);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  }
);
```
###### Issues: 
* This route is meant to work for admins as well as non-admin users, as long as they try to update their own profiles. However, currently, the "requireAdmin" middleware is passed in, which renders the route impossible for non-admin users updating their own profiles

###### Test: 
* line 189 

```
test("should patch data if self", async function () {
    const response = await request(app)
      .patch("/users/u1")
      .send({ _token: tokens.u1, first_name: "new-fn1" }); // u1 is non-admin, updating self
    expect(response.statusCode).toBe(200);
    expect(response.body.user).toEqual({
      username: "u1",
      first_name: "new-fn1",
      last_name: "ln1",
      email: "email1",
      phone: "phone1",
      admin: false,
      password: expect.any(String),
    });
  });
```
* expected: status code 201, received: status code 401

###### Fix: 
* line 75 in .routes/users.js

```
router.patch(
  "/:username",
  authUser,
  requireLogin,
  //BUGFIX: removed middleware requireAdmin
  async function (req, res, next) {
    try {
      if (!req.curr_admin && req.curr_username !== req.params.username) {
        throw new ExpressError("Only that user or admin can edit a user.", 401);
      }

      // get fields to change; remove token so we don't try to change it
      let fields = { ...req.body };
      delete fields._token;

      let user = await User.update(req.params.username, fields);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  }
);
```
## Bug 3 - ./routes/user.js
##### Line 67 - 100, PATCH /[username]

```
router.patch(
  "/:username",
  authUser,
  requireLogin,
  requireAdmin,  //BUG 2
  async function (req, res, next) {
    try {
      if (!req.curr_admin && req.curr_username !== req.params.username) {
        throw new ExpressError("Only that user or admin can edit a user.", 401);
      }

      // get fields to change; remove token so we don't try to change it
      let fields = { ...req.body };
      delete fields._token;

      let user = await User.update(req.params.username, fields);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  }
);

```
###### Issues: 

* This route is meant to throw an error if invalid data is passed in. The only allowed data is first\_name, last\_name, phone & email. 
* Currently, the method proceeds to patch even disallowed fields, such as admin. It only errors out if the data provided does not match the column names of the table that is being updated, and this error is not handled. 

###### Test:
* line 206 - the following pre-existing test started failing after previous Bug (2) was fixed. It had been passing because admin user was previously unable to update self without being admin - which is the wrong reason. It should fail because it was attempting to patch unauthorized fields.

```  
test("should disallow patching not-allowed-fields", async function () {
    const response = await request(app)
      .patch("/users/u1")
      .send({ _token: tokens.u1, admin: true });
    expect(response.statusCode).toBe(401);
  });
```
* expected: status code 401, received: status code 200
* added one more test and changed expected status code to 400 (bad request) in both tests

```
test("should disallow patching fields that don't exist on db side", async function () {
    const response = await request(app)
      .patch("/users/u1")
      .send({ _token: tokens.u1, random: false });
    expect(response.statusCode).toBe(400);
  });
```
* expected: status code 400, received: status code 500
  

###### Fix: 
* added JSON Schema validation that only allows appropriate fields to be passed in using npm package jsonschema
* new file: ./schemas/userUpdate.json
* line 87 in ./routes/user.js

```
router.patch(
  "/:username",
  authUser,
  requireLogin,
  async function (req, res, next) {
    try {
      if (!req.curr_admin && req.curr_username !== req.params.username) {
        throw new ExpressError("Only that user or admin can edit a user.", 401);
      }

      // get fields to change; remove token so we don't try to change it
      let fields = { ...req.body };
      delete fields._token;

      //BUGFIX: added validation
      const validator = jsonschema.validate(fields, userUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map((e) => e.stack);
        throw new ExpressError(errs, 400);
      }

      let user = await User.update(req.params.username, fields);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  }
);
```
## Bug 4 - ./routes/user.js
##### Line 112 - 127, DELETE /[username]

```
router.delete(
  "/:username",
  authUser,
  requireAdmin,
  async function (req, res, next) {
    try {
      User.delete(req.params.username); //BUG 4
      return res.json({ message: "deleted" });
    } catch (err) {
      return next(err);
    }
  }
);
```
###### Issues: 

* missing "await" keyword before User.delete which lead to unhandled error if deleting non-existing user

###### Test:
* line 251 

```  
  test("should throw 404 if user doesn't exist", async function () {
    const response = await request(app)
      .delete("/users/no-such-user")
      .send({ _token: tokens.u3 }); // u3 is admin
    expect(response.statusCode).toBe(404);
  });
```
* expected: status code 404, received: test failed with  UnhandledPromiseRejectionWarning
  

###### Fix: 
* added await keyword in line 121 of ./routes/users.js

```
router.delete(
  "/:username",
  authUser,
  requireAdmin,
  async function (req, res, next) {
    try {
      //BUGFIX:
      await User.delete(req.params.username);
      return res.json({ message: "deleted" });
    } catch (err) {
      return next(err);
    }
  }
);
```

## Bug 5 - ./models/user.js
##### Line 80 - 91, User.getAll()
```
static async getAll(username, password) {
    const result = await db.query(
      `SELECT username,
                first_name,
                last_name,
                email,
                phone
            FROM users 
            ORDER BY username`
    );
    return result.rows;
  }
```
###### Issues: 

* The route that uses this method is meant to return basic information about the user only, consisting of username, first_name and last_name. However, calling getAll() currently returns email and phone as well. 

###### Test:
* line 118 

```  
test("should only list basic info about users", async function () {
    const response = await request(app)
      .get("/users")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toBe(200);
    expect(response.body.users[0]).toEqual({
      username: "u1",
      first_name: "fn1",
      last_name: "ln1",
    });
  });
```
* expected: {
      username: "u1",
      first\_name: "fn1",
      last\_name: "ln1",}       
* received: {"email": "email1", "first\_name": "fn1", "last\_name": "ln1", "phone": "phone1", "username": "u1"}
    
  

###### Fix: 
* line 82 in ./models/user.js: changed User model method getAll() to only return desired columns

```
  static async getAll(username, password) {
    const result = await db.query(
      //BUGFIX: removed email and phone
      `SELECT username,
                first_name,
                last_name
            FROM users 
            ORDER BY username`
    );
    return result.rows;
  }
```
## Bug 6 - ./models/user.js
##### Line 99 - 121, User.get(username)
```
static async get(username) {
    const result = await db.query(
      `SELECT username,
                first_name,
                last_name,
                email,
                phone
         FROM users
         WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      new ExpressError("No such user", 404);
    }

    return user;
  }
```
###### Issues: 

* The route that uses this method is meant to raise a 404 error in case the username passed in is not found. However, the "throw" keyword is missing so the error never gets raised, even when an invalid username is passed in. 

###### Test:
* line 152 

```  
  test("should throw 404 if user not found", async function () {
    const response = await request(app)
      .get("/users/not-a-user")
      .send({ _token: tokens.u1 });
    expect(response.statusCode).toBe(404);
  });
```
* expected statusCode: 404, got: 200

    
  

###### Fix: 
* line 117 in ./models/user.js: changed User model method get(username) to throw error upon invalid username

```
static async get(username) {
    const result = await db.query(
      `SELECT username,
                first_name,
                last_name,
                email,
                phone
         FROM users
         WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      //BUGFIX:
      throw new ExpressError("No such user", 404);
    }

    return user;
  }
```


