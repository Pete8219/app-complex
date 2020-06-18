const bcrypt = require("bcryptjs")
const usersCollection = require("../db")
  .db()
  .collection("users")

const validator = require("validator")

let User = function(data) {
  this.data = data
  this.errors = []
}

User.prototype.cleanUp = function() {
  if (typeof this.data.username != "string") {
    this.data.username = ""
  }
  if (typeof this.data.email != "string") {
    this.data.email = ""
  }
  if (typeof this.data.password != "string") {
    this.data.password = ""
  }

  //заполняем значениями из формы если все нормально
  this.data = {
    username: this.data.username.trim().toLowerCase(),
    email: this.data.email.trim().toLowerCase(),
    password: this.data.password
  }
}

User.prototype.validate = function() {
  return new Promise(async (resolve, reject) => {
    if (this.data.username == "") {
      this.errors.push("You must provide a username")
    }
    if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) {
      this.errors.push("Имя пользователя может содержать только буквы и цифры")
    }
    if (!validator.isEmail(this.data.email)) {
      this.errors.push("You must provide a email")
    }
    if (this.data.password == "") {
      this.errors.push("You must provide a password")
    }

    if (this.data.password.length > 0 && this.data.password.length < 12) {
      this.errors.push("Пароль должен быть не менее 12 символов")
    }
    if (this.data.password.length > 50) {
      this.errors.push("Пароль не должен превышать 50 символов")
    }
    if (this.data.username.length > 0 && this.data.username.length < 3) {
      this.errors.push("Имя пользователя должно быть не менее 3 символов")
    }
    if (this.data.username.length > 30) {
      this.errors.push("Имя пользователя не должено превышать 30 символов")
    }

    //проверяем имя пользователя на уникальность в базе

    if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
      let usernameExist = await usersCollection.findOne({ username: this.data.username })
      if (usernameExist) {
        this.errors.push("Такое имя пользователя уже занято")
      }
    }

    //проверяем Email пользователя на уникальность в базе

    if (validator.isEmail(this.data.email)) {
      let emailExist = await usersCollection.findOne({ email: this.data.email })
      if (emailExist) {
        this.errors.push("Такой адрес уже существует в базе")
      }
    }

    resolve()
  })
}

User.prototype.register = function() {
  return new Promise(async (resolve, reject) => {
    //clear data
    this.cleanUp()
    //validate user data
    await this.validate()

    //сохраняем данные пользователя в базу

    if (!this.errors.length) {
      //hash user password

      let salt = bcrypt.genSaltSync(10)
      this.data.password = bcrypt.hashSync(this.data.password, salt)
      await usersCollection.insertOne(this.data)
      resolve()
    } else {
      reject(this.errors)
    }
  })
}

User.prototype.login = function() {
  return new Promise((resolve, reject) => {
    this.cleanUp()
    usersCollection
      .findOne({ username: this.data.username })
      .then(attemptedUser => {
        if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
          resolve("Congrats!!!")
        } else {
          reject("Invalid username or password")
        }
      })
      .catch(function() {
        reject("Please try again later")
      })
  })
}

User.findByUsername = function(username) {
  return new Promise(function(resolve, reject) {
    if (typeof username != "string") {
      reject()
      return
    }
    usersCollection
      .findOne({ username: username })
      .then(function(userDoc) {
        if (userDoc) {
          userDoc = new User(userDoc, true)
          userDoc = {
            _id: userDoc.data._id,
            username: userDoc.data.username
          }
          resolve(userDoc)
        } else {
          reject()
        }
      })
      .catch(function() {
        reject()
      })
  })
}

module.exports = User
