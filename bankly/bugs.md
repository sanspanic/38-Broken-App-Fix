# BUGS

## Bug 1 - ./middleware/auth.js
##### Line 47 - 60, function authUser

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
      //BUG 1
      //let payload = jwt.decode(token);
      //BUG 1 FIX
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
##### line 67 - PATCH /[username]

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
* line 169 

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
* line 70 in .routes/users.js

```
router.patch(
  "/:username",
  authUser,
  requireLogin,
  //BUG 2
  //requireAdmin,
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
##### Line 67 - 90, PATCH /[username]

```
router.patch(
  "/:username",
  authUser,
  requireLogin,
  //BUG 2
  //requireAdmin,
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
###### Issues: 

* This route is meant to throw an error if invalid data is passed in. The only allowed data is first\_name, last\_name, phone & email. 
* Currently, the method proceeds to patch even disallowed fields, such as admin. It only errors out if the data provided does not match the column names of the table that is being updated, and this error is not handled. 

###### Test:
* line 189 - the following pre-existing test started failing after previous Bug (2) was fixed. It had been passing because admin user was previously unable to update self without being admin - which is the wrong reason.

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
* added JSON Schema validation that only allows appropriate fields to be passed in
* line 86 in ./routes/user.js

```
router.patch(
  "/:username",
  authUser,
  requireLogin,
  //BUG 2
  //requireAdmin,
  //BUGFIX: removed middleware requireAdmin
  async function (req, res, next) {
    try {
      if (!req.curr_admin && req.curr_username !== req.params.username) {
        throw new ExpressError("Only that user or admin can edit a user.", 401);
      }

      // get fields to change; remove token so we don't try to change it
      let fields = { ...req.body };
      delete fields._token;

      //BUG 3: no validation
      //BUGIFX: added validation
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
##### Line 67 - 90, PATCH /[username]

```
router.patch(
  "/:username",
  authUser,
  requireLogin,
  //BUG 2
  //requireAdmin,
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
###### Issues: 

* This route is meant to throw an error if invalid data is passed in. The only allowed data is first\_name, last\_name, phone & email. 
* Currently, the method proceeds to patch even disallowed fields, such as admin. It only errors out if the data provided does not match the column names of the table that is being updated, and this error is not handled. 

###### Test:
* line 189 - the following pre-existing test started failing after previous Bug (2) was fixed. It had been passing because admin user was previously unable to update self without being admin - which is the wrong reason.

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
* added JSON Schema validation that only allows appropriate fields to be passed in
* line 86 in ./routes/user.js

```
router.patch(
  "/:username",
  authUser,
  requireLogin,
  //BUG 2
  //requireAdmin,
  //BUGFIX: removed middleware requireAdmin
  async function (req, res, next) {
    try {
      if (!req.curr_admin && req.curr_username !== req.params.username) {
        throw new ExpressError("Only that user or admin can edit a user.", 401);
      }

      // get fields to change; remove token so we don't try to change it
      let fields = { ...req.body };
      delete fields._token;

      //BUG 3: no validation
      //BUGIFX: added validation
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
