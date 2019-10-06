//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const mongoAtlasUrl = "mongodb+srv://root:Angel11papa@cluster0-nugqv.mongodb.net"
const localHostDb = "mongodb://localhost:27017";
const app = express();
const PORT = process.env.PORT || 5000

const homeStartingContent = "";
const aboutContent = "This website  was built to help people get started with building a website or blog so they can help fund their lifestyle. So many people work their fingers to the bone to earn a living, working 40+ hours a week, never seeing their kids grow up and never being able to afford the good things in life.";

const contactContent = "Coming soon"
app.use(express.static(__dirname+"public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(mongoAtlasUrl+"/userDB", {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

const postSchema =  new mongoose.Schema({
  title: String,
  content: String
});
const userSchema = new mongoose.Schema ({
  name:String,
  dob:Date,
  mobile:String,
  facebookUrl:String,
  facebookId:String,
  email: String,
  password: String,
  googleId: String,
  imageUrl:String,
  posts: [postSchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const Post = mongoose.model("post", postSchema);
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://fierce-ravine-20519.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id ,name:profile.displayName}, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/userHome");
  });

app.get("/login", function(req, res){
  if (req.isAuthenticated()){
  res.render("userHome",{user:req.user});
} else {
  res.render("login");
}
});

app.get("/register", function(req, res){
  if (req.isAuthenticated()){
  res.render("userHome");
} else {
  res.render("register");
}
});

app.get("/userHome",function(req,res){
  //console.log(req.user)
  if (req.isAuthenticated()){
  res.render("userHome",{user:req.user});
} else {
  res.redirect("/login");
}
})

// app.get("/secrets", function(req, res){
//   User.find({"secret": {$ne: null}}, function(err, foundUsers){
//     if (err){
//       console.log(err);
//     } else {
//       if (foundUsers) {
//         res.render("secrets", {usersWithSecrets: foundUsers});
//       }
//     }
//   });
// });

// app.post("/submit", function(req, res){
//   const submittedSecret = req.body.secret;
//
// //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
//   // console.log(req.user.id);
//
//   User.findById(req.user.id, function(err, foundUser){
//     if (err) {
//       console.log(err);
//     } else {
//       if (foundUser) {
//         foundUser.secret = submittedSecret;
//         foundUser.save(function(){
//           res.redirect("/secrets");
//         });
//       }
//     }
//   });
// });

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username,name:req.body.name,dob:req.body.dob}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/userHome");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/userHome");
      });
    }
  });

});





//blog app
app.get("/", function(req, res) {

  User.find(function(err,users){
    //console.log(users)
    if(err){
      console.log(err);
    }
    else{
      const posts =[]
      users.forEach(function(user){
        user.posts.forEach(function(post){
          let mypost={
            _id:post._id,
            title:post.title,
            content:post.content,
            userId:user._id,
            author:user.name
          }
        //  console.log(mypost)
          posts.push(mypost)
        })
        //console.log(user.posts)
        //posts.push(user.posts)
      })
      //console.log(posts)
      res.render("home", {
        startingContent: homeStartingContent,
        posts: posts
      });
    }
  })
});

app.get("/about", function(req, res) {
  res.render("about", {
    aboutContent: aboutContent
  });
});

app.get("/contact", function(req, res) {
  res.render("contact", {
    contactContent: contactContent
  });
});

app.get("/compose", function(req, res) {
  res.render("compose",{user:req.user});
});

app.post("/compose", function(req, res) {

  const userId = req.body.userId;
  const post = {
    title: req.body.postTitle,
    content: req.body.postBody
  };
  User.findOne({_id:userId},function(err,user){
    if(err){
      console.log(err)
    }
    else{
      user.posts.push(post)
      user.save()
    }
  })


  Post.create(post, function(err) {
    if (err) {
      console.log(err);
    }
    if (!err) {
      res.redirect("/");
    }
  })
});

app.get("/posts/:postId/:userId", function(req, res) {
  const postId = req.params.postId;
  const userId = req.params.userId;

  User.findOne({_id:userId},function(err,user){
    if(err){
      console.log(err)
    }
    else{
      user.posts.forEach(function(post){
        if(post._id == postId){
          res.render("post", {
            title: post.title,
            content: post.content,
            user:user
          });
        }
      })
    }
  })

  Post.findOne({
    _id: postId
  }, function(err, post) {
    console.log(post)
    if (err) {
      //error page
    }
    if (post != null) {
      res.render("post", {
        title: post.title,
        content: post.content
      });
    }
  })
});

app.get("/userposts/:postId", function(req, res) {

  const postId = req.params.postId;
  const userId = req.user;
  console.log(req.user)
  const posts = req.user.posts;
//  console.log(posts)
  //console.log(posts)
  posts.forEach(function(post){
    if(post._id == postId){
      res.render("userpost", {
        user:req.user,
        postId:postId,
        title: post.title,
        content: post.content
      });
    }
  })
});

app.post("/editpost",function(req,res){
   const postId = req.body.postId;
   const userId = req.body.userId;
   const posts = req.user.posts;
   posts.forEach(function(post){
     if(post._id == postId){
       res.render("editpost", {
         user:req.user,
         userId:userId,
         postId:postId,
         title: post.title,
         content: post.content
       });
     }
   })
})


app.post("/savepost",function(req,res){
  const user = req.user;
  const postId = req.body.postId
  const posts = req.user.posts;
  const title= req.body.postTitle
  const content= req.body.postBody
  posts.forEach(function(post){
    if(post._id == postId){
     post.title = title;
     post.content=content;
    }
  })
  req.user.save()
  res.redirect("/userHome")

})


app.listen(PORT, function() {
  console.log("Server started on port 3000."+PORT);
});
