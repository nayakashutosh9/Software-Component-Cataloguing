require('dotenv').config();
const express=require('express');
const app=express();
const bodyParser=require('body-parser');
const mongoose=require('mongoose');
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");

app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect(process.env.DB_URL,{useNewUrlParser:true,useUnifiedTopology:true});
mongoose.set("useCreateIndex",true);


const userSchema=new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  admin: Boolean
});
userSchema.plugin(passportLocalMongoose);
const User=new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


const componentSchema=new mongoose.Schema({
  name: String,
  type: String,
  category: String,
  description: String,
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const Component=new mongoose.model("Component",componentSchema);

const categorySchema=new mongoose.Schema({
  name:String
});

const Category=new mongoose.model("Category",categorySchema);



app.get("/",function(req,res){
  var curUser = null;
  if (req.isAuthenticated()) {
    curUser = req.user;
  }
  res.render("home",{user:curUser});
});




app.get("/add",async function(req,res){
  if(req.isAuthenticated()){
    await Category.find().exec(function(err, foundCategories) {
      if (err) {
        res.send(err);
      } else {
        res.render("add", {
          user:req.user,
          categories: foundCategories
        });
      }
    });
  }
  else{
    res.redirect("/login",{user:null});
  }
});



app.post("/add",function(req,res){
  if(req.isAuthenticated()){
    console.log(req.body.name);
    console.log(req.body.description);
    console.log(req.body.type);
    console.log(req.body.category);
    res.redirect("/add");
  }
  else{
    res.redirect("/login",{user:null});
  }
});



app.get("/terms", function(req, res) {
  var curUser = null;
  if (req.isAuthenticated()) {
    curUser = req.user;
  }
  res.render("info", {
    title: "Terms",
    user: curUser
  });
});


app.get("/privacy", function(req, res) {
  var curUser = null;
  if (req.isAuthenticated()) {
    curUser = req.user;
  }
  res.render("info", {
    title: "Privacy Policy",
    user: curUser
  });
});


app.get("/refund", function(req, res) {
  var curUser = null;
  if (req.isAuthenticated()) {
    curUser = req.user;
  }
  res.render("info", {
    title: "Refund Policy",
    user: curUser
  });
});


app.get("/disclaimer", function(req, res) {
  var curUser = null;
  if (req.isAuthenticated()) {
    curUser = req.user;
  }
  res.render("info", {
    title: "Disclaimer",
    user: curUser
  });
});



app.get("/login", function(req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/");
  } else {
    res.render("login", {
      user: null
    });
  }
});



app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, async function(err) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      await passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  })
});



app.get("/logout", function(req, res) {
  if (req.isAuthenticated()) {
    req.logout();
    res.redirect("/");
  } else {
    res.redirect("/");
  }
});



app.get("/register", function(req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/");
  } else {
    res.render("register", {
      user: null
    });
  }
});




app.post("/register", function(req, res) {
  User.register({
    username: req.body.username,
    name: req.body.name,
    admin: false
  }, req.body.password, async function(err, user) {
    if (err) {
      res.send(err.message + " go back and use different email as username.");
      res.redirect("/register");
    } else {
      await passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });
});





const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Server is running on port ' + PORT);
});
