import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import passport from "passport";
import env from "dotenv";

env.config();
// const connectionString =
//   "postgresql://postgres:Otar-Postgres-1996@localhost:5432/Blog";

// const db = new pg.Client({
//   connectionString: connectionString,
// });

const saltRounds = 10;

const db = new pg.Client({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
});

db.connect();

// let activeId;

// let isLoggedIn = false;

const port = 3000;
const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

app.get("/", async (req, res) => {
  const data = await db.query("SELECT * FROM posts");

  let array = data.rows;

  res.render("index.ejs", {
    loggedIn: req.isAuthenticated(),
    headTitle: "Otto's Blog",
    data: array,
  });
});

app.get("/post/:id", async (req, res) => {
  let id = Number(req.params.id);

  const post = await db.query("SELECT * FROM posts WHERE id=($1)", [id]);

  const data = post.rows[0];
  // console.log("Active id " + user.id);
  console.log("Author id " + data.user_id);
  console.log("Post id " + id);
  const isAuthor = req.user && req.user.id === data.user_id;
  console.log(isAuthor);

  res.render("post.ejs", {
    loggedIn: req.isAuthenticated(),
    isAuthor: isAuthor,
    headTitle: post.title,
    data: data,
  });
  // db.end();

  // const post = array.find((post) => {
  //   return post.id === id;
  // });
  // if (!post) {
  //   res.status(404).send("Post not found");
  // } else {
  //   res.render("post.ejs", { loggedIn: isLoggedIn, headTitle: post.title, data: post });
  // }
});

app.get("/create", isAuthenticated, (req, res) => {
  res.render("create.ejs", {
    loggedIn: req.isAuthenticated(),
    headTitle: "Create your post",
  });
});

app.post("/create", isAuthenticated, async (req, res) => {
  let title = req.body["title"];
  let author = req.body["author"];
  let text = req.body["post-body"];
  // let id = array[array.length - 1].id + 1;

  const post = await db.query(
    "INSERT INTO posts (title, author, text, user_id) VALUES($1,$2,$3,$4) RETURNING *",
    [title, author, text, req.user.id]
  );
  console.log(post.rows[0]);
  // array.push({
  //   id: id,
  //   title: title,
  //   text: text,
  //   author: author,
  // });
  res.redirect("/");
});

app.get("/edit/:id", isAuthenticated, async (req, res) => {
  let id = parseInt(req.params.id);

  const post = await db.query("SELECT * FROM posts WHERE id=$1", [id]);

  // console.log("id at entering the edit.ejs: " + id);
  // const post = array.find((post) => {
  //   return post.id === id;
  // });
  // if (!post) {
  //   res.status(400).send("Post was not found");
  // }
  res.render("edit.ejs", {
    loggedIn: req.isAuthenticated(),
    headTitle: "Edit post",
    post: post.rows[0],
  });
});

app.post("/edit/:id", isAuthenticated, async (req, res) => {
  let id = parseInt(req.params.id);
  let title = req.body["title"];
  let author = req.body["author"];
  let text = req.body["text"];

  const post = await db.query(
    "UPDATE posts SET title=$1, author=$2, text=$3 WHERE id=$4 RETURNING *",
    [title, author, text, id]
  );
  console.log(post.rows[0]);

  // console.log("id at submitting the editting " + id);
  // if (!id) {
  //   console.log("No post with this ID was found");
  // }
  // let index = array.findIndex((post) => {
  //   return post.id === id;
  // });
  // console.log(index);
  // console.log("that was an index");

  res.redirect("/");
});

app.post("/delete/:id", isAuthenticated, async (req, res) => {
  let id = parseInt(req.params["id"]);

  const post = await db.query("DELETE FROM posts WHERE id=$1 RETURNING *", [
    id,
  ]);
  console.log(post.rows[0]);
  // console.log(id);
  // let index = array.findIndex((post) => {
  //   return post.id === id;
  // });
  // console.log(index);
  // console.log(array.length);
  // if (index !== -1) {
  //   array.splice(index, 1);
  // }
  // console.log(array.length);
  res.redirect("/");
});

app.get("/login", (req, res) => {
  res.render("login.ejs", { headTitle: "Log in" });
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs", { headTitle: "Sign up" });
});

app.post("/signup", async (req, res) => {
  const { email, username, password } = req.body;
  // let email = user.email;
  // let username = user.username;
  // let password = user.password;
  if (email && username && password) {
    const hash = await bcrypt.hash(password, saltRounds);
    if (hash) {
      const result = await db.query(
        "INSERT INTO users(email, username, password) VALUES($1, $2, $3) RETURNING *",
        [email, username, hash]
      );
      // console.log();
      let user = result.rows[0];
      // console.log(user);
      if (user) {
        req.login(user, (err) => {
          if (err) {
            console.error("Error logging in:", err);
            return res.redirect("/login");
          }
          console.log("Logged in successfully");
          res.redirect("/");
        });
        // res.redirect("/login");
      }
    } else {
      return cb(err);
    }
    //  async (err, hash) => {
    //   if (err) {
    //     console.log("Password hashing failed.", err);
    //   } else {
    //     const result = await db.query(
    //       "INSERT INTO users(email, username, password) VALUES($1, $2, $3) RETURNING *",
    //       [email, username, hash]
    //     );
    //     console.log();
    //     let user = result.rows[0];
    //     console.log(user);
    //     if (user) {
    //       res.redirect("/login");
    //     }
    //   }
    // });
  } else {
    res.redirect("/signup");
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/myposts",
    failureRedirect: "/login",
  })
);

app.get("/auth/google", passport.authenticate("google",{
  scope: ["profile", "email"],
}));

app.get("/auth/google/myposts", passport.authenticate("google", {
  successRedirect: "/myposts",
  failureRedirect: "/login",
}));

app.get("/myposts", isAuthenticated, async (req, res) => {
  let user = req.user;
  console.log(req.user);
  const result = await db.query("SELECT * FROM posts WHERE user_id=$1", [
    user.id,
  ]);
  console.log("romelixar", result.rows);
  console.log("alo", result.rows[0]);
  res.render("myposts.ejs", { loggedIn: req.isAuthenticated(), data: result.rows, headTitle: "My Posts" });
});

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
  });
  res.redirect("/");
});

passport.use(
  new Strategy({ usernameField: "email" }, async function verify(
    username,
    password,
    cb
  ) {
    try {
      if (username && password) {
        const result = await db.query("SELECT * FROM users WHERE email=$1", [
          username,
        ]);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          // activeId = user.id;
          console.log(user);
          const storedHashedPassword = user.password;
          console.log(storedHashedPassword);
          console.log(password);
          const match = await bcrypt.compare(
            password,
            storedHashedPassword
            // (err, result) => {
            //   if (err) {
            //     console.log("Error comparing the passwords.", err);
            //   } else {
            //     console.log("Passwords are identical");
            //     isLoggedIn = result;
            //     res.redirect("/");
            //   }
            // }
          );
          if (match) {
            console.log("Passwords are identical");
            // isLoggedIn = result;
            return cb(null, user);
          } else {
            return cb(null, false, { message: "Password incorrect" });
          }
        } else {
          // res
          //   .status(400)
          //   .send("No account with given email and password has been found");
          return cb(null, false, { message: "User not found" });
        }
      }
    } catch (err) {
      return cb(err);
    }
  })
);

console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/myposts",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const google_id = profile.id;
        const email = profile.emails[0].value;
        const result = await db.query("SELECT * FROM users WHERE email=$1", [
          email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users(email, password) VALUES($1,$2) RETURNING *",
            [email, "google_id"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query("SELECT * FROM users where id=$1", [id]);
    if (result.rows.length > 0) {
      cb(null, result.rows[0]);
    } else {
      cb(null, false);
    }
  } catch (error) {
    cb(error);
  }
});

app.listen(port, () => {
  console.log(`Port ${port} working properly.`);
});
