const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");
const upload = require("./config/multerconfig");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname,"public")));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.render("index");
}); 

app.get('/profile/upload', (req, res) => {
    res.render("profileupload");
}); 

app.post('/upload',isLoggedIn , upload.single("image") , async (req, res) => {
    let user = await userModel.findOne({email: req.user.email});
    user.profilepic = req.file.filename;
    await user.save()
    res.redirect("/profile");
}); 

app.get('/login', (req, res) => {
    res.render("login");
}); 

app.get('/explore', isLoggedIn, async (req, res) => {
  const posts = await postModel.find().populate("user").sort({ _id: -1 }); // latest first
  res.render("explore", { posts, user: req.user });
});

app.get('/profile', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email}).populate("posts");
    res.render("profile", { user, loggedInUser: user }); 
});

app.get('/like/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate("user");

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    
    await post.save();
    res.redirect("/profile"); 
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");

    if (post.user._id.toString() !== req.user.userid.toString()) {
        return res.status(403).send("Unauthorized");
    }

    res.render("edit", { post });
});


app.get('/delete/:id',isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndDelete({_id: req.params.id});
    res.redirect("/profile");
})

app.get('/profile/:id', isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.params.id).populate("posts");
  const loggedInUser = await userModel.findById(req.user.userid); // fetch full user details
  res.render("profile", { user, loggedInUser });
});


app.get("/test-users", async (req, res) => {
  let users = await userModel.find();
  res.send(users);
});

app.post('/post', isLoggedIn, upload.single("image"), async (req, res) => {
    let user = await userModel.findOne({email: req.user.email});
    let { content } = req.body;

    let post = await postModel.create({
        user: user._id,
        content,
        image: req.file ? req.file.filename : null 
    });

    user.posts.push(post._id);  
    await user.save();
    res.redirect("/profile");
});

app.post("/update/:id", isLoggedIn, upload.single("image"), async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id });

    post.content = req.body.content;

    if (req.file) {
        post.image = req.file.filename;
    }
    await post.save();
    res.redirect("/profile");
});

app.post('/register', async (req, res) => {
    let { email, password, username, name, age } = req.body;

    let existingUser = await userModel.findOne({ email });
    if (existingUser) return res.status(500).send("User already registered");

    bcrypt.genSalt(10, (err, salt) => {
        if (err) return res.status(500).send("Error generating salt");

        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) return res.status(500).send("Error hashing password");

            let newUser = await userModel.create({
                username,
                email,
                age,
                name,
                password: hash
            });

            let token = jwt.sign({ email: email, userid: newUser._id }, "shhhh");
            res.cookie("token", token);
            return res.redirect("/profile"); 
        });
    });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        console.log("Missing email or password");
        return res.status(400).send("Missing credentials");
    }

    try {
        console.log("Login input:", req.body);
        const user = await userModel.findOne({ email });

        if (!user) {
            console.log("User not found for email:", email);
            return res.status(400).send("Invalid email or user does not exist");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log("Password incorrect for email:", email);
            return res.status(400).send("Incorrect password");
        }

        const token = jwt.sign({ email: user.email, userid: user._id }, "shhhh");
        res.cookie("token", token);
        res.redirect("/profile");
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).send("Server error during login");
    }
});

app.get('/logout', (req, res) => {
    res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
    res.redirect("/login");
});

app.get("/test-users", async (req, res) => {
  let users = await userModel.find();
  res.send(users);
});

function isLoggedIn(req, res, next){
    if(req.cookies.token === "") res.send("You must be logged in");
    else{
        let data = jwt.verify(req.cookies.token, "shhhh");
        req.user = data;
        next(); 
    }  
}

app.listen(3000);