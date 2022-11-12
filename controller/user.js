const userCol = require("../dataModel/userCol");
const database = require("../utils/database");
const jwt = require("../utils/token");
const bcrypt = require("bcrypt");
const moment = require("moment");
const ObjectID = require("mongodb").ObjectId;
const saltRounds = 10;

async function login(req, res) {
  try {
    const user = await database.userModel().findOne({ email: req.body.email });
    if (!user) {
      return res.json({ errorCode: true, data: "Wrong email or password" });
    }
    const checkPass = await bcrypt.compare(req.body.password, user.password);
    if (!checkPass) {
      return res.json({ errorCode: true, data: "Wrong email or password" });
    }
    user.token = await jwt.createSecretKey(req.body.email);
    delete user.password;
    return res.json({ errorCode: null, data: user });
  } catch (error) {
    console.log(error);
    return res.json({ errorCode: true, data: error });
  }
}
async function register(req, res) {
  try {
    const validation = req.body;
    for (property of userCol.validation) {
      if (validation[property] === null || validation[property] === "") {
        return res.json({ errorCode: true, data: `Lack of ${property}` });
      }
    }
    const user = await database.userModel().findOne({ email: req.body.email });
    if (user) {
      return res.json({ errorCode: true, data: "Existing email" });
    }
    if (req.body.rePassword) {
      const checkPass = req.body.password == req.body.rePassword;
      if (!checkPass) {
        return res.json({ errorCode: true, data: "Wrong retype password" });
      }
    }
    const password = await bcrypt.hash(req.body.password, saltRounds);
    const data = {
      id: ObjectID().toString(),
      email: req.body.email,
      password: password,
      createdAt: new Date(),
    };
    delete data.password;
    await userCol.create(data);
    return res.json({ errorCode: null, data: data });
  } catch (error) {
    return res.json({ errorCode: true, data: "System error" });
  }
}

async function profile(req, res) {
  try {
    const user = await database.userModel().findOne({ email: req.body.email });
    if (!user) {
      return res.json({ errorCode: true, data: "Wrong email or password" });
    }
    delete user.password;
    return res.json({ errorCode: null, data: user });
  } catch (error) {
    return res.json({ errorCode: true, data: error });
  }
}

async function userAuthentication(req, res, next) {
  try {
    let token = req.headers["authorization"];
    if (!token) {
      return res.json({
        errorCode: true,
        data: "No token provided",
      });
    }

    let verify = false;
    try {
      verify = await jwt.verifyToken(token);
    } catch (e) {
      res.status(401);
      return res.json({
        errorCode: true,
        data: "Invalid token",
      });
    }
    if (!verify) {
      return res.json({
        errorCode: true,
        data: "Failed to authenticate token",
      });
    }

    let user = [];
    user = await database.userModel().find({ email: verify }).toArray();

    if (user.length == 0 || user.length > 1) {
      return res.json({
        errorCode: true,
        data: "No user found",
      });
    }

    req.user = (({ id, email, name }) => ({
      id,
      email,
    }))(user[0]);

    return next();
  } catch (error) {
    return res.json({ errorCode: true, data: "system error" });
  }
}

module.exports = {
  login,
  register,
  profile,
  userAuthentication,
};
