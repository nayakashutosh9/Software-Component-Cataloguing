require('dotenv').config();
const express=require('express');
const app=express();
const bodyParser=require('body-parser');
const mongoose=require('mongoose');
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const dateformat=require("dateformat");

app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } //24hrs
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
  },
  author: String,
  date: Date,
  formated_date: String
});

const Component=new mongoose.model("Component",componentSchema);

const categorySchema=new mongoose.Schema({
  name:String
});

const Category=new mongoose.model("Category",categorySchema);



app.get("/",async function(req,res){
  var curUser = null;
  if (req.isAuthenticated()) {
    curUser = req.user;
  }
  await Component.find().sort({date:-1}).exec(async function(err,foundComponents){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      await Category.find().exec(function(err,foundCategories){
        if(err){
          res.send(err);
        }
        else{
          res.render("home",{user:curUser,components:foundComponents,categories:foundCategories});
        }
      });
    }
  });
});



app.post("/search",async function(req,res){
  var curUser = null;
  if (req.isAuthenticated()) {
    curUser = req.user;
  }
  var name="",author="",type="",category="",sort=-1;
  if(req.body.sort==="Ascending") sort=1;
  if(req.body.type!=="Select Type") type=req.body.type;
  if(req.body.category!=="Select Category") type=req.body.category;
  if(req.body.name) name=req.body.name;
  if(req.body.author) author=req.body.author;
  await Component.find({name:{$regex:name},author:{$regex:author},type:{$regex:type},category:{$regex:category}}).sort({date:sort}).exec(async function(err,foundComponents){
    if(err){
      res.send(err);
    }
    else{
      await Category.find().exec(function(err,foundCategories){
        if(err){
          res.send(err);
        }
        else{
          res.render("home",{user:curUser,components:foundComponents,categories:foundCategories});
        }
      });
    }
  });
});




app.get("/admin",async function(req,res){
  if(req.isAuthenticated() && req.user.admin){
    await Component.find().sort({date:-1}).exec(async function(err,foundComponents){
      if(err){
        res.send(err);
      }
      else{
        await Category.find().exec(function(err,foundCategories){
          if(err){
            res.send(err);
          }
          else{
            res.render("admin",{user:req.user,components:foundComponents,categories:foundCategories});
          }
        })
      }
    });
  }
  else{
    res.send("Not logged in/Admin access required");
  }
});



app.post("/category/add",function(req,res){
  if(req.isAuthenticated() && req.user.admin){
    category=new Category({
      name:req.body.category
    });
    category.save();
    res.redirect("/admin");
  }
  else{
    res.send("Not logged in/Admin access required");
  }
});



app.get("/category/edit/:cid",async function(req,res){
  var categoryId=req.params.cid;
  if(req.isAuthenticated() && req.user.admin){
    await Category.findOne({_id:categoryId}).exec(function(err,foundCategory){
      if(err){
        res.send(err);
      }
      else{
        res.render("cat",{user:req.user,category:foundCategory,categoryId:categoryId,type:"edit"});
      }
    });
  }
  else{
    res.send("Not logged in/Admin access required");
  }
});



app.post("/category/edit/:cid",async function(req,res){
  var categoryId=req.params.cid;
  if(req.isAuthenticated() && req.user.admin){
    const result=await Category.updateOne({_id:categoryId},{$set:{name:req.body.category}});
    res.redirect("/admin");
  }
  else{
    res.send("Not logged in/Admin access required");
  }
});




app.get("/category/delete/:cid",async function(req,res){
  var categoryId=req.params.cid;
  if(req.isAuthenticated() && req.user.admin){
    await Category.findOne({_id:categoryId}).exec(function(err,foundCategory){
      if(err){
        res.send(err);
      }
      else{
        res.render("cat",{user:req.user,category:foundCategory,categoryId:categoryId,type:"delete"});
      }
    });
  }
  else{
    res.send("Not logged in/Admin access required");
  }
});




app.post("/category/delete/:cid",async function(req,res){
  var categoryId=req.params.cid;
  if(req.isAuthenticated() && req.user.admin){
    const result=await Category.deleteOne({_id:categoryId});
    res.redirect("/admin");
  }
  else{
    res.send("Not logged in/Admin access required");
  }
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
    res.redirect("/login");
  }
});



app.post("/add",function(req,res){
  if(req.isAuthenticated()){
    var date_now=new Date();
    component=new Component({
      name: req.body.name,
      type: req.body.type,
      category: req.body.category,
      description: req.body.description,
      userid: req.user._id,
      author: req.user.name,
      date: date_now,
      formated_date: dateformat(date_now, "mmmm dS, yyyy, h:MM TT")
    });
    component.save();
    res.redirect("/add");
  }
  else{
    res.redirect("/login");
  }
});



app.get("/detail/:cid",async function(req,res){
  var componentId=req.params.cid;
  var curUser = null;
  if (req.isAuthenticated()) {
    curUser = req.user;
  }
  await Component.findOne({_id:componentId}).exec(function(err,foundComponent){
    if(err){
      res.send(err);
    }
    else{
      res.render("detail",{user:curUser,component:foundComponent});
    }
  })
});



app.get("/edit/:cid",async function(req,res){
  var componentId=req.params.cid;
  if(req.isAuthenticated()){
    await Component.findOne({_id:componentId}).exec(async function(err,foundComponent){
      if(err){
        res.send(err);
      }
      else{
        await Category.find().exec(function(err,foundCategories){
          if(err){
            res.send(err);
          }
          else{
            res.render("edit",{user:req.user,component:foundComponent,categories:foundCategories});
          }
        })
      }
    })
  }
  else{
    res.redirect("/login");
  }
});



app.post("/edit/:cid",async function(req,res){
  var componentId=req.params.cid;
  if(req.isAuthenticated()){
    const result=await Component.updateOne({_id:componentId},{
      $set:{
        name: req.body.name,
        type: req.body.type,
        category: req.body.category,
        description: req.body.description
      }
    });
    res.redirect("/detail/"+componentId);
  }
  else{
    res.redirect("/login");
  }
});



app.get("/delete/:cid",function(req,res){
  var componentId=req.params.cid;
  if(req.isAuthenticated()){
    res.render("delete",{user:req.user,componentId:componentId});
  }
  else{
    res.redirect("/login");
  }
});



app.post("/delete/:cid",async function(req,res){
  var componentId=req.params.cid;
  if(req.isAuthenticated()){
    const result=await Component.deleteOne({_id:componentId});
    res.redirect("/");
  }
  else{
    res.redirect("/login");
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
