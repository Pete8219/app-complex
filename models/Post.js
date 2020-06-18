const postsCollection = require("../db")
  .db()
  .collection("posts")
const ObjectID = require("mongodb").ObjectID

let Post = function(data, userid) {
  ;(this.data = data), (this.errors = []), (this.userid = userid)
}

Post.prototype.cleanUp = function() {
  if (typeof this.data.title != "string") {
    this.data.title = ""
  }
  if (typeof this.data.body != "string") {
    this.data.body = ""
  }

  // если данные корректны то сделаем следующее
  this.data = {
    title: this.data.title,
    body: this.data.title,
    createData: new Date(),
    author: ObjectID(this.userid)
  }
}

Post.prototype.validate = function() {
  if (this.data.title == "") {
    this.errors.push("Вы не заполнили заголовок поста")
  }
  if (this.data.body == "") {
    this.errors.push("Вы не ввели основной текст")
  }
}

Post.prototype.create = function() {
  return new Promise((resolve, reject) => {
    this.cleanUp()
    this.validate()

    if (!this.errors.length) {
      // save post into database
      postsCollection
        .insertOne(this.data)
        .then(() => {
          resolve()
        })
        .catch(() => {
          this.errors.push("Please try again later")
          reject(this.errors)
        })
    } else {
      reject(this.errors)
    }
  })
}

Post.findSingleById = function(id) {
  return new Promise(async function(resolve, reject) {
    if (typeof id != "string" || !ObjectID.isValid(id)) {
      reject()
      return
    }
    let posts = await postsCollection
      .aggregate([
        { $match: { _id: new ObjectID(id) } },
        { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "authorDocument" } },
        {
          $project: {
            title: 1,
            body: 1,
            createData: 1,
            author: { $arrayElemAt: ["$authorDocument", 0] }
          }
        }
      ])
      .toArray()
    //вытаскиеваем нужные поля из объекта author
    posts = posts.map(function(post) {
      post.author = {
        username: post.author.username
      }
      return post
    })

    if (posts.length) {
      console.log(posts[0])
      resolve(posts[0])
    } else {
      reject()
    }
  })
}

Post.findByAuthorId(function(authorId) {})

module.exports = Post
