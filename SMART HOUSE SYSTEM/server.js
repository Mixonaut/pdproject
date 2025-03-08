const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const path = require('path');
let http = require("http")
let fs = require("fs")

app.use(express.json())

const users = []



const preRegisterUser = async () => {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10); // Hash the password
        const user = { name: 'john', password: hashedPassword }; // Create a user object
        users.push(user); // Add the user to the array
        console.log('Pre-registered user:', user);
    } catch (error) {
        console.error('Error pre-registering user:', error);
    }
};

preRegisterUser();

app.get('/users', (req, res) => {
  res.json(users)
})

app.post('/users', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const user = { name: req.body.name, password: hashedPassword }
    users.push(user)
    res.status(201).send()
  } catch {
    res.status(500).send()
  }
})

app.post('/users/login', async (req, res) => {
  const user = users.find(user => user.name == req.body.name)
  if (user == null) {
    return res.status(400).send('Cannot find user')
  }
  try {
    if(await bcrypt.compare(req.body.password, user.password)) {
      res.send('Success')
    } else {
      res.send('Not Allowed')
    }
  } catch {
    res.status(500).send()
  }
})

//use style/js from public
app.use(express.static(path.join(__dirname,"public")));

//Serve pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'loginpage.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000)